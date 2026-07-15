import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Calendar, Plus, Link as LinkIcon, Trash2, Users, Clock, Play, Search, Activity, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ScheduleModal from '../components/ScheduleModal';

export default function Dashboard() {
  const { mongoUser } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInstantCreating, setIsInstantCreating] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    past: 0,
  });

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/meetings');
      setMeetings(res.data);
      
      // Calculate Stats
      const now = new Date();
      const upcoming = res.data.filter(m => new Date(m.scheduledAt) > now && m.status !== 'cancelled').length;
      const past = res.data.filter(m => new Date(m.scheduledAt) <= now || m.status === 'past').length;
      
      setStats({
        total: res.data.length,
        upcoming,
        past
      });
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCreateInstant = async () => {
    try {
      setError('');
      setIsInstantCreating(true);
      
      // Artificial buffer delay of 1.5 seconds to show loading indicator
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      
      const createPromise = axios.post('/api/meetings', {
        title: `Instant Meeting - ${mongoUser?.displayName || 'User'}`,
        scheduledAt: new Date(),
        duration: 90
      });

      const [_, response] = await Promise.all([delayPromise, createPromise]);
      const meeting = response.data;
      navigate(`/meet/${meeting.meetingLink}`);
    } catch (err) {
      console.error('Error creating instant meeting:', err);
      setError('Failed to create instant meeting.');
      setIsInstantCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    let code = joinCode.trim().toLowerCase();
    if (code.includes('/meet/')) {
      code = code.split('/meet/')[1];
    }
    
    navigate(`/meet/${code}`);
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    
    try {
      await axios.delete(`/api/meetings/${meetingId}`);
      setSuccess('Meeting deleted successfully.');
      fetchMeetings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting meeting:', err);
      setError('Could not delete meeting.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const copyToClipboard = (linkCode) => {
    const fullUrl = `${window.location.origin}/meet/${linkCode}`;
    navigator.clipboard.writeText(fullUrl);
    setSuccess('Meeting link copied!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const upcomingList = meetings.filter(m => new Date(m.scheduledAt) > new Date() && m.status !== 'cancelled');
  const pastList = meetings.filter(m => new Date(m.scheduledAt) <= new Date() || m.status === 'past');

  return (
    <div className="min-h-screen bg-bg-primary flex text-textCol-primary overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-8 pr-12 relative">
        {/* Alerts notifications */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-50 py-3 px-5 rounded-glass bg-transparent border-2 border-blueAccent text-red-500 text-xs font-semibold shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4.5 h-4.5 text-blueAccent" /> {success}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-12 z-50 py-3 px-5 rounded-glass bg-red-950/20 border border-red-500/30 text-red-300 text-xs font-semibold shadow-lg shadow-red-500/5"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Greeting Banner */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-textCol-primary mb-1.5">
              {getGreeting()}, {mongoUser?.displayName || 'Gatherer'}!
            </h1>
            <p className="text-textCol-secondary text-sm">
              Here is what is going on with your video meetings today.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleCreateInstant} className="btn-primary !py-2.5 !px-5 text-sm flex items-center gap-2">
              <Plus className="w-4.5 h-4.5" /> Instant Meeting
            </button>
            <button onClick={() => setIsScheduleOpen(true)} className="btn-secondary !py-2.5 !px-5 text-sm flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5" /> Schedule Meeting
            </button>
          </div>
        </header>

        {/* Join Meeting & Search Block (Solid background - no gradients) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 glass-panel p-6 bg-surface-card flex items-center justify-between">
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-md font-bold text-textCol-primary">Join with a code</h3>
              <p className="text-xs text-textCol-secondary">Enter a meeting code or invitation URL to jump straight into the call.</p>
            </div>
            
            <form onSubmit={handleJoin} className="flex gap-2 relative max-w-sm w-full">
              <input
                type="text"
                placeholder="abc-defg-hij"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full text-sm bg-surface-card border border-borderCol pl-4 pr-16 py-2.5 rounded-xl text-textCol-primary outline-none"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-greenAccent hover:bg-greenAccent-hover text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                Join
              </button>
            </form>
          </div>

          <div className="glass-panel p-6 bg-bg-secondary/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blueAccent/10 border border-blueAccent/25 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-blueAccent" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-textCol-muted">Quick Tip</h4>
              <p className="text-xs text-textCol-secondary leading-relaxed mt-1">
                Press the Record button inside any call to create local MP4 video backups safely.
              </p>
            </div>
          </div>
        </section>

        {/* Statistics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Scheduled', val: stats.total, color: 'text-textCol-primary', icon: <Plus className="w-5 h-5 text-textCol-secondary" /> },
            { label: 'Upcoming Calls', val: stats.upcoming, color: 'text-greenAccent', icon: <Calendar className="w-5 h-5 text-greenAccent" /> },
            { label: 'Past Meetings', val: stats.past, color: 'text-blueAccent', icon: <Clock className="w-5 h-5 text-blueAccent" /> },
          ].map((card, idx) => (
            <div key={idx} className="glass-card p-6 flex justify-between items-center bg-surface-card">
              <div className="space-y-1">
                <span className="text-xs text-textCol-muted font-semibold uppercase tracking-wider">{card.label}</span>
                <p className={`text-3xl font-extrabold ${card.color}`}>{card.val}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-glass border border-borderCol flex items-center justify-center">
                {card.icon}
              </div>
            </div>
          ))}
        </section>

        {/* Meetings List */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Upcoming Meetings List */}
          <div className="xl:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-textCol-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-greenAccent" /> Upcoming Meetings
            </h3>
            
            {loading ? (
              <div className="glass-panel p-8 text-center text-textCol-muted text-sm">
                Loading scheduled meetings...
              </div>
            ) : upcomingList.length === 0 ? (
              <div className="glass-panel p-12 text-center space-y-3 bg-surface-card">
                <p className="text-textCol-secondary text-sm">No upcoming meetings scheduled.</p>
                <button onClick={() => setIsScheduleOpen(true)} className="btn-ghost !py-2 !px-4 text-xs font-semibold">
                  Schedule one now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingList.map((meet) => {
                  const isHost = meet.hostId === (mongoUser?.uid || mongoUser?._id);
                  return (
                    <motion.div
                      key={meet._id}
                      className="glass-card p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-greenAccent/20 bg-surface-card"
                      layoutId={meet._id}
                    >
                      <div className="space-y-2">
                        <h4 className="font-bold text-textCol-primary text-md">{meet.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-textCol-secondary">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-textCol-muted" />
                            {new Date(meet.scheduledAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-textCol-muted" />
                            {new Date(meet.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-textCol-muted" />
                            {meet.duration} mins
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end border-t sm:border-none border-borderCol pt-3 sm:pt-0">
                        <button
                          onClick={() => copyToClipboard(meet.meetingLink)}
                          className="p-2.5 rounded-xl bg-surface-glass border border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary transition-all text-xs flex items-center gap-1.5"
                          title="Copy Link"
                        >
                          <LinkIcon className="w-4 h-4" /> Copy
                        </button>
                        
                        {isHost && (
                          <button
                            onClick={() => handleDeleteMeeting(meet._id)}
                            className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 hover:bg-red-600/20 hover:border-red-500/30 text-red-400 hover:text-red-300 transition-all"
                            title="Delete Meeting"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/meet/${meet.meetingLink}`)}
                          className="btn-secondary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-white text-white" /> Start
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past Meetings Summary List */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-textCol-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-blueAccent" /> Recent History
            </h3>

            {loading ? (
              <div className="glass-panel p-6 text-center text-textCol-muted text-xs">
                Loading history...
              </div>
            ) : pastList.length === 0 ? (
              <div className="glass-panel p-6 text-center text-textCol-muted text-xs bg-surface-card">
                No meeting history.
              </div>
            ) : (
              <div className="glass-panel p-5 divide-y divide-borderCol bg-surface-card">
                {pastList.slice(0, 5).map((meet, idx) => (
                  <div key={meet._id} className={`py-4 flex justify-between items-center ${idx === 0 ? 'pt-0' : ''} ${idx === pastList.length - 1 ? 'pb-0' : ''}`}>
                    <div className="min-w-0 pr-4 space-y-1">
                      <h4 className="font-semibold text-sm text-textCol-primary truncate">{meet.title}</h4>
                      <span className="text-[10px] text-textCol-muted font-mono block">
                        {new Date(meet.scheduledAt).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs bg-surface-glass border border-borderCol px-2.5 py-1 rounded-lg text-textCol-secondary shrink-0 font-medium font-mono">
                      {meet.duration}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Schedule Modal component */}
        <ScheduleModal
          isOpen={isScheduleOpen}
          onClose={() => setIsScheduleOpen(false)}
          onScheduleSuccess={() => {
            fetchMeetings();
          }}
        />

        {/* Instant Meeting creation loading overlay */}
        <AnimatePresence>
          {isInstantCreating && (
            <motion.div
              key="instant-creation-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <div className="w-full max-w-sm glass-panel bg-bg-secondary p-8 border border-white/10 text-center space-y-6 shadow-2xl">
                <div className="w-14 h-14 border-4 border-blueAccent border-t-transparent rounded-full animate-spin mx-auto"></div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-textCol-primary">Initializing Meeting Room</h3>
                  <p className="text-xs text-textCol-secondary">Generating secure peer-to-peer keys and establishing signaling channels...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
