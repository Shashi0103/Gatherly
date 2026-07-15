import express from 'express';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to sign JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId }, 
    process.env.JWT_SECRET || 'fallback_secret_key', 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'All registration fields are required' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Create new user in DB
    const user = await User.create({
      displayName,
      email,
      password,
      photoURL: '',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @desc    Authenticate User & Login
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Lookup user with password included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password mismatch' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @desc    Direct password reset without email token (development/testing convenience)
// @route   POST /api/auth/reset-password-direct
// @access  Public
router.post('/reset-password-direct', async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Lookup user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email address' });
    }

    // Update password (will trigger Mongoose pre-save hash hook)
    user.password = password;
    await user.save();

    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error.message);
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

// @desc    Get Current Logged-in User profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error('Error in /me route:', error.message);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
});

// @desc    Update User profile details (displayName, photoURL, password, dob)
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { displayName, photoURL, dob, password } = req.body;

    if (displayName !== undefined) {
      user.displayName = displayName;
    }
    if (photoURL !== undefined) {
      user.photoURL = photoURL;
    }
    if (dob !== undefined) {
      user.dob = dob ? new Date(dob) : null;
    }
    if (password) {
      user.password = password; // Automatically hashed by User pre-save schema hooks
    }

    await user.save();

    // Reload document to hide password in response
    const updatedUser = await User.findById(user._id);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error.message);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

export default router;
