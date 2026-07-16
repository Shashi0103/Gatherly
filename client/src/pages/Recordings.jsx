import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderGit, Trash2, Search, ArrowDownCircle, Lock, Play } from 'lucide-react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

export default function Recordings() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/recordings');
      setRecordings(res.data);
    } catch (err) {
      console.error('Error fetching recordings metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const handleDelete = async (recId) => {
    if (!window.confirm('Delete this recording metadata? (Note: The actual MP4 file on your computer will NOT be deleted).')) {
      return;
    }

    try {
      await axios.delete(`/api/recordings/${recId}`);
      setSuccess('Recording metadata log deleted.');
      fetchRecordings();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting recording metadata:', err);
      setError('Could not delete recording metadata.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Helper to format duration in mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to format file size
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredRecordings = recordings.filter((rec) =>
    rec.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.meetingTitle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-primary flex text-textCol-primary overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 md:pr-12 pb-24 md:pb-8 relative">
        {/* Toast alerts */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-12 z-50 py-3 px-5 rounded-glass bg-greenAccent/15 border border-greenAccent/30 text-greenAccent-light text-xs font-semibold shadow-lg"
            >
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-6 right-12 z-50 py-3 px-5 rounded-glass bg-red-950/20 border border-red-500/30 text-red-300 text-xs font-semibold shadow-lg"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-textCol-primary mb-1.5 flex items-center gap-2.5">
              <FolderGit className="w-8 h-8 text-blueAccent" /> Meeting Recordings
            </h1>
            <p className="text-textCol-secondary text-sm">
              Manage logs and metadata of calls recorded during your sessions.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-textCol-muted" />
            <input
              type="text"
              placeholder="Search recordings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-card border border-borderCol pl-10 pr-4 py-2.5 rounded-xl text-sm text-textCol-primary"
            />
          </div>
        </header>

        {/* Security Warning Box */}
        <div className="glass-panel p-4 mb-8 bg-blueAccent/5 border border-blueAccent/10 flex items-start gap-3">
          <Lock className="w-5 h-5 text-blueAccent shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-textCol-primary uppercase tracking-wider">Client-Side Privacy Guarantee</h4>
            <p className="text-xs text-textCol-secondary leading-relaxed mt-1">
              To guarantee total privacy, Gatherly encodes and saves video and audio directly in your browser. 
              We only store the file metadata (name, duration, size) on the database. 
              The actual recordings are stored in your computer's local <strong>Downloads</strong> folder.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel p-12 text-center text-textCol-muted text-sm">
            Loading recordings list...
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="glass-panel p-16 text-center space-y-2">
            <p className="text-textCol-secondary text-sm font-semibold">No recordings found.</p>
            <p className="text-textCol-muted text-xs">When you record a meeting, its metadata logs will be visible here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((rec) => (
              <motion.div
                key={rec.recordingId}
                layout
                className="glass-card flex flex-col justify-between bg-surface-card"
                whileHover={{ y: -4, borderColor: 'rgba(59, 130, 246, 0.2)' }}
              >
                {/* Visual Thumbnail Simulator - Solid bg */}
                <div className="aspect-video bg-bg-secondary border-b border-borderCol flex items-center justify-center p-4 relative group">
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-greenAccent bg-greenAccent/10 px-2 py-0.5 rounded border border-greenAccent/20">
                      Local MP4
                    </span>
                    <p className="text-[10px] text-textCol-muted font-mono">{rec.recordingId}</p>
                  </div>

                  <span className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-white">
                    {formatDuration(rec.duration)}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-textCol-muted truncate max-w-[120px]">
                        {rec.meetingTitle}
                      </span>
                      <span className="text-[10px] bg-greenAccent/15 text-greenAccent-light border border-greenAccent/20 py-0.5 px-2 rounded-full font-bold">
                        Completed
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-textCol-primary text-sm line-clamp-1" title={rec.fileName}>
                      {rec.fileName}
                    </h4>

                    <div className="flex items-center gap-3 text-xs text-textCol-muted font-mono">
                      <span>Size: {formatSize(rec.size)}</span>
                      <span>•</span>
                      <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-borderCol/50 pt-3">
                    <button
                      onClick={() => alert(`File download name: ${rec.fileName}\nSaved in your computer's local Downloads folder.`)}
                      className="flex-1 p-2 bg-surface-glass border border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ArrowDownCircle className="w-4.5 h-4.5 text-blueAccent" /> Find File
                    </button>
                    
                    <button
                      onClick={() => handleDelete(rec.recordingId)}
                      className="p-2 border border-red-500/20 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl transition-all"
                      title="Delete Metadata Log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
