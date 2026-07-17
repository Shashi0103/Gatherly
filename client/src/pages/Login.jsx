import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Video, Mail, Lock, User, ChevronRight, AlertCircle, ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const { login, signup, currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode States (isSignUp controls Register, isForgotPassword controls Reset Password)
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Status Notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // UX Hooks
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect to dashboard immediately if the user session is active
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Adjust modes based on navigation query search parameters
  const modeParam = searchParams.get('mode');
  useEffect(() => {
    setIsSignUp(modeParam === 'signup');
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
  }, [modeParam]);

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Main submission handler supporting Login, Register, and Direct Reset
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Flow 1: Direct Password Reset
    if (isForgotPassword) {
      if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all password fields.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.post('/api/auth/reset-password-direct', {
          email: email.trim(),
          password,
          confirmPassword,
        });

        // Set success message, clear form inputs
        setSuccess(response.data.message || 'Password has been reset successfully!');
        setEmail('');
        setPassword('');
        setConfirmPassword('');

        // Automatically toggle back to login after showing success banner
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccess('');
        }, 3000);
      } catch (err) {
        console.error('Direct Reset Error:', err);
        const backendMessage = err.response?.data?.message;
        setError(backendMessage || err.message || 'An error occurred during password reset.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Flow 2 & 3: Standard login/signup field validation
    if (!email.trim() || !password.trim() || (isSignUp && (!displayName.trim() || !confirmPassword.trim()))) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Sign Up Flow
        await signup(email.trim(), password, displayName.trim());
      } else {
        // Sign In Flow
        await login(email.trim(), password);
      }
      // Success: Navigate straight to dashboard. Keep loading=true to let the button spinner stay active
      navigate('/dashboard');
    } catch (err) {
      console.error('Authentication Error:', err);
      const backendMessage = err.response?.data?.message;
      const message = backendMessage || (err.code ? err.code.replace('auth/', '').replace(/-/g, ' ') : err.message);
      setError(message.charAt(0).toUpperCase() + message.slice(1));
      setLoading(false); // Stop loading ONLY on failure
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-primary flex items-center justify-center p-6 text-textCol-primary overflow-x-hidden overflow-y-auto select-none">
      
      {/* Back to Home Navigation Button (Top Left) */}
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-6 left-6 btn-ghost !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 cursor-pointer z-20"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      {/* Main card column wrapper */}
      <div className="w-full max-w-md z-10 py-12 relative">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo.png" alt="Gatherly Logo" width="48" height="48" className="w-12 h-12 object-contain rounded-2xl shadow-lg shadow-blueAccent/15" />
          <h2 className="text-2xl font-bold tracking-tight text-textCol-primary">Gatherly</h2>
          <p className="text-xs text-textCol-muted">Secure Lightweight Video Conferences</p>
        </div>

        {/* Toast Notification Container (Positioned adjacent in empty space on the right side of the card) */}
        <div className="fixed top-6 right-6 w-[calc(100%-48px)] max-w-sm z-50 flex flex-col gap-3 md:absolute md:left-[calc(100%+24px)] md:top-1/2 md:-translate-y-1/2 md:right-auto md:w-80">
          
          {/* Error Toast */}
          {error && (
            <div className="p-4 rounded-xl bg-red-600 border border-red-700 text-white flex items-start justify-between gap-3 shadow-2xl animate-slide-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div className="text-sm font-semibold text-white select-text">{error}</div>
              </div>
              <button 
                type="button"
                onClick={() => setError('')} 
                className="text-white/80 hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4 shrink-0 mt-0.5" />
              </button>
            </div>
          )}

          {/* Success Toast */}
          {success && (
            <div className="p-4 rounded-xl bg-greenAccent border border-greenAccent-hover text-white flex items-start justify-between gap-3 shadow-2xl animate-slide-in">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-white shrink-0 mt-0.5" />
                <div className="text-sm font-semibold text-white select-text">{success}</div>
              </div>
              <button 
                type="button"
                onClick={() => setSuccess('')} 
                className="text-white/80 hover:text-white transition-colors cursor-pointer focus:outline-none"
              >
                <X className="w-4 h-4 shrink-0 mt-0.5" />
              </button>
            </div>
          )}

        </div>

        {/* Card Panel */}
        <div className="glass-panel p-8 bg-bg-secondary/40 relative">
          
          <h3 className="text-xl font-semibold mb-6 text-textCol-primary">
            {isForgotPassword 
              ? 'Reset your password' 
              : isSignUp 
                ? 'Create your account' 
                : 'Welcome back'}
          </h3>

          {/* Core Input Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Register Mode Input: Full Name */}
            {isSignUp && !isForgotPassword && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-textCol-secondary">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-textCol-muted" />
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused"
                  />
                </div>
              </div>
            )}

            {/* Email Address Input (Shared across all modes) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-textCol-secondary">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-textCol-muted" />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused"
                />
              </div>
            </div>

            {/* Password Input (Shared across all modes - changes label dynamically) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-textCol-secondary">
                {isForgotPassword ? 'New Password' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-textCol-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-textCol-muted hover:text-textCol-primary transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input (Displays in both Forgot Password and Register modes) */}
            {(isForgotPassword || (isSignUp && !isForgotPassword)) && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-textCol-secondary">
                  {isForgotPassword ? 'Confirm New Password' : 'Confirm Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-textCol-muted" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-11 bg-surface-card border border-borderCol text-textCol-primary focus:border-borderCol-focused"
                  />
                </div>
              </div>
            )}

            {/* Forgot Password Link (Only displays on Login View) */}
            {!isSignUp && !isForgotPassword && (
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-xs text-blueAccent hover:underline font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 group font-semibold cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isForgotPassword ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer Navigation Links */}
          <div className="mt-8 text-center text-sm text-textCol-secondary">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-greenAccent hover:underline font-semibold cursor-pointer"
              >
                Back to Sign In
              </button>
            ) : isSignUp ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-greenAccent hover:underline font-semibold cursor-pointer"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-greenAccent hover:underline font-semibold cursor-pointer"
                >
                  Create Account
                </button>
              </>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
