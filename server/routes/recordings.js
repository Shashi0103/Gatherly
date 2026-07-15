import express from 'express';
import { protect } from '../middleware/auth.js';
import Recording from '../models/Recording.js';
import Meeting from '../models/Meeting.js';

const router = express.Router();

// @desc    Store new recording metadata
// @route   POST /api/recordings
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { recordingId, meetingId, fileName, duration, size } = req.body;

    if (!recordingId || !meetingId || !fileName || duration === undefined || size === undefined) {
      return res.status(400).json({ message: 'All metadata fields are required' });
    }

    const recording = await Recording.create({
      recordingId,
      meetingId,
      hostId: req.user.uid,
      fileName,
      duration,
      size,
      createdAt: new Date(),
    });

    res.status(201).json(recording);
  } catch (error) {
    console.error('Error saving recording metadata:', error.message);
    res.status(500).json({ message: 'Server error saving recording metadata' });
  }
});

// @desc    Get all recordings for the logged-in user
// @route   GET /api/recordings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.uid;
    const recordings = await Recording.find({ hostId: userId }).sort({ createdAt: -1 });

    // Join with Meeting info to get details like Meeting Title
    const meetingIds = [...new Set(recordings.map(rec => rec.meetingId))];
    const meetings = await Meeting.find({ meetingLink: { $in: meetingIds } });
    
    const meetingMap = {};
    meetings.forEach(meet => {
      meetingMap[meet.meetingLink] = meet.title;
    });

    const populatedRecordings = recordings.map(rec => {
      const recObj = rec.toObject();
      recObj.meetingTitle = meetingMap[rec.meetingId] || 'Gatherly Meeting';
      return recObj;
    });

    res.status(200).json(populatedRecordings);
  } catch (error) {
    console.error('Error fetching recordings:', error.message);
    res.status(500).json({ message: 'Server error fetching recordings' });
  }
});

// @desc    Delete recording metadata
// @route   DELETE /api/recordings/:recordingId
// @access  Private
router.delete('/:recordingId', protect, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const recording = await Recording.findOne({ recordingId });

    if (!recording) {
      return res.status(404).json({ message: 'Recording metadata not found' });
    }

    // Only the host who created the recording metadata can delete it
    if (recording.hostId !== req.user.uid) {
      return res.status(403).json({ message: 'Not authorized to delete this recording metadata' });
    }

    await Recording.deleteOne({ recordingId });
    res.status(200).json({ message: 'Recording metadata deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording metadata:', error.message);
    res.status(500).json({ message: 'Server error deleting recording metadata' });
  }
});

export default router;
