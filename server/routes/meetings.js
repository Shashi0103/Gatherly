import express from 'express';
import { protect } from '../middleware/auth.js';
import Meeting from '../models/Meeting.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to generate unique 3-4-3 format meeting links (e.g., abc-defg-hij)
const generateMeetingLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const p1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const p3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${p1}-${p2}-${p3}`;
};

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { title, scheduledAt, duration, invitees } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Meeting title is required' });
    }

    let meetingLink = generateMeetingLink();
    // Ensure uniqueness
    let linkExists = await Meeting.findOne({ meetingLink });
    while (linkExists) {
      meetingLink = generateMeetingLink();
      linkExists = await Meeting.findOne({ meetingLink });
    }

    // Initialize participants list with the host
    const participants = [req.user.uid];
    if (invitees && Array.isArray(invitees) && invitees.length > 0) {
      const cleanEmails = invitees.map(email => email.trim().toLowerCase());
      const invitedUsers = await User.find({ email: { $in: cleanEmails } });
      invitedUsers.forEach(user => {
        if (!participants.includes(user.uid)) {
          participants.push(user.uid);
        }
      });
    }

    const meeting = await Meeting.create({
      title,
      hostId: req.user.uid,
      meetingLink,
      scheduledAt: scheduledAt || new Date(),
      duration: duration || 30,
      status: 'upcoming',
      participants,
    });

    // Notify participants in real-time
    const io = req.app.get('io');
    if (io) {
      participants.forEach((pId) => {
        io.to(`user-${pId}`).emit('meetings-updated');
      });
    }

    res.status(201).json(meeting);
  } catch (error) {
    console.error('Error creating meeting:', error.message);
    res.status(500).json({ message: 'Server error creating meeting' });
  }
});

// @desc    Get all meetings for the logged-in user (upcoming, ongoing, past)
// @route   GET /api/meetings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.uid;
    const meetings = await Meeting.find({
      $or: [
        { hostId: userId },
        { participants: userId }
      ]
    }).sort({ scheduledAt: -1 });

    res.status(200).json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error.message);
    res.status(500).json({ message: 'Server error fetching meetings' });
  }
});

// @desc    Get a single meeting by link
// @route   GET /api/meetings/link/:link
// @access  Private
router.get('/link/:link', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingLink: req.params.link });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Auto-end instant meetings after 1.5 hours (90 minutes)
    const isInstant = meeting.title?.startsWith('Instant Meeting');
    if (isInstant) {
      const elapsedMs = Date.now() - new Date(meeting.scheduledAt).getTime();
      const elapsedMinutes = elapsedMs / (1000 * 60);
      if (elapsedMinutes >= 90) {
        meeting.status = 'past';
        await meeting.save();
        return res.status(403).json({ message: 'This instant meeting room has expired (maximum limit 1.5 hours).' });
      }
    }
    
    // Add user to participants if they are not already there
    if (!meeting.participants.includes(req.user.uid)) {
      meeting.participants.push(req.user.uid);
      await meeting.save();
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error('Error fetching meeting by link:', error.message);
    res.status(500).json({ message: 'Server error fetching meeting' });
  }
});

// @desc    Update a meeting
// @route   PATCH /api/meetings/:id
// @access  Private
router.patch('/:id', protect, async (req, res) => {
  try {
    const { title, scheduledAt, duration, status } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only host can modify meeting details
    if (meeting.hostId !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to modify this meeting' });
    }

    if (title !== undefined) meeting.title = title;
    if (scheduledAt !== undefined) meeting.scheduledAt = scheduledAt;
    if (duration !== undefined) meeting.duration = duration;
    if (status !== undefined) meeting.status = status;

    await meeting.save();
    res.status(200).json(meeting);
  } catch (error) {
    console.error('Error updating meeting:', error.message);
    res.status(500).json({ message: 'Server error updating meeting' });
  }
});

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Only host can delete meeting
    if (meeting.hostId !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to delete this meeting' });
    }

    const participants = meeting.participants || [];

    await Meeting.deleteOne({ _id: req.params.id });

    // Notify participants in real-time
    const io = req.app.get('io');
    if (io) {
      participants.forEach((pId) => {
        io.to(`user-${pId}`).emit('meetings-updated');
      });
    }

    res.status(200).json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    console.error('Error deleting meeting:', error.message);
    res.status(500).json({ message: 'Server error deleting meeting' });
  }
});

export default router;
