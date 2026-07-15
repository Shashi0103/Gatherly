import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [mongoUser, setMongoUser] = useState(null); // Retained for backwards compatibility with existing views
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);

  // Set up API Axios base URL
  axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('gatherly_token');
      if (token) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await axios.get('/api/auth/me');
          setCurrentUser(response.data);
          setMongoUser(response.data);
          console.log('Session restored successfully for user:', response.data.email);
        } catch (error) {
          console.error('Session restoration failed:', error.message);
          localStorage.removeItem('gatherly_token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setInitializing(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('gatherly_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(user);
      setMongoUser(user);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email, password, displayName) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/register', { email, password, displayName });
      const { token, user } = response.data;
      
      localStorage.setItem('gatherly_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setCurrentUser(user);
      setMongoUser(user);
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('gatherly_token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
    setMongoUser(null);
  };

  const updateProfile = async (profileData) => {
    const response = await axios.put('/api/auth/profile', profileData);
    const updatedUser = response.data;
    setCurrentUser(updatedUser);
    setMongoUser(updatedUser);
    return updatedUser;
  };

  const value = {
    currentUser,
    mongoUser, // maps to currentUser for seamless integration with existing UI code
    login,
    signup,
    logout,
    updateProfile,
    loading,
    initializing
  };

  return (
    <AuthContext.Provider value={value}>
      {!initializing && children}
    </AuthContext.Provider>
  );
};
