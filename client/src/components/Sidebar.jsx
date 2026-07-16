import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Video, FolderGit, LogOut, Home, Clock, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

export default function Sidebar() {
  const { logout, mongoUser } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  // Helper to extract first letters of the name
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
    { to: '/recordings', icon: <FolderGit className="w-5 h-5" />, label: 'Recordings' },
  ];

  return (
    <>
      <aside className="hidden md:flex w-64 glass-panel !h-[calc(100vh-2rem)] flex flex-col justify-between p-6 bg-bg-secondary/40 shrink-0 sticky top-4 left-4 m-4">
        {/* Brand & Logo */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-9 h-9 rounded-xl bg-blueAccent flex items-center justify-center shadow-md">
              <Video className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-textCol-primary">Gatherly</span>
          </div>

          {/* User Info Card / Initials Fallback */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-card border border-borderCol">
            <div className="flex items-center gap-3.5 min-w-0">
              {mongoUser?.photoURL ? (
                <img
                  src={mongoUser.photoURL}
                  alt="User profile"
                  className="w-10 h-10 rounded-lg bg-bg-primary object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blueAccent flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {getInitials(mongoUser?.displayName)}
                </div>
              )}
              
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-textCol-primary truncate">{mongoUser?.displayName || 'Gatherly User'}</h4>
                <span className="text-[10px] text-textCol-muted truncate block">{mongoUser?.email || ''}</span>
              </div>
            </div>

            {/* Edit Profile Gear Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-1.5 rounded-lg bg-surface-glass border border-borderCol hover:border-blueAccent/25 text-textCol-secondary hover:text-textCol-primary transition-all shrink-0 cursor-pointer"
              title="Edit Profile"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blueAccent text-white shadow-md shadow-blueAccent/15'
                      : 'text-textCol-secondary hover:text-textCol-primary hover:bg-surface-glass border border-transparent hover:border-borderCol'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Clock & Bottom Buttons */}
        <div className="space-y-6">
          {/* Clock Card */}
          <div className="p-3.5 rounded-xl bg-surface-card/60 border border-borderCol text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-textCol-muted text-[10px] font-medium uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" /> Date & Time
            </div>
            <p className="text-sm font-bold text-textCol-primary font-mono">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-[10px] text-textCol-muted font-mono">
              {time.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-textCol-secondary hover:text-textCol-primary transition-all hover:bg-surface-glass"
            >
              <Home className="w-5 h-5" />
              Home
            </button>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-transparent hover:border-red-500/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-4 left-4 right-4 z-40 h-16 rounded-2xl glass-panel bg-bg-secondary/90 border border-white/10 flex items-center justify-around px-4 md:hidden backdrop-blur-xl shadow-lg">
        {navItems.map((item) => {
          const isActive = window.location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                isActive ? 'text-blueAccent' : 'text-textCol-secondary hover:text-textCol-primary'
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-bold tracking-wide">{item.label}</span>
            </button>
          );
        })}
        
        <button
          onClick={() => setIsProfileOpen(true)}
          className="p-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-textCol-secondary hover:text-textCol-primary transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">Profile</span>
        </button>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-red-400 hover:text-red-300 transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-wide">Sign Out</span>
        </button>
      </div>

      {/* Profile Editing Settings Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </>
  );
}
