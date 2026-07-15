import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Video, Shield, Monitor, MessageSquare, Calendar, Download, Users, Zap, Check, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Home() {
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      navigate(`/meet/${meetingCode.trim().toLowerCase()}`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  const features = [
    {
      icon: <Video className="w-6 h-6 text-blueAccent" />,
      title: "HD Video Calls",
      desc: "Connect in high-definition video and crystal-clear audio with up to 6 participants."
    },
    {
      icon: <Monitor className="w-6 h-6 text-greenAccent" />,
      title: "Screen Sharing",
      desc: "Share your entire screen, a specific window, or browser tab with a single click."
    },
    {
      icon: <Download className="w-6 h-6 text-blueAccent" />,
      title: "Meeting Recording",
      desc: "Record your meetings directly to your computer and download them instantly as high-quality MP4 files."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-greenAccent" />,
      title: "In-Meeting Chat",
      desc: "Send messages, emojis, and share links with other participants in real-time during your calls."
    },
    {
      icon: <Calendar className="w-6 h-6 text-blueAccent" />,
      title: "Easy Scheduling",
      desc: "Plan ahead by scheduling meetings, sending calendar invitations, and managing your upcoming calls."
    },
    {
      icon: <Shield className="w-6 h-6 text-greenAccent" />,
      title: "Encrypted & Secure",
      desc: "Enjoy total privacy with fully encrypted connections that keep your conversations completely confidential."
    }
  ];

  return (
    <div className="relative min-h-screen bg-bg-primary overflow-x-hidden text-textCol-primary selection:bg-greenAccent/30 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass-panel !rounded-none !border-t-0 !border-x-0 bg-bg-primary/60 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Solid color - no gradients */}
            <div className="w-10 h-10 rounded-xl bg-blueAccent flex items-center justify-center shadow-md">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-textCol-primary">Gatherly</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-surface-glass border border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary transition-all cursor-pointer flex items-center justify-center"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-yellow-500" /> : <Moon className="w-4.5 h-4.5 text-blueAccent" />}
            </button>

            {currentUser ? (
              <Link to="/dashboard" className="btn-secondary text-sm">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-textCol-secondary hover:text-textCol-primary text-sm font-medium transition-colors">
                  Sign In
                </Link>
                <Link to="/login?mode=signup" className="btn-primary text-sm !py-2">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 flex flex-col lg:flex-row items-center gap-16 relative">
        <motion.div 
          className="flex-1 space-y-8 text-center lg:text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Solid color heading - no text gradients */}
          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight text-textCol-primary">
            Lightweight Video Rooms.<br />
            <span className="text-blueAccent">
              Connected in Seconds.
            </span>
          </h1>

          <p className="text-lg text-textCol-secondary max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
            Experience crystalline peer-to-peer audio, zero-latency screen sharing, and local high-quality MP4 meeting recording. No complex setups. No data tracking.
          </p>

          {/* Join Meeting CTA Block */}
          <div className="flex flex-row flex-wrap items-center justify-center lg:justify-start gap-4 max-w-2xl mx-auto lg:mx-0">
            <form onSubmit={handleJoin} className="flex w-full sm:w-auto relative items-center">
              <input
                type="text"
                placeholder="Enter meeting code (abc-defg-hij)"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                className="w-full sm:w-80 rounded-glass py-3.5 px-5 bg-surface-card border border-borderCol text-sm text-textCol-primary focus:border-borderCol-focused focus:ring-4 focus:ring-greenAccent/10"
              />
              <button 
                type="submit" 
                disabled={!meetingCode.trim()} 
                className="absolute right-2 px-4 py-2 bg-greenAccent hover:bg-greenAccent-hover text-white rounded-xl text-xs font-medium transition-all disabled:opacity-50"
              >
                Join
              </button>
            </form>
            
            <span className="text-textCol-muted text-xs sm:text-sm font-medium">or</span>

            <button 
              onClick={() => currentUser ? navigate('/dashboard') : navigate('/login')} 
              className="btn-primary py-3.5 px-6 flex items-center justify-center gap-2 shrink-0"
            >
              Start New Call
            </button>
          </div>

          {/* Stats Bar */}
          <div className="pt-8 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0 text-left border-t border-borderCol">
            <div>
              <p className="text-2xl font-bold text-textCol-primary">Mesh</p>
              <p className="text-xs text-textCol-muted">Up to 6 participants</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-greenAccent">100%</p>
              <p className="text-xs text-textCol-muted">Local Recording Privacy</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blueAccent">&lt; 100ms</p>
              <p className="text-xs text-textCol-muted">Latency P2P Connection</p>
            </div>
          </div>
        </motion.div>

        {/* Hero Interactive App Preview */}
        <motion.div 
          className="flex-1 w-full relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="glass-panel p-3 w-full border border-borderCol rounded-glass shadow-2xl relative overflow-hidden bg-bg-secondary/40 aspect-video flex flex-col">
            {/* Mock Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-borderCol">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              </div>
              <span className="text-xs text-textCol-muted font-mono font-normal">meeting/yul-qpxd-pzb</span>
              <div className="flex items-center gap-1 bg-red-600/20 text-red-500 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping mr-1"></span> REC
              </div>
            </div>

            {/* Grid of users */}
            <div className="flex-1 p-3 grid grid-cols-2 gap-3 relative">
              <div className="rounded-xl overflow-hidden relative border border-greenAccent/60 shadow-lg group">
                <div className="w-full h-full bg-blueAccent/10 flex items-center justify-center absolute inset-0 text-xl font-bold text-blueAccent-light">
                  M
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                  <span className="text-xs text-white font-medium">Morgan (You)</span>
                </div>
                <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-greenAccent flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden relative border border-borderCol">
                <div className="w-full h-full bg-greenAccent/10 flex items-center justify-center absolute inset-0 text-xl font-bold text-greenAccent-light">
                  A
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                  <span className="text-xs text-white font-medium">Alex Rivera</span>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden relative border border-borderCol">
                <div className="w-full h-full bg-blueAccent/10 flex items-center justify-center absolute inset-0 text-xl font-bold text-blueAccent-light">
                  J
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
                  <span className="text-xs text-white font-medium">Jordan Vance</span>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden relative border border-borderCol flex items-center justify-center bg-bg-primary/80">
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-surface-glass flex items-center justify-center mx-auto border border-borderCol">
                    <Users className="w-4 h-4 text-textCol-secondary" />
                  </div>
                  <span className="text-[10px] text-textCol-muted block">Waiting for peers...</span>
                </div>
              </div>
            </div>

            {/* Float Controls */}
            <div className="py-2.5 flex items-center justify-center gap-3 border-t border-borderCol">
              <span className="w-8 h-8 rounded-full bg-surface-glass border border-borderCol flex items-center justify-center cursor-pointer hover:bg-white/10"><Video className="w-3.5 h-3.5 text-blueAccent" /></span>
              <span className="w-8 h-8 rounded-full bg-surface-glass border border-borderCol flex items-center justify-center cursor-pointer hover:bg-white/10"><Users className="w-3.5 h-3.5 text-textCol-secondary" /></span>
              <span className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center cursor-pointer hover:bg-red-600"><Video className="w-3.5 h-3.5 text-red-500" /></span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Cards Grid */}
      <section className="bg-bg-secondary/40 border-y border-borderCol py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-textCol-primary">Stunning capabilities, zero compromises</h2>
            <p className="text-textCol-secondary text-sm md:text-base">
              Engineered with modern technologies, Gatherly delivers all the features you expect from a premium conferencing tool, optimized directly in your web browser.
            </p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feat, idx) => (
              <motion.div 
                key={idx} 
                className="glass-card p-8 flex flex-col justify-between"
                variants={itemVariants}
                whileHover={{ y: -6, borderColor: 'rgba(59, 130, 246, 0.2)' }}
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-glass border border-borderCol flex items-center justify-center">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-textCol-primary">{feat.title}</h3>
                  <p className="text-textCol-secondary text-sm leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Premium UI Showcase / Statistics */}
      <section className="max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-12 justify-between">
        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-bold tracking-tight text-textCol-primary">Full Control. Built for Privacy.</h2>
          <p className="text-textCol-secondary text-sm leading-relaxed">
            Gatherly keeps your meetings completely private. Our secure local recording system ensures your video and audio streams are saved directly on your device, without any servers or third parties accessing your conversations.
          </p>
          <ul className="space-y-3">
            {[
              'Zero server storage of your conversations',
              'High-definition local video recording',
              'Secure peer-to-peer connection',
              'Privacy-focused metadata logging'
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-sm text-textCol-secondary">
                <span className="w-5 h-5 rounded-full bg-greenAccent/10 flex items-center justify-center text-greenAccent"><Check className="w-3 h-3" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Solid container background (no gradients) */}
        <div className="glass-panel p-8 max-w-md bg-surface-card border border-borderCol relative">
          <h3 className="text-xl font-bold text-textCol-primary mb-2">Designed for modern teams</h3>
          <p className="text-sm text-textCol-secondary leading-relaxed mb-6">
            Plan, organize, join and record meetings with a fluid user interface designed to feel light, responsive, and aesthetically premium.
          </p>
          <div className="flex gap-4">
            <Link to="/login" className="btn-secondary !py-2.5 !px-4 text-xs font-semibold">Join Gatherly Now</Link>
            <a href="#learn" className="btn-ghost !py-2.5 !px-4 text-xs font-semibold">Technical Docs</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-borderCol py-12 bg-bg-primary">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-textCol-muted text-xs font-normal">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blueAccent flex items-center justify-center">
              <Video className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-textCol-secondary text-sm">Gatherly</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-right">
            <p>&copy; {new Date().getFullYear()} Gatherly. All rights reserved.</p>
            <span className="hidden sm:inline text-textCol-muted/40">|</span>
            <p className="flex items-center gap-1 text-textCol-secondary">
              Built with{' '}
              <span className="inline-block animate-pulse-heart text-blueAccent font-sans">🩵</span>{' '}
              by Shashi Kumar Sahu
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
