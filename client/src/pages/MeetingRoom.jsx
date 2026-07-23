import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, 
  PhoneOff, Radio, Play, Pause, Square, AlertCircle, Copy, Check,
  Pin, PinOff, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRecorder } from '../hooks/useRecorder';
import ChatDrawer from '../components/ChatDrawer';

export default function MeetingRoom() {
  const { link: rawRoomId } = useParams();
  const roomId = rawRoomId?.toLowerCase();
  const navigate = useNavigate();
  const { mongoUser } = useAuth();
  
  const [meetingTitle, setMeetingTitle] = useState('Gatherly Meeting');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [meetingError, setMeetingError] = useState('');
  const [pinnedUser, setPinnedUser] = useState(null);
  const [meetingHostId, setMeetingHostId] = useState('');
  const [joinAlert, setJoinAlert] = useState('');
  const [isLocalNetworkUnstable, setIsLocalNetworkUnstable] = useState(!navigator.onLine);

  // Hook up WebRTC Signaling
  const {
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
  } = useWebRTC(
    roomId, 
    mongoUser?.uid || mongoUser?._id, 
    mongoUser?.displayName, 
    (peerName) => {
      setJoinAlert(`${peerName} joined the meeting`);
      setTimeout(() => setJoinAlert(''), 3000);
    },
    (errMsg) => {
      setMeetingError(errMsg);
    },
    mongoUser?.photoURL
  );

  // Track responsive screen sizing for mobile specific viewports
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hook up Canvas + Web Audio API recorder
  const {
    isRecording,
    isPaused,
    recordingDuration,
    isConverting,
    conversionProgress,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording
  } = useRecorder(localStream, remoteStreams, roomId, mongoUser?.uid || mongoUser?._id, pinnedUser);

  // Helper to extract first letters of the name
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Reset pinned user if they disconnect
  useEffect(() => {
    if (pinnedUser && pinnedUser !== 'local' && !remoteStreams[pinnedUser]) {
      setPinnedUser(null);
    }
  }, [remoteStreams, pinnedUser]);

  const renderVideoCard = (id, stream, displayName, isMuted, isCameraOff, isScreenSharing, isLocal, isSmall = false, photoURL = null, extraClass = '') => {
    const isSpeaking = speakingUsers[id];
    const isPinned = pinnedUser === id;
    const isParticipantAdmin = (id === 'local'
      ? (mongoUser?.uid === meetingHostId || mongoUser?._id === meetingHostId)
      : (remoteStreams[id]?.userId === meetingHostId));
    const isCurrentUserAdmin = (mongoUser?.uid === meetingHostId || mongoUser?._id === meetingHostId);
    const isUnstable = id === 'local' ? isLocalNetworkUnstable : (remoteStreams[id]?.connectionStatus === 'unstable');
    
    // Append (You) for the local user view
    const labelName = isLocal 
      ? (displayName.includes('(You)') ? displayName : `${displayName} (You)`) 
      : displayName;
    
    const cardClass = isSmall
      ? (isMobile
          ? 'w-full h-full border-borderCol rounded-2xl border !aspect-auto shadow-lg'
          : 'w-full shrink-0 border-borderCol rounded-2xl border aspect-video shadow-lg')
      : (isMobile && !pinnedUser
          ? (totalParticipants === 1
              ? 'w-full h-full !aspect-auto !rounded-none !border-0 bg-bg-secondary'
              : 'w-full h-full !aspect-auto !rounded-none !border-0')
          : 'w-full h-full rounded-2xl border aspect-video shadow-lg');

    const shouldMirror = isLocal && (id === 'local' ? facingMode === 'user' : true);

    const isRemoteMobile = !isLocal && remoteStreams[id]?.isMobileDevice;
    const isLocalMobileOnRemoteDesktop = isRemoteMobile && !isMobile && !isScreenSharing;

    return (
      <div
        className={`overflow-hidden glass-panel bg-bg-secondary relative flex flex-col justify-between transition-all duration-300 ${cardClass} ${
          !isLocal && isMuted ? 'opacity-90' : 'opacity-100'
        } ${
          isSpeaking && !isMuted ? 'border-greenAccent speaking-indicator ring-4 ring-greenAccent/20' : 'border-borderCol'
        } ${extraClass}`}
      >
        {stream && (!isCameraOff || isScreenSharing) && (
          <video
            key={`${id}-${isCameraOff}`}
            id={`video-feed-${id}`}
            autoPlay
            playsInline
            muted={true} // Always muted to prevent browser autoplay blocks on non-muted elements
            ref={(el) => {
              if (el && stream) {
                if (el.srcObject !== stream) {
                  el.srcObject = stream;
                }
                el.play().catch(() => {});
              }
            }}
            style={{
              transform: `${shouldMirror ? 'scaleX(-1)' : ''} ${isLocalMobileOnRemoteDesktop ? 'scale(1.4)' : ''}`.trim() || undefined
            }}
            className="w-full h-full bg-bg-primary absolute inset-0 object-contain"
          />
        )}

        {/* Video Muted Overlay Placeholder */}
        {isCameraOff && !isScreenSharing && (
          <div className="absolute inset-0 bg-bg-secondary flex flex-col items-center justify-center gap-3">
            {photoURL ? (
              <img 
                src={photoURL} 
                alt={displayName} 
                className={`rounded-full object-cover border-2 shadow-inner ${
                  isLocal ? 'border-blueAccent' : 'border-greenAccent'
                } ${
                  isSmall ? 'w-16 h-16' : 'w-32 h-32'
                }`}
              />
            ) : (
              <div className={`rounded-full flex items-center justify-center text-white font-bold ${isSmall ? 'w-16 h-16 text-lg' : 'w-32 h-32 text-3xl'} ${isLocal ? 'bg-blueAccent' : 'bg-greenAccent'}`}>
                {getInitials(displayName)}
              </div>
            )}
            {!isSmall && <span className="text-[10px] text-textCol-muted uppercase font-semibold tracking-wider">Camera Turned Off</span>}
          </div>
        )}

        {/* User Name Label Overlay (Top) */}
        <div className="relative z-30 p-2.5 bg-black/60 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`${isSmall ? 'text-[10px] max-w-[100px]' : 'text-xs max-w-[150px] md:max-w-[200px]'} text-white font-semibold truncate block`}>
              {labelName} {isScreenSharing && ' (Sharing)'}
            </span>
            {isParticipantAdmin && (
              <span className="py-0.5 px-1.5 rounded bg-blueAccent/25 border border-blueAccent/30 text-blueAccent-light text-[9px] font-bold uppercase tracking-wider shrink-0">
                Admin
              </span>
            )}
            {/* Live Mic Level Equalizer Feed */}
            {!isMuted && (micLevels[id] || 0) > 0 && (
              <div className="flex items-end gap-[2px] h-3.5 shrink-0 px-0.5">
                <div 
                  className="w-[3px] bg-greenAccent rounded-full transition-all duration-75" 
                  style={{ height: `${Math.max(20, Math.min(100, (micLevels[id] || 0) * 1.2))}%` }}
                />
                <div 
                  className="w-[3px] bg-greenAccent rounded-full transition-all duration-75" 
                  style={{ height: `${Math.max(20, Math.min(100, (micLevels[id] || 0) * 1.6))}%` }}
                />
                <div 
                  className="w-[3px] bg-greenAccent rounded-full transition-all duration-75" 
                  style={{ height: `${Math.max(20, Math.min(100, (micLevels[id] || 0) * 0.9))}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Pin Control Button */}
        <button
          type="button"
          onClick={() => {
            wasAutoPinnedRef.current = false;
            setPinnedUser(isPinned ? null : id);
          }}
          className="absolute top-2.5 right-2.5 z-40 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all cursor-pointer opacity-100"
          title={isPinned ? "Unpin user" : "Pin user"}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>

        {/* Admin Controls Overlay */}
        {isCurrentUserAdmin && !isLocal && (
          <div className="absolute top-2.5 right-11 z-40 flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-xl backdrop-blur-md transition-opacity opacity-100">
            <button
              type="button"
              onClick={() => adminMuteUser(id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-red-400 transition-all cursor-pointer"
              title="Mute Participant mic"
            >
              <MicOff className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => adminStopVideo(id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-red-400 transition-all cursor-pointer"
              title="Stop Participant video"
            >
              <VideoOff className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove ${displayName} from the meeting?`)) {
                  adminKickUser(id);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/80 hover:text-red-400 transition-all cursor-pointer"
              title="Remove Participant"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Status Badges (Bottom) */}
        <div className="z-10 p-2.5 self-end flex gap-2">
          {isMuted && (
            <span className={`${isSmall ? 'w-5 h-5' : 'w-6 h-6'} rounded bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400`}>
              <MicOff className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            </span>
          )}
        </div>

        {/* Unstable Connection Overlay Indicator */}
        {isUnstable && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-3 text-center p-4 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
              <AlertCircle className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-xs text-yellow-400 font-bold tracking-wide uppercase">Unstable Connection</span>
            <span className="text-[10px] text-textCol-muted max-w-[200px] leading-relaxed">
              Participant is facing poor internet speed or connectivity issues.
            </span>
          </div>
        )}
      </div>
    );
  };

  // Fetch meeting metadata first
  useEffect(() => {
    const isAuthenticJoin = sessionStorage.getItem('joining-room-' + roomId) === 'true';
    const hasLeftBefore = sessionStorage.getItem('left-meeting-' + roomId) === 'true';

    // Clear the joining flag immediately
    sessionStorage.removeItem('joining-room-' + roomId);

    if (hasLeftBefore && !isAuthenticJoin) {
      alert("You have left this meeting. Please enter the code or link from the dashboard to join again.");
      navigate('/dashboard', { replace: true });
      return;
    }

    if (isAuthenticJoin) {
      sessionStorage.removeItem('left-meeting-' + roomId);
    }

    let timeoutId;
    const checkMeeting = async () => {
      try {
        const response = await axios.get(`/api/meetings/link/${roomId}`);
        setMeetingTitle(response.data.title);
        setMeetingHostId(response.data.hostId);
        
        // Auto-end instant meetings after 1.5 hours (90 minutes)
        const isInstant = response.data.title?.startsWith('Instant Meeting');
        if (isInstant) {
          const limitMs = 90 * 60 * 1000; // 90 minutes
          const elapsedMs = Date.now() - new Date(response.data.scheduledAt).getTime();
          const remainingMs = limitMs - elapsedMs;
          
          if (remainingMs <= 0) {
            setMeetingError('This instant meeting has reached the 1.5-hour limit and ended.');
          } else {
            timeoutId = setTimeout(() => {
              setMeetingError('This instant meeting has reached the 1.5-hour limit and ended.');
            }, remainingMs);
          }
        }
      } catch (err) {
        console.error('Failed to join meeting:', err);
        setMeetingError(err.response?.data?.message || 'Meeting code is invalid or could not be found.');
      }
    };
    checkMeeting();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [roomId]);

  // Handle kicked notification
  useEffect(() => {
    if (isKicked) {
      setMeetingError('You have been removed from the meeting by the administrator.');
    }
  }, [isKicked]);

  // Handle local internet speed / network connectivity status
  useEffect(() => {
    const handleOnline = () => setIsLocalNetworkUnstable(false);
    const handleOffline = () => setIsLocalNetworkUnstable(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global listener to unlock HTML5 audio autoplay blocks on mobile browsers
  useEffect(() => {
    const resumeAutoplay = () => {
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio) => {
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      });
    };
    window.addEventListener('click', resumeAutoplay);
    window.addEventListener('touchstart', resumeAutoplay);
    return () => {
      window.removeEventListener('click', resumeAutoplay);
      window.removeEventListener('touchstart', resumeAutoplay);
    };
  }, [remoteStreams]);

  // Auto-pin screen sharing
  const wasAutoPinnedRef = useRef(null); // Stores the socketId/key of the auto-pinned user
  useEffect(() => {
    // 1. Identify who is currently screen sharing (local has priority)
    let sharingId = null;
    if (isScreenSharing) {
      sharingId = 'local';
    } else {
      sharingId = Object.keys(remoteStreams).find(
        (socketId) => remoteStreams[socketId]?.isScreenSharing
      ) || null;
    }

    if (sharingId) {
      // If someone is sharing, and they are not currently pinned:
      // We only auto-pin them if the user hasn't manually pinned someone else in the meantime
      if (pinnedUser !== sharingId && !wasAutoPinnedRef.current) {
        setPinnedUser(sharingId);
        wasAutoPinnedRef.current = sharingId;
      }
    } else {
      // No one is screen sharing anymore.
      // If the currently pinned user is the one we auto-pinned, unpin them now.
      if (wasAutoPinnedRef.current && pinnedUser === wasAutoPinnedRef.current) {
        setPinnedUser(null);
      }
      wasAutoPinnedRef.current = null;
    }
  }, [remoteStreams, isScreenSharing, pinnedUser]);



  // Helper to check if a user ID matches the current user (handles both uid and MongoDB _id)
  const isCurrentUser = (id) => {
    if (!id || !mongoUser) return false;
    const targetId = id.toString();
    const myUid = mongoUser.uid ? mongoUser.uid.toString() : '';
    const myId = mongoUser._id ? mongoUser._id.toString() : '';
    return targetId === myUid || targetId === myId;
  };

  // Unread chat counter logic
  const prevMessagesLength = useRef(0);
  useEffect(() => {
    console.log('💬 Unread counter check running:', {
      isChatOpen,
      chatMessagesLength: chatMessages.length,
      prevMessagesLength: prevMessagesLength.current,
      unreadChatCount
    });

    if (isChatOpen) {
      setUnreadChatCount(0);
    } else if (chatMessages.length > prevMessagesLength.current) {
      const latestMsg = chatMessages[chatMessages.length - 1];
      
      // Only increment unread count if the message is from another participant
      if (latestMsg && !isCurrentUser(latestMsg.senderId)) {
        const diff = chatMessages.length - prevMessagesLength.current;
        console.log(`🔴 Incrementing unread count by ${diff} for incoming message`);
        setUnreadChatCount(prev => prev + diff);
      }
    }
    prevMessagesLength.current = chatMessages.length;
  }, [chatMessages, isChatOpen, mongoUser]);

  // Handle incoming chat notifications (private and broadcast)
  const [messageAlert, setMessageAlert] = useState(null);
  const prevMessagesRef = useRef([]);
  useEffect(() => {
    if (chatMessages.length > prevMessagesRef.current.length) {
      const latestMsg = chatMessages[chatMessages.length - 1];
      
      // If the message is not sent by us and the chat drawer is closed, trigger toast
      if (latestMsg && !isCurrentUser(latestMsg.senderId) && !isChatOpen) {
        const isPrivate = isCurrentUser(latestMsg.recipientId);
        const isBroadcast = !latestMsg.recipientId;
        
        if (isPrivate || isBroadcast) {
          setMessageAlert({
            type: isPrivate ? 'private' : 'broadcast',
            sender: latestMsg.sender?.displayName || 'Participant',
            text: latestMsg.message,
          });
          const timeoutId = setTimeout(() => setMessageAlert(null), 4000);
          return () => clearTimeout(timeoutId);
        }
      }
    }
    prevMessagesRef.current = chatMessages;
  }, [chatMessages, mongoUser, isChatOpen]);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/meet/${roomId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId?.toLowerCase() || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleLeave = () => {
    if (isRecording) {
      const stop = window.confirm('A recording is currently in progress. Do you want to stop and save it before leaving?');
      if (stop) {
        stopRecording();
      }
    }
    sessionStorage.setItem('left-meeting-' + roomId, 'true');
    navigate('/dashboard', { replace: true });
  };

  // Prevent leaving the meeting via browser back/forward buttons or tab close
  const handleLeaveRef = useRef(handleLeave);
  useEffect(() => {
    handleLeaveRef.current = handleLeave;
  }, [handleLeave]);

  useEffect(() => {
    // 1. Intercept browser back/forward button clicks
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      const confirmLeave = window.confirm(
        "Do you want to exit the meeting? Please click the 'Leave Call' button to exit cleanly."
      );
      
      if (confirmLeave) {
        handleLeaveRef.current();
      } else {
        // Push state again to block next back navigation
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 2. Intercept tab close / window reloads
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave the meeting?";
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalParticipants = 1 + Object.keys(remoteStreams).length;
  const mainGridRemotes = Object.keys(remoteStreams).slice(0, 4);
  const sidebarRemotes = Object.keys(remoteStreams).slice(4);

  const getGridClass = (overrideCount = null) => {
    const total = overrideCount !== null ? overrideCount : (1 + Object.keys(remoteStreams).length);
    if (isMobile) {
      if (total === 1) return 'w-full h-[calc(100%-80px)] !p-4 !gap-0 grid-cols-1 grid-rows-1';
      if (total === 2) return 'w-full h-full !p-0 !gap-0 grid-cols-1 grid-rows-2';
      if (total <= 4) return 'w-full h-full !p-0 !gap-0 grid-cols-2 grid-rows-2';
      if (total <= 6) return 'w-full h-full !p-0 !gap-0 grid-cols-2 grid-rows-3';
      return 'w-full h-full !p-0 !gap-0 grid-cols-3 grid-rows-3';
    }
    if (total === 1) return 'grid-cols-1 max-w-4xl';
    if (total === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl';
    if (total <= 4) return 'grid-cols-1 md:grid-cols-2 max-w-6xl';
    if (total <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl';
    return 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 max-w-7xl';
  };

  if (meetingError) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6 text-textCol-primary">
        <div className="glass-panel p-8 text-center max-w-md space-y-6 bg-surface-card">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h3 className="text-xl font-bold text-textCol-primary">Cannot Join Call</h3>
          <p className="text-sm text-textCol-secondary leading-relaxed">{meetingError}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] w-screen bg-bg-primary overflow-hidden relative flex flex-col justify-between pt-4 px-4 pb-2.5 text-textCol-primary selection:bg-greenAccent/20">
      
      {/* Participant Join Toast Notification */}
      <AnimatePresence>
        {joinAlert && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-6 right-6 z-50 py-3 px-5 rounded-glass bg-bg-secondary border border-greenAccent/30 text-white text-xs font-semibold shadow-2xl flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-greenAccent animate-pulse" />
            <span>{joinAlert}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Message Notification Toast (Private or Broadcast) */}
      <AnimatePresence>
        {messageAlert && (
          <motion.div
            initial={{ opacity: 0, x: 50, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`fixed top-24 right-6 z-50 py-3.5 px-5 rounded-2xl glass-panel bg-bg-secondary/95 border text-white text-xs font-semibold shadow-2xl flex flex-col gap-1 max-w-[280px] backdrop-blur-xl ${
              messageAlert.type === 'private' ? 'border-purple-500/30' : 'border-blueAccent/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                messageAlert.type === 'private' ? 'bg-purple-500' : 'bg-blueAccent'
              }`} />
              <span className={`font-bold text-[9px] uppercase tracking-wider ${
                messageAlert.type === 'private' ? 'text-purple-400' : 'text-blueAccent-light'
              }`}>
                {messageAlert.type === 'private' ? 'Private Message' : 'Broadcast Message'}
              </span>
            </div>
            <span className="font-bold text-textCol-primary">{messageAlert.sender}</span>
            <span className="text-textCol-secondary line-clamp-2 italic">"{messageAlert.text}"</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Top Header Row */}
      <header className="z-10 flex items-center justify-between px-3 py-2 md:px-4 md:py-3 glass-panel !bg-surface-glass !rounded-xl">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
          <h2 className="font-bold text-textCol-primary text-sm md:text-md line-clamp-1">{meetingTitle}</h2>
          <span className="w-1.5 h-1.5 rounded-full bg-borderCol hidden sm:inline-block"></span>
          
          <div className="flex items-center gap-3">
            {/* Meeting Code Copy Section */}
            <div className="flex items-center gap-1.5 bg-black/35 border border-white/10 px-2.5 py-1 rounded-lg text-xs">
              <span className="text-textCol-muted font-mono lowercase select-all">{roomId?.toLowerCase()}</span>
              <button 
                onClick={handleCopyCode} 
                className="p-1 rounded hover:bg-white/10 text-textCol-secondary hover:text-textCol-primary transition-colors cursor-pointer"
                title="Copy Meeting Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-greenAccent" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Recording status banner */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/10 border border-red-500/20 text-xs text-red-400 font-semibold font-mono shadow-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>REC</span>
            <span>•</span>
            <span>{formatTime(recordingDuration)}</span>
            {isPaused && <span className="text-[10px] text-textCol-muted uppercase font-bold">(Paused)</span>}
          </div>
        )}
      </header>

      {/* Dynamic Video Feeds Layout */}
      <div className={`flex-1 flex min-h-0 w-full justify-center items-center overflow-hidden relative ${
        isMobile && !pinnedUser ? 'p-0' : 'p-6'
      }`}>
        {!pinnedUser ? (
          totalParticipants <= 4 ? (
            /* Standard Grid Layout for <= 4 participants */
            <div className={`grid w-full h-full ${
              isMobile ? 'justify-stretch items-stretch' : 'gap-5 justify-center content-center'
            } ${getGridClass()}`}>
              {/* 1. Local Video Card */}
              {renderVideoCard(
                'local',
                localStream,
                mongoUser?.displayName || 'You',
                isMuted,
                isCameraOff,
                isScreenSharing,
                true,
                false,
                mongoUser?.photoURL,
                ''
              )}

              {/* 2. Remote Video Cards */}
              {Object.keys(remoteStreams).map((socketId, index) => {
                const peer = remoteStreams[socketId];
                const isThirdItem = index === 1; // 2nd remote is the 3rd participant
                const isThirdItemOfThree = totalParticipants === 3 && isThirdItem;
                const extraGridClass = isThirdItemOfThree
                  ? 'col-span-2 justify-self-center w-full max-w-[50%] md:max-w-[calc(50%-0.625rem)]'
                  : '';
                return renderVideoCard(
                  socketId,
                  peer.stream,
                  peer.displayName || 'Participant',
                  peer.isMuted,
                  peer.isCameraOff || !peer.stream,
                  peer.isScreenSharing,
                  false,
                  false,
                  peer.photoURL,
                  extraGridClass
                );
              })}
            </div>
          ) : (
            /* Split layout for > 4 participants (5 to 10) */
            <div className={`flex w-full h-full gap-5 overflow-hidden ${
              isMobile ? 'flex-col justify-end' : 'flex-row justify-center items-center'
            }`}>
              {/* Main Grid: holds the first 4 remote participants */}
              <div className="flex-1 min-w-0 min-h-0 w-full">
                <div className={`grid w-full h-full ${
                  isMobile ? 'justify-stretch items-stretch' : 'gap-5 justify-center content-center'
                } ${getGridClass(mainGridRemotes.length)}`}>
                  {mainGridRemotes.map((socketId) => {
                    const peer = remoteStreams[socketId];
                    return renderVideoCard(
                      socketId,
                      peer.stream,
                      peer.displayName || 'Participant',
                      peer.isMuted,
                      peer.isCameraOff || !peer.stream,
                      peer.isScreenSharing,
                      false,
                      false,
                      peer.photoURL
                    );
                  })}
                </div>
              </div>

              {/* Sidebar/Mini-feed: holds the local user (at the top/left) and remaining remote participants */}
              {isMobile ? (
                /* Horizontal Scroll panel for Mobile Smartphones */
                <div className="w-full h-28 shrink-0 flex flex-col gap-1 overflow-hidden bg-bg-secondary/40 border border-white/10 p-2 rounded-2xl backdrop-blur-md">
                  <span className="text-[8px] text-textCol-muted font-bold uppercase tracking-wider px-1">
                    Participants ({totalParticipants})
                  </span>
                  <div className="flex-1 flex flex-row gap-3 overflow-x-auto pb-1 items-center min-w-0">
                    {/* Local User Card */}
                    <div className="w-32 shrink-0 h-full">
                      {renderVideoCard(
                        'local',
                        localStream,
                        mongoUser?.displayName || 'You',
                        isMuted,
                        isCameraOff,
                        isScreenSharing,
                        true,
                        true, // isSmall
                        mongoUser?.photoURL
                      )}
                    </div>

                    {/* Excess Remote Participant Cards */}
                    {sidebarRemotes.map((socketId) => {
                      const peer = remoteStreams[socketId];
                      return (
                        <div key={socketId} className="w-32 shrink-0 h-full">
                          {renderVideoCard(
                            socketId,
                            peer.stream,
                            peer.displayName || 'Participant',
                            peer.isMuted,
                            peer.isCameraOff || !peer.stream,
                            peer.isScreenSharing,
                            false,
                            true, // isSmall
                            peer.photoURL
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Vertical Scroll panel for Desktop Laptops */
                <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1 py-2 h-full">
                  <span className="text-[10px] text-textCol-muted font-bold uppercase tracking-wider px-1 block">
                    Participants ({totalParticipants})
                  </span>
                  
                  {/* Local User Card at the Top */}
                  {renderVideoCard(
                    'local',
                    localStream,
                    mongoUser?.displayName || 'You',
                    isMuted,
                    isCameraOff,
                    isScreenSharing,
                    true,
                    true, // isSmall
                    mongoUser?.photoURL
                  )}

                  {/* Excess Remote Participant Cards below */}
                  {sidebarRemotes.map((socketId) => {
                    const peer = remoteStreams[socketId];
                    return renderVideoCard(
                      socketId,
                      peer.stream,
                      peer.displayName || 'Participant',
                      peer.isMuted,
                      peer.isCameraOff || !peer.stream,
                      peer.isScreenSharing,
                      false,
                      true, // isSmall
                      peer.photoURL
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : (
          /* Pinned Speaker / Speaker Zoom Layout */
          <div className={`flex w-full h-full gap-5 overflow-hidden ${
            isMobile ? 'flex-col justify-end' : 'flex-row'
          }`}>
            {/* Main Stage (Zoomed Pinned User) */}
            <div className="flex-1 min-h-0 min-w-0">
              {pinnedUser === 'local'
                ? renderVideoCard(
                    'local',
                    localStream,
                    mongoUser?.displayName || 'You',
                    isMuted,
                    isCameraOff,
                    isScreenSharing,
                    true,
                    false,
                    mongoUser?.photoURL,
                    ''
                  )
                : (() => {
                    const peer = remoteStreams[pinnedUser];
                    return peer
                      ? renderVideoCard(
                          pinnedUser,
                          peer.stream,
                          peer.displayName || 'Participant',
                          peer.isMuted,
                          peer.isCameraOff || !peer.stream,
                          peer.isScreenSharing,
                          false,
                          false,
                          peer.photoURL,
                          ''
                        )
                      : null;
                  })()}
            </div>

            {/* Sidebar Thumbnails List (Scrollable column for other participants) */}
            {isMobile ? (
              /* Horizontal Scroll panel for Mobile Devices in Pinned View */
              <div className="w-full h-28 shrink-0 overflow-x-auto py-2 mb-20 z-10">
                <div className="flex gap-3 h-24 w-max px-2">
                  {/* Show Local in sidebar if not pinned */}
                  {pinnedUser !== 'local' && (
                    <div className="w-32 shrink-0 h-full">
                      {renderVideoCard(
                        'local',
                        localStream,
                        mongoUser?.displayName || 'You',
                        isMuted,
                        isCameraOff,
                        isScreenSharing,
                        true,
                        true,
                        mongoUser?.photoURL
                      )}
                    </div>
                  )}

                  {/* Show Remotes in sidebar if not pinned */}
                  {Object.keys(remoteStreams)
                    .filter((socketId) => socketId !== pinnedUser)
                    .map((socketId) => {
                      const peer = remoteStreams[socketId];
                      return (
                        <div key={socketId} className="w-32 shrink-0 h-full">
                          {renderVideoCard(
                            socketId,
                            peer.stream,
                            peer.displayName || 'Participant',
                            peer.isMuted,
                            peer.isCameraOff || !peer.stream,
                            peer.isScreenSharing,
                            false,
                            true,
                            peer.photoURL
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              /* Vertical Scroll panel for Desktop/Laptops in Pinned View */
              <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Show Local in sidebar if not pinned */}
                {pinnedUser !== 'local' &&
                  renderVideoCard(
                    'local',
                    localStream,
                    mongoUser?.displayName || 'You',
                    isMuted,
                    isCameraOff,
                    isScreenSharing,
                    true,
                    true,
                    mongoUser?.photoURL
                  )}

                {/* Show Remotes in sidebar if not pinned */}
                {Object.keys(remoteStreams)
                  .filter((socketId) => socketId !== pinnedUser)
                  .map((socketId) => {
                    const peer = remoteStreams[socketId];
                    return renderVideoCard(
                      socketId,
                      peer.stream,
                      peer.displayName || 'Participant',
                      peer.isMuted,
                      peer.isCameraOff || !peer.stream,
                      peer.isScreenSharing,
                      false,
                      true,
                      peer.photoURL
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Floating Control Bar Overlayed */}
        <footer className={`absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-300 ${
          isMobile && isChatOpen ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'
        }`}>
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {/* Mic Toggle Button */}
            <button
              onClick={toggleMute}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer ${
                isMuted 
                  ? 'bg-red-500/25 border-red-500/30 text-red-400 hover:bg-red-500/35' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-4.5 h-4.5 md:w-5 md:h-5" /> : <Mic className="w-4.5 h-4.5 md:w-5 md:h-5" />}
            </button>

            {/* Camera Toggle Button */}
            <button
              onClick={toggleCamera}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer ${
                isCameraOff 
                  ? 'bg-red-500/25 border-red-500/30 text-red-400 hover:bg-red-500/35' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
            >
              {isCameraOff ? <VideoOff className="w-4.5 h-4.5 md:w-5 md:h-5" /> : <Video className="w-4.5 h-4.5 md:w-5 md:h-5" />}
            </button>

            {/* Mobile Camera Switch (Front/Back) Button */}
            {isMobile && !isCameraOff && (
              <button
                onClick={switchCamera}
                className="w-10 h-10 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Screen Share Button */}
            <button
              onClick={toggleScreenShare}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer ${
                isScreenSharing 
                  ? 'bg-green-500/25 border-green-500/35 text-green-400 hover:bg-green-500/35' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
            >
              <Monitor className="w-4.5 h-4.5 md:w-5 md:h-5" />
            </button>

            {/* Separator Line */}
            <span className="w-[1px] h-6 md:h-8 bg-white/25 self-center"></span>

            {/* Recording Button / Controls */}
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl hover:bg-red-500/25 hover:border-red-500/30 text-white hover:text-red-400 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                title="Record Meeting"
              >
                <Radio className="w-4.5 h-4.5 md:w-5 md:h-5" />
              </button>
            ) : (
              <div className="flex gap-1 md:gap-2 bg-black/45 backdrop-blur-xl p-1 rounded-full border border-white/15 shadow-lg items-center justify-center">
                {isPaused ? (
                  <button
                    onClick={resumeRecording}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 hover:bg-white/25 text-greenAccent flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                    title="Resume Recording"
                  >
                    <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-greenAccent" />
                  </button>
                ) : (
                  <button
                    onClick={pauseRecording}
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/15 hover:bg-white/25 text-yellow-400 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                    title="Pause Recording"
                  >
                    <Pause className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                )}

                <button
                  onClick={stopRecording}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-600/35 hover:bg-red-600/50 border border-red-500/35 text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                  title="Stop & Save Recording"
                >
                  <Square className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white text-white" />
                </button>
              </div>
            )}

            {/* Chat Drawer Toggle Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-full border backdrop-blur-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer relative ${
                isChatOpen 
                  ? 'bg-blue-500/25 border-blue-500/30 text-blue-400' 
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
              }`}
              title="Chat Drawer"
            >
              <MessageSquare className="w-4.5 h-4.5 md:w-5 md:h-5" />
              <AnimatePresence>
                {unreadChatCount > 0 && (
                  <motion.span
                    key="chat-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-1.5 z-30 min-w-[18px] h-4.5 bg-red-500 border border-bg-primary text-white rounded-full flex items-center justify-center text-[8px] font-bold px-1 shadow-md pointer-events-none animate-bounce"
                  >
                    {unreadChatCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {/* Leave Call Button */}
            <button
              onClick={handleLeave}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600/25 border border-red-500/40 backdrop-blur-xl hover:bg-red-600/45 text-red-200 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
              title="Leave Call"
            >
              <PhoneOff className="w-4.5 h-4.5 md:w-5 md:h-5" />
            </button>
          </div>
        </footer>
      </div>

      {/* Right sliding Chat Panel Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        roomId={roomId}
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        userId={mongoUser?.uid || mongoUser?._id}
        remoteStreams={remoteStreams}
      />

      {/* WebM to MP4 Conversion loading overlay */}
      <AnimatePresence>
        {isConverting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <div className="w-full max-w-sm glass-panel bg-bg-secondary p-8 border border-white/10 text-center space-y-6 shadow-2xl">
              <div className="w-14 h-14 border-4 border-blueAccent border-t-transparent rounded-full animate-spin mx-auto"></div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-textCol-primary">Saving Recording</h3>
                <p className="text-xs text-textCol-secondary">
                  Converting WebM media capture to high-compatibility MP4 format directly in your browser using FFmpeg WebAssembly.
                </p>
              </div>

              {/* Progress bar (Solid blue progress line - no gradients) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono font-semibold text-blueAccent px-1">
                  <span>Converting...</span>
                  <span>{conversionProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-bg-primary overflow-hidden border border-borderCol">
                  <div 
                    className="h-full bg-blueAccent transition-all duration-300"
                    style={{ width: `${conversionProgress}%` }}
                  />
                </div>
              </div>

              <p className="text-[10px] text-textCol-muted leading-relaxed font-medium bg-surface-card p-3 rounded-lg border border-borderCol">
                Please do not close this browser tab. Your file will automatically download to your computer's local Downloads folder once the process completes.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Dedicated audio feeds for remote participants */}
      <div className="hidden">
        {Object.keys(remoteStreams).map((socketId) => {
          const peer = remoteStreams[socketId];
          return peer.stream ? (
            <audio
              key={`audio-feed-${socketId}`}
              autoPlay
              playsInline
              ref={(el) => {
                if (el && peer.stream) {
                  const audioTracks = peer.stream.getAudioTracks();
                  if (audioTracks.length > 0) {
                    const activeTrack = audioTracks[0];
                    const currentStream = el.srcObject;
                    const hasTrack = currentStream && currentStream.getAudioTracks().some(t => t.id === activeTrack.id);
                    
                    if (!hasTrack) {
                      const audioStream = new MediaStream([activeTrack]);
                      el.srcObject = audioStream;
                      el.play().catch(() => {});
                    }
                  }
                }
              }}
            />
          ) : null;
        })}
      </div>
    </div>
  );
}
