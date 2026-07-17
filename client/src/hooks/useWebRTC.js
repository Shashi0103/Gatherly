import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { preferCodecs } from '../utils/sdp.js';
import { deriveRoomKey, encryptPayload, decryptPayload } from '../utils/crypto.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (roomId, userId, displayName, onUserJoined, onError) => {
  const [localStream, setLocalStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState({});
  const [micLevels, setMicLevels] = useState({});
  const [isKicked, setIsKicked] = useState(false);

  const socketRef = useRef(null);
  const pcsRef = useRef({}); // socketId -> RTCPeerConnection
  const dcsRef = useRef({}); // socketId -> RTCDataChannel
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const localAnalysersRef = useRef({ mic: null, interval: null });
  const peerAnalysersRef = useRef({}); // socketId -> { analyser, interval }

  // 1. Initialize Encryption Key and Media Streams
  useEffect(() => {
    if (!roomId || !userId) return;

    let isCancelled = false;

    const initializeCall = async () => {
      try {
        // Derive AES key for WebRTC Data Channel encryption
        const key = await deriveRoomKey(roomId);
        if (isCancelled) return;
        cryptoKeyRef.current = key;
        console.log('Derived AES-256 Data Channel encryption key.');

        // Fetch User Media Streams
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
            facingMode: 'user'
          }
        });
        
        if (isCancelled) {
          // Clean up stream if effect was cancelled during media acquisition
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Disable audio and video tracks immediately by default
        stream.getAudioTracks().forEach((track) => track.enabled = false);
        stream.getVideoTracks().forEach((track) => track.enabled = false);

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Start Local Speech Detection
        setupLocalSpeechDetection(stream);

        // Connect to Signaling Server
        const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        socketRef.current = io(serverUrl, {
          transports: ['websocket'],
          withCredentials: true
        });

        socketRef.current.emit('join-room', { roomId, userId });

        // Bind Signaling Socket Events
        bindSocketEvents();
      } catch (err) {
        console.error('Failed to initialize WebRTC Call:', err);
      }
    };

    initializeCall();

    return () => {
      isCancelled = true;
      cleanupCall();
    };
  }, [roomId, userId]);

  // Bind Signaling events
  const bindSocketEvents = () => {
    const socket = socketRef.current;

    // Listen for room full event
    socket.on('room-full', ({ message }) => {
      console.warn(`Room is full: ${message}`);
      if (onError) {
        onError(message || 'This meeting room is full (maximum 10 participants).');
      }
    });

    // Listen for join error event (time interval & cancellation checks)
    socket.on('join-error', (data) => {
      console.warn('Join error received:', data);
      if (onError) {
        let displayMsg = 'Unable to join this meeting room.';
        if (typeof data === 'string') {
          displayMsg = data;
        } else if (data && data.message) {
          displayMsg = data.message;
        } else if (data && data.code) {
          switch (data.code) {
            case 'NOT_FOUND':
              displayMsg = 'This meeting room does not exist.';
              break;
            case 'CANCELLED':
              displayMsg = 'This meeting has been cancelled.';
              break;
            case 'NOT_STARTED':
              const startLocal = new Date(data.scheduledAt).toLocaleString([], {
                dateStyle: 'short',
                timeStyle: 'medium'
              });
              displayMsg = `This meeting has not started yet. It is scheduled to start at ${startLocal}.`;
              break;
            case 'ALREADY_ENDED':
              const endLocal = new Date(data.endTime).toLocaleString([], {
                dateStyle: 'short',
                timeStyle: 'medium'
              });
              displayMsg = `This meeting has already ended. It was scheduled to conclude by ${endLocal}.`;
              break;
            default:
              displayMsg = data.message || 'Unable to join this meeting room.';
          }
        }
        onError(displayMsg);
      }
    });

    // A. Received list of all existing users in the room
    socket.on('all-users', async (users) => {
      console.log('Received list of existing peers in room:', users);
      
      // Pre-populate remoteStreams state with the existing peers' details
      setRemoteStreams((prev) => {
        const next = { ...prev };
        for (const peer of users) {
          next[peer.socketId] = {
            stream: null,
            userId: peer.userId,
            displayName: peer.displayName,
            photoURL: peer.photoURL || '',
            isMuted: false,
            isCameraOff: false,
            isScreenSharing: false,
            connectionStatus: 'stable'
          };
        }
        return next;
      });

      for (const peer of users) {
        const pc = createPeerConnection(peer.socketId, peer.displayName);
        pcsRef.current[peer.socketId] = pc;

        // Create Encrypted Data Channel
        const dc = pc.createDataChannel('data-sync');
        setupDataChannel(peer.socketId, dc);

        // Add Local Tracks
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });

        // Create Offer
        try {
          const offer = await pc.createOffer();
          // Munge SDP to prefer VP9 and Opus
          const mungedSDP = preferCodecs(offer.sdp);
          await pc.setLocalDescription({ type: 'offer', sdp: mungedSDP });
          socket.emit('offer', { target: peer.socketId, sdp: pc.localDescription });
        } catch (err) {
          console.error('Error creating offer for peer:', peer.socketId, err);
        }
      }
    });

    // B. Received Join Broadcast from a new peer
    socket.on('user-joined', ({ socketId, userId: peerUserId, displayName: peerName, photoURL: peerPhotoURL }) => {
      console.log(`New peer joined: ${peerName} (${socketId})`);
      if (onUserJoined) {
        onUserJoined(peerName);
      }
      // We wait for them to send us an offer, but we keep remote state mapped
      setRemoteStreams((prev) => ({
        ...prev,
        [socketId]: {
          stream: null,
          userId: peerUserId,
          displayName: peerName,
          photoURL: peerPhotoURL || '',
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
          connectionStatus: 'stable'
        }
      }));
    });

    // C. Received SDP Offer from a peer
    socket.on('offer', async ({ sender, sdp }) => {
      console.log(`Received SDP Offer from peer ${sender}`);
      const pc = createPeerConnection(sender);
      pcsRef.current[sender] = pc;

      // Listen for data channel creation
      pc.ondatachannel = (e) => {
        setupDataChannel(sender, e.channel);
      };

      // Add local tracks
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      // Handle offer
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        const mungedSDP = preferCodecs(answer.sdp);
        await pc.setLocalDescription({ type: 'answer', sdp: mungedSDP });
        socket.emit('answer', { target: sender, sdp: pc.localDescription });
      } catch (err) {
        console.error('Error handling offer from peer:', sender, err);
      }
    });

    // D. Received SDP Answer from a peer
    socket.on('answer', async ({ sender, sdp }) => {
      console.log(`Received SDP Answer from peer ${sender}`);
      const pc = pcsRef.current[sender];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error('Error setting remote description from answer:', sender, err);
        }
      }
    });

    // E. Received ICE Candidate from a peer
    socket.on('ice-candidate', async ({ sender, candidate }) => {
      const pc = pcsRef.current[sender];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          // Ignore transient candidate failures during renegotiations
        }
      }
    });

    // F. Received Chat message from signaling (fallback if data channel is opening)
    socket.on('chat-message', (msgObj) => {
      console.log('Received chat message on client socket:', msgObj);
      setChatMessages((prev) => [...prev, msgObj]);
    });

    // G. A Peer left the room
    socket.on('user-left', ({ socketId }) => {
      console.log(`Peer left room: ${socketId}`);
      closePeer(socketId);
    });

    // H. Peer Screen Share state updates
    socket.on('screen-share-start', ({ socketId }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: { ...prev[socketId], isScreenSharing: true }
        };
      });
    });

    socket.on('screen-share-stop', ({ socketId }) => {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: { ...prev[socketId], isScreenSharing: false }
        };
      });
    });

    // Admin Control Signals
    socket.on('admin-mute', () => {
      console.log('Received admin force-mute command.');
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsMuted(true);

      const currentCameraOff = localStreamRef.current
        ? localStreamRef.current.getVideoTracks().every((track) => !track.enabled)
        : false;

      broadcastEncryptedData({
        type: 'state-sync',
        isMuted: true,
        isCameraOff: currentCameraOff,
      });
    });

    socket.on('admin-stop-video', () => {
      console.log('Received admin force-stop-video command.');
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsCameraOff(true);

      const currentMuted = localStreamRef.current
        ? localStreamRef.current.getAudioTracks().every((track) => !track.enabled)
        : false;

      broadcastEncryptedData({
        type: 'state-sync',
        isMuted: currentMuted,
        isCameraOff: true,
      });
    });

    socket.on('admin-kick', () => {
      console.log('Received admin kick command.');
      setIsKicked(true);
      cleanupCall();
    });
  };

  // Create an RTCPeerConnection for a socket
  const createPeerConnection = (socketId, peerName = 'Participant') => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Relay Ice Candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current.emit('ice-candidate', {
          target: socketId,
          candidate: e.candidate,
        });
      }
    };

    // Received Remote Stream
    pc.ontrack = (e) => {
      console.log(`Received remote track from peer ${socketId}`);
      const remoteStream = e.streams[0];
      
      setRemoteStreams((prev) => {
        const existing = prev[socketId] || {};
        return {
          ...prev,
          [socketId]: {
            ...existing,
            stream: remoteStream,
            displayName: existing.displayName || peerName,
            connectionStatus: existing.connectionStatus || 'stable'
          },
        };
      });

      // Start Remote Speech Detection
      setupRemoteSpeechDetection(socketId, remoteStream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log(`Connection state change for ${socketId}: ${state}`);
      if (state === 'disconnected') {
        setRemoteStreams((prev) => {
          if (!prev[socketId]) return prev;
          return {
            ...prev,
            [socketId]: { ...prev[socketId], connectionStatus: 'unstable' }
          };
        });
      } else if (state === 'connected' || state === 'completed') {
        setRemoteStreams((prev) => {
          if (!prev[socketId]) return prev;
          return {
            ...prev,
            [socketId]: { ...prev[socketId], connectionStatus: 'stable' }
          };
        });
      } else if (state === 'failed') {
        closePeer(socketId);
      }
    };

    return pc;
  };

  // Configure Data Channel events
  const setupDataChannel = (socketId, channel) => {
    dcsRef.current[socketId] = channel;

    channel.onopen = () => {
      console.log(`🔒 Encrypted Data Channel open with peer ${socketId}`);
      // Sync initial state
      sendEncryptedData(socketId, {
        type: 'state-sync',
        isMuted,
        isCameraOff,
      });
    };

    channel.onmessage = async (e) => {
      try {
        // Decrypt using WebCrypto Room Key
        const decryptedStr = await decryptPayload(e.data, cryptoKeyRef.current);
        const payload = JSON.parse(decryptedStr);
        
        handleDataChannelMessage(socketId, payload);
      } catch (err) {
        console.error('Data Channel decryption or parsing error:', err.message);
      }
    };

    channel.onclose = () => {
      console.log(`Encrypted Data Channel closed with peer ${socketId}`);
    };
  };

  // Process decrypted data channel packets
  const handleDataChannelMessage = (socketId, payload) => {
    if (payload.type === 'state-sync') {
      setRemoteStreams((prev) => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            isMuted: payload.isMuted,
            isCameraOff: payload.isCameraOff,
          },
        };
      });
    } else if (payload.type === 'peer-chat') {
      setChatMessages((prev) => [...prev, payload.message]);
    }
  };

  // Send encrypted message to specific peer
  const sendEncryptedData = async (socketId, obj) => {
    const channel = dcsRef.current[socketId];
    if (channel && channel.readyState === 'open') {
      try {
        const text = JSON.stringify(obj);
        const encryptedStr = await encryptPayload(text, cryptoKeyRef.current);
        channel.send(encryptedStr);
      } catch (e) {
        console.error('Failed to encrypt/send over data channel:', e);
      }
    }
  };

  // Broadcast encrypted message to all peers
  const broadcastEncryptedData = async (obj) => {
    const promises = Object.keys(dcsRef.current).map((socketId) =>
      sendEncryptedData(socketId, obj)
    );
    await Promise.all(promises);
  };

  // Send a Chat Message
  const sendChatMessage = (text, recipientId = null) => {
    if (!text.trim()) return;
    
    // Broadcast via Socket.IO so it persists in MongoDB
    socketRef.current.emit('chat-message', {
      roomId,
      senderId: userId,
      message: text,
      recipientId,
    });
  };

  // Speech Detection Helpers
  const setupLocalSpeechDetection = (stream) => {
    if (localStreamAnalysersRefCleanup()) return;

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isSpeaking = average > 25; // speech threshold

        setSpeakingUsers((prev) => {
          if (prev['local'] === isSpeaking) return prev;
          return { ...prev, local: isSpeaking };
        });

        // Compute volume level 0 - 100
        const level = Math.min(100, Math.round((average / 128) * 100));
        setMicLevels((prev) => {
          if (prev['local'] === level) return prev;
          return { ...prev, local: level };
        });
      }, 200);

      localAnalysersRef.current = { mic: analyser, interval };
    } catch (err) {
      console.warn('Speech detection not initialized:', err);
    }
  };

  const localStreamAnalysersRefCleanup = () => {
    if (localAnalysersRef.current.interval) {
      clearInterval(localAnalysersRef.current.interval);
    }
    return false;
  };

  const setupRemoteSpeechDetection = (socketId, remoteStream) => {
    // Cleanup previous if exists
    if (peerAnalysersRef.current[socketId]) {
      clearInterval(peerAnalysersRef.current[socketId].interval);
    }

    try {
      if (remoteStream.getAudioTracks().length === 0) return;

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(new MediaStream([remoteStream.getAudioTracks()[0]]));
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isSpeaking = average > 25;

        setSpeakingUsers((prev) => {
          if (prev[socketId] === isSpeaking) return prev;
          return { ...prev, [socketId]: isSpeaking };
        });

        // Compute volume level 0 - 100
        const level = Math.min(100, Math.round((average / 128) * 100));
        setMicLevels((prev) => {
          if (prev[socketId] === level) return prev;
          return { ...prev, [socketId]: level };
        });
      }, 200);

      peerAnalysersRef.current[socketId] = { analyser, interval };
    } catch (err) {
      // Ignore audio routing error if tracks are empty or blocked
    }
  };

  // Close and clean connection for a peer
  const closePeer = (socketId) => {
    if (pcsRef.current[socketId]) {
      pcsRef.current[socketId].close();
      delete pcsRef.current[socketId];
    }
    if (dcsRef.current[socketId]) {
      dcsRef.current[socketId].close();
      delete dcsRef.current[socketId];
    }
    if (peerAnalysersRef.current[socketId]) {
      clearInterval(peerAnalysersRef.current[socketId].interval);
      delete peerAnalysersRef.current[socketId];
    }

    setRemoteStreams((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });

    setMicLevels((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });

    setSpeakingUsers((prev) => {
      const copy = { ...prev };
      delete copy[socketId];
      return copy;
    });
  };

  // Media Control Actions
  const toggleMute = () => {
    if (localStreamRef.current) {
      const nextMuteState = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuteState;
      });
      setIsMuted(nextMuteState);
      // Sync state with peers
      broadcastEncryptedData({
        type: 'state-sync',
        isMuted: nextMuteState,
        isCameraOff,
      });
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const nextCameraOffState = !isCameraOff;
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextCameraOffState;
      });
      setIsCameraOff(nextCameraOffState);
      // Sync state with peers
      broadcastEncryptedData({
        type: 'state-sync',
        isMuted,
        isCameraOff: nextCameraOffState,
      });
    }
  };

  // Screen Sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen share
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        socketRef.current.emit('screen-share-start', { roomId });

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track in all peer connections
        Object.values(pcsRef.current).forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        });

        // Handle screen share stop by browser control bar
        screenTrack.onended = () => {
          restoreCameraTrack();
        };
      } else {
        // Stop screen share
        restoreCameraTrack();
      }
    } catch (err) {
      console.error('Error starting screen share:', err);
    }
  };

  const restoreCameraTrack = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setIsScreenSharing(false);
    socketRef.current.emit('screen-share-stop', { roomId });

    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(pcsRef.current).forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender && cameraTrack) {
          videoSender.replaceTrack(cameraTrack);
        }
      });
    }
  };

  const cleanupCall = () => {
    // 1. Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // 2. Clean speech intervals
    if (localAnalysersRef.current.interval) {
      clearInterval(localAnalysersRef.current.interval);
    }
    Object.values(peerAnalysersRef.current).forEach((p) => {
      clearInterval(p.interval);
    });

    // 3. Close peer connections
    Object.values(pcsRef.current).forEach((pc) => pc.close());
    
    // 4. Leave socket room
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      socketRef.current.disconnect();
    }
  };

  const switchCamera = async () => {
    if (!localStreamRef.current) return;
    
    try {
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      
      // Stop existing video track(s)
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => track.stop());
      
      // Acquire new video stream with target facingMode
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
          facingMode: newFacingMode
        }
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace video track in localStreamRef
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
      }
      localStreamRef.current.addTrack(newVideoTrack);
      
      // Update localStream state to trigger re-renders
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      
      // Replace video track on all peer connections
      Object.values(pcsRef.current).forEach((pc) => {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack);
        }
      });
      
      setFacingMode(newFacingMode);
      console.log(`📷 Switched camera facing mode to: ${newFacingMode}`);
    } catch (err) {
      console.error('Failed to switch camera:', err);
    }
  };

  const adminMuteUser = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('admin-mute-user', { roomId, targetSocketId });
    }
  };

  const adminStopVideo = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('admin-stop-video', { roomId, targetSocketId });
    }
  };

  const adminKickUser = (targetSocketId) => {
    if (socketRef.current) {
      socketRef.current.emit('admin-kick-user', { roomId, targetSocketId });
    }
  };

  return {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    chatMessages,
    speakingUsers,
    micLevels,
    isKicked,
    adminMuteUser,
    adminStopVideo,
    adminKickUser,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
    facingMode,
    switchCamera,
  };
};
