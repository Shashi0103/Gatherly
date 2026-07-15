import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Smile, Paperclip, ExternalLink } from 'lucide-react';
import axios from 'axios';

export default function ChatDrawer({ isOpen, onClose, roomId, messages, onSendMessage, userId }) {
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Fetch Message History
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/chat/${roomId}`);
        setHistory(res.data);
      } catch (err) {
        console.error('Error fetching chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, roomId]);

  // Combine historical messages with real-time room updates
  const allMessages = [...history, ...messages.filter(m => !history.some(h => h._id === m._id))];

  // Auto Scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText('');
  };

  const handleEmojiClick = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to check if text is a URL to format as a clickable file link
  const renderMessageContent = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(text)) {
      return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-greenAccent-light hover:underline underline-offset-2 break-all"
            >
              <Paperclip className="w-3.5 h-3.5" /> File Link <ExternalLink className="w-3 h-3" />
            </a>
          );
        }
        return part;
      });
    }
    return text;
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-bg-secondary/95 backdrop-blur-xl border-l border-borderCol z-40 flex flex-col justify-between shadow-2xl"
    >
      {/* Header */}
      <div className="p-5 border-b border-borderCol flex items-center justify-between">
        <div>
          <h3 className="font-bold text-textCol-primary text-md">Meeting Chat</h3>
          <span className="text-[10px] text-textCol-muted font-mono">{roomId}</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface-glass text-textCol-muted hover:text-textCol-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="text-center text-textCol-muted text-xs py-8">
            Loading message logs...
          </div>
        ) : allMessages.length === 0 ? (
          <div className="text-center text-textCol-muted text-xs py-12">
            No messages in this meeting yet. Write a message below to start chatting.
          </div>
        ) : (
          allMessages.map((msg, idx) => {
            const isOwn = msg.senderId === userId;
            return (
              <div key={msg._id || idx} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {/* Sender Tag */}
                {!isOwn && (
                  <span className="text-[10px] text-textCol-muted mb-1 ml-1 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-greenAccent"></span>
                    {msg.sender?.displayName || 'Participant'}
                  </span>
                )}
                
                {/* Bubble */}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  isOwn 
                    ? 'bg-blueAccent text-white rounded-tr-none' 
                    : 'glass-panel !bg-surface-glass text-textCol-secondary rounded-tl-none'
                }`}>
                  <p className="break-words">{renderMessageContent(msg.message)}</p>
                  <span className={`block text-[9px] text-right mt-1 font-mono ${
                    isOwn ? 'text-white/60' : 'text-textCol-muted'
                  }`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick Emoji Bar & Input form */}
      <div className="p-4 border-t border-borderCol space-y-3 bg-bg-secondary/60">
        {/* Emoji list */}
        <div className="flex justify-between px-2">
          {['👍', '❤️', '😂', '😮', '👏', '🚀', '🔥'].map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-md hover:scale-120 active:scale-95 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message or paste file URL..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-surface-card border border-borderCol hover:border-blueAccent/25 text-white text-xs px-4 py-3 rounded-xl focus:border-borderCol-focused focus:ring-0"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-3 bg-blueAccent hover:bg-blueAccent-hover text-white rounded-xl transition-all disabled:opacity-50"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
