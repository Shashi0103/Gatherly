import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Lock, User, Calendar, Check, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProfileModal({ isOpen, onClose }) {
  const { mongoUser, updateProfile } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [dob, setDob] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Load current user profile details when modal opens
  useEffect(() => {
    if (isOpen && mongoUser) {
      setDisplayName(mongoUser.displayName || '');
      setPhotoURL(mongoUser.photoURL || '');
      
      // Format Date string for HTML Date input (YYYY-MM-DD)
      if (mongoUser.dob) {
        try {
          const dateObj = new Date(mongoUser.dob);
          if (!isNaN(dateObj.getTime())) {
            const formatted = dateObj.toISOString().split('T')[0];
            setDob(formatted);
          } else {
            setDob('');
          }
        } catch (err) {
          console.error('Error parsing dob:', err);
          setDob('');
        }
      } else {
        setDob('');
      }
      
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, mongoUser]);

  // Helper to extract first letters of the name
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // 2MB limit check for Base64 storage in Mongo
      if (file.size > 2 * 1024 * 1024) {
        setError('Image file must be under 2MB.');
        return;
      }
      
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result); // Base64 Data URL
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!displayName.trim()) {
      setError('Display name is required.');
      setLoading(false);
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const updates = {
        displayName,
        photoURL,
        dob: dob || null
      };

      if (password) {
        updates.password = password;
      }

      await updateProfile(updates);
      setSuccess('Profile updated successfully!');
      
      // Clear password inputs
      setPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop click closer */}
          <div className="absolute inset-0" onClick={onClose}></div>

          {/* Modal Panel container */}
          <motion.div
            className="w-full max-w-md glass-panel p-6 bg-bg-secondary border border-borderCol relative z-10 flex flex-col max-h-[90vh] text-textCol-primary shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-borderCol shrink-0">
              <h3 className="text-lg font-bold text-textCol-primary">Edit User Profile</h3>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-lg bg-surface-glass border border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification messages */}
            {error && (
              <div className="mt-4 p-3 rounded-xl bg-red-950/20 border border-red-500/30 flex items-start gap-2.5 shrink-0">
                <AlertCircle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-red-300 font-medium">{error}</span>
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 rounded-xl bg-greenAccent/15 border border-greenAccent/20 flex items-start gap-2.5 shrink-0">
                <Check className="w-4.5 h-4.5 text-greenAccent shrink-0 mt-0.5" />
                <span className="text-xs text-greenAccent-light font-medium">{success}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden mt-4">
              
              {/* Scrollable Input Fields Wrapper */}
              <div className="flex-1 overflow-y-auto pr-1.5 py-2 space-y-4">
                {/* Profile Avatar Editor */}
                <div className="flex flex-col items-center gap-2 pb-2">
                  <div className="relative group w-20 h-20 rounded-2xl overflow-hidden border border-borderCol shadow-md bg-bg-primary">
                    {photoURL ? (
                      <img 
                        src={photoURL} 
                        alt="Avatar Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blueAccent text-white font-extrabold text-2xl">
                        {getInitials(displayName)}
                      </div>
                    )}

                    {/* File input overlay overlay on hover */}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-bold text-white transition-opacity cursor-pointer">
                      <Camera className="w-4 h-4 mb-0.5" />
                      Upload Photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <span className="text-[10px] text-textCol-muted">Click image to upload custom avatar</span>
                </div>

                {/* Registered Email (ReadOnly) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-textCol-secondary">Registered Email Address</label>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-textCol-muted" />
                    <input
                      type="email"
                      readOnly
                      disabled
                      value={mongoUser?.email || ''}
                      className="w-full pl-10 text-xs bg-bg-primary border border-borderCol text-textCol-muted cursor-not-allowed py-2.5 rounded-xl select-all"
                    />
                  </div>
                </div>

                {/* Display Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-textCol-secondary">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-textCol-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Enter your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 text-xs bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused outline-none py-2.5 rounded-xl"
                    />
                  </div>
                </div>

                {/* Date of Birth Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-textCol-secondary">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-textCol-muted" />
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full pl-10 text-xs bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused outline-none py-2.5 rounded-xl font-sans"
                    />
                  </div>
                </div>

                {/* Password change divider banner */}
                <div className="pt-2 border-t border-borderCol/50 mt-4">
                  <h4 className="text-[11px] font-bold text-textCol-muted uppercase tracking-wider mb-3">
                    Change Password (Leave blank to keep current)
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-textCol-secondary">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-textCol-muted" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 text-xs bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused outline-none py-2.5 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-textCol-secondary">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-textCol-muted" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-10 text-xs bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused outline-none py-2.5 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderCol/50 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-ghost !py-2 !px-4 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-secondary !py-2 !px-4 text-xs font-semibold flex items-center justify-center"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
