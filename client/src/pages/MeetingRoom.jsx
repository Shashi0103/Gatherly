import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, 
  PhoneOff, Radio, Play, Pause, Square, AlertCircle, Copy, Check,
  Pin, PinOff
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useRecorder } from '../hooks/useRecorder';
import ChatDrawer from '../components/ChatDrawer';

export default function MeetingRoom() {
  const { link: roomId } = useParams();
  const navigate = useNavigate();
  const { mongoUser } = useAuth();
  
  const [meetingTitle, setMeetingTitle] = useState('Gatherly Meeting');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [meetingError, setMeetingError] = useState('');
  const [pinnedUser, setPinnedUser] = useState(null);

  // Hook up WebRTC Signaling
  const {
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    chatMessages,
    speakingUsers,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    sendChatMessage,
  } = useWebRTC(roomId, mongoUser?.uid || mongoUser?._id, mongoUser?.displayName);

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
  } = useRecorder(localStream, remoteStreams, roomId, mongoUser?.uid || mongoUser?._id);

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

  const renderVideoCard = (id, stream, displayName, isMuted, isCameraOff, isScreenSharing, isLocal, isSmall = false) => {
    const isSpeaking = speakingUsers[id];
    const isPinned = pinnedUser === id;
    
    return (
      <div
        className={`rounded-2xl overflow-hidden glass-panel bg-bg-secondary border relative aspect-video shadow-lg group flex flex-col justify-between transition-all duration-300 ${
          isSmall ? 'w-full shrink-0 border-borderCol' : 'w-full h-full'
        } ${
          !isLocal && isMuted ? 'opacity-90' : 'opacity-100'
        } ${
          isSpeaking && !isMuted ? 'border-greenAccent speaking-indicator ring-4 ring-greenAccent/20' : 'border-borderCol'
        }`}
      >
        {stream && !isCameraOff && (
          <video
            id={`video-feed-${id}`}
            autoPlay
            playsInline
            muted={isLocal}
            ref={(el) => {
              if (el && stream && el.srcObject !== stream) {
                el.srcObject = stream;
              }
            }}
            className={`w-full h-full object-cover rounded-2xl bg-bg-primary absolute inset-0 ${isLocal ? 'transform scale-x-[-1]' : ''}`}
          />
        )}

        {/* Video Muted Overlay Placeholder */}
        {isCameraOff && (
          <div className="absolute inset-0 bg-bg-secondary flex flex-col items-center justify-center gap-3">
            <div className={`rounded-full flex items-center justify-center text-white font-bold ${isSmall ? 'w-10 h-10 text-sm' : 'w-16 h-16 text-xl'} ${isLocal ? 'bg-blueAccent' : 'bg-greenAccent'}`}>
              {getInitials(displayName)}
            </div>
            {!isSmall && <span className="text-[10px] text-textCol-muted uppercase font-semibold tracking-wider">Camera Turned Off</span>}
          </div>
        )}

        {/* User Name Label Overlay (Top) */}
        <div className="z-10 p-2.5 bg-black/40 flex items-start justify-between rounded-t-2xl">
          <span className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-white font-semibold line-clamp-1`}>
            {displayName} {isScreenSharing && ' (Sharing)'}
          </span>
        </div>

        {/* Pin Control Button */}
        <button
          type="button"
          onClick={() => setPinnedUser(isPinned ? null : id)}
          className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all cursor-pointer ${
            isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
          }`}
          title={isPinned ? "Unpin user" : "Pin user"}
        >
          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>

        {/* Status Badges (Bottom) */}
        <div className="z-10 p-2.5 self-end flex gap-2">
          {isMuted && (
            <span className={`${isSmall ? 'w-5 h-5' : 'w-6 h-6'} rounded bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400`}>
              <MicOff className={`${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
            </span>
          )}
        </div>
      </div>
    );
  };

  // Fetch meeting metadata first
  useEffect(() => {
    const checkMeeting = async () => {
      try {
        const response = await axios.get(`/api/meetings/link/${roomId}`);
        setMeetingTitle(response.data.title);
      } catch (err) {
        console.error('Failed to join meeting:', err);
        setMeetingError('Meeting code is invalid or could not be found.');
      }
    };
    checkMeeting();
  }, [roomId]);



  // Unread chat counter logic
  const prevMessagesLength = useRef(0);
  useEffect(() => {
    if (!isChatOpen && chatMessages.length > prevMessagesLength.current) {
      setUnreadChatCount(prev => prev + (chatMessages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = chatMessages.length;
  }, [chatMessages, isChatOpen]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/meet/${roomId}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    if (isRecording) {
      const stop = window.confirm('A recording is currently in progress. Do you want to stop and save it before leaving?');
      if (stop) {
        stopRecording();
      }
    }
    navigate('/dashboard');
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getGridClass = () => {
    const total = 1 + Object.keys(remoteStreams).length;
    if (total === 1) return 'grid-cols-1 max-w-4xl';
    if (total === 2) return 'grid-cols-1 md:grid-cols-2 max-w-6xl';
    if (total <= 4) return 'grid-cols-1 md:grid-cols-2 max-w-6xl';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl';
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
    <div className="h-screen w-screen bg-bg-primary overflow-hidden relative flex flex-col justify-between pt-4 px-4 pb-2.5 text-textCol-primary selection:bg-greenAccent/20">
      
      {/* Top Header Row */}
      <header className="z-10 flex items-center justify-between px-4 py-3 glass-panel !bg-surface-glass !rounded-xl">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-textCol-primary text-md line-clamp-1">{meetingTitle}</h2>
          <span className="w-1.5 h-1.5 rounded-full bg-borderCol"></span>
          <span className="text-xs text-textCol-muted font-mono select-all uppercase tracking-wider">{roomId}</span>
          <button 
            onClick={handleCopyLink} 
            className="p-1 rounded bg-surface-glass border border-borderCol hover:border-blueAccent/20 text-textCol-secondary hover:text-textCol-primary transition-colors"
            title="Copy Meeting URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-greenAccent" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
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
      <div className="flex-1 flex p-6 min-h-0 w-full justify-center items-center overflow-hidden">
        {!pinnedUser ? (
          /* Standard Grid Layout */
          <div className={`grid gap-5 w-full h-full justify-center content-center ${getGridClass()}`}>
            {/* 1. Local Video Card */}
            {renderVideoCard(
              'local',
              localStream,
              mongoUser?.displayName || 'You',
              isMuted,
              isCameraOff,
              isScreenSharing,
              true
            )}

            {/* 2. Remote Video Cards */}
            {Object.keys(remoteStreams).map((socketId) => {
              const peer = remoteStreams[socketId];
              return renderVideoCard(
                socketId,
                peer.stream,
                peer.displayName || 'Participant',
                peer.isMuted,
                peer.isCameraOff || !peer.stream,
                peer.isScreenSharing,
                false
              );
            })}
          </div>
        ) : (
          /* Pinned Speaker / Speaker Zoom Layout */
          <div className="flex w-full h-full gap-5 overflow-hidden">
            {/* Main Stage (Zoomed Pinned User) */}
            <div className="flex-1 h-full min-w-0">
              {pinnedUser === 'local'
                ? renderVideoCard(
                    'local',
                    localStream,
                    mongoUser?.displayName || 'You',
                    isMuted,
                    isCameraOff,
                    isScreenSharing,
                    true
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
                          false
                        )
                      : null;
                  })()}
            </div>

            {/* Sidebar Thumbnails List (Scrollable column for other participants) */}
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
                  true
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
                    true
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Control Bar */}
      <footer className="z-10 pt-2 pb-1 flex items-center justify-center relative">
        <div className="glass-panel py-3 px-6 bg-bg-secondary/60 flex items-center justify-center gap-4 border border-white/10 rounded-2xl shadow-xl">
          <button
            onClick={toggleMute}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
              isMuted 
                ? 'bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600/20' 
                : 'bg-surface-glass border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleCamera}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
              isCameraOff 
                ? 'bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600/20' 
                : 'bg-surface-glass border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary'
            }`}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all ${
              isScreenSharing 
                ? 'bg-greenAccent/15 border-greenAccent/30 text-greenAccent-light hover:bg-greenAccent/20' 
                : 'bg-surface-glass border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary'
            }`}
            title={isScreenSharing ? 'Stop screen sharing' : 'Share your screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          <span className="w-[1px] h-6 bg-borderCol"></span>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-11 h-11 rounded-xl bg-surface-glass border border-borderCol hover:border-red-500/30 text-textCol-secondary hover:text-red-400 flex items-center justify-center transition-all"
              title="Record Meeting"
            >
              <Radio className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-borderCol/55">
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="w-9 h-9 rounded-lg bg-surface-glass text-greenAccent hover:text-greenAccent-light flex items-center justify-center"
                  title="Resume Recording"
                >
                  <Play className="w-4 h-4 fill-greenAccent" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="w-9 h-9 rounded-lg bg-surface-glass text-yellow-500 hover:text-yellow-400 flex items-center justify-center"
                  title="Pause Recording"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={stopRecording}
                className="w-9 h-9 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"
                title="Stop & Save Recording"
              >
                <Square className="w-4 h-4 fill-white text-white" />
              </button>
            </div>
          )}

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all relative ${
              isChatOpen 
                ? 'bg-blueAccent/15 border-blueAccent/30 text-blueAccent-light' 
                : 'bg-surface-glass border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary'
            }`}
            title="Chat Drawer"
          >
            <MessageSquare className="w-5 h-5" />
            <AnimatePresence>
              {unreadChatCount > 0 && (
                <motion.span
                  key="chat-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-blueAccent border-2 border-bg-primary text-white rounded-full flex items-center justify-center text-[9px] font-bold px-1.5 shadow-md pointer-events-none"
                >
                  {unreadChatCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={handleLeave}
            className="w-11 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-all shadow-lg shadow-red-600/15"
            title="Leave Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Right sliding Chat Panel Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        roomId={roomId}
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        userId={mongoUser?.uid || mongoUser?._id}
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
    </div>
  );
}
