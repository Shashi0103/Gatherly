import express from 'express';
import { protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const router = express.Router();

// @desc    Get room messages
// @route   GET /api/chat/:roomId
// @access  Private
router.get('/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Fetch recent messages for room
    const messages = await Message.find({ roomId })
      .sort({ timestamp: 1 })
      .limit(100); // Limit to last 100 messages to prevent excessive load

    // Fetch user details for all senders in these messages
    const senderIds = [...new Set(messages.map(msg => msg.senderId))];
    const senders = await User.find({ uid: { $in: senderIds } });
    
    // Create a map for quick lookup
    const senderMap = {};
    senders.forEach(sender => {
      senderMap[sender.uid] = {
        displayName: sender.displayName,
        photoURL: sender.photoURL,
        email: sender.email
      };
    });

    // Attach sender info to messages
    const populatedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      msgObj.sender = senderMap[msg.senderId] || {
        displayName: 'Unknown User',
        photoURL: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Unknown'
      };
      return msgObj;
    });

    res.status(200).json(populatedMessages);
  } catch (error) {
    console.error('Error fetching chat messages:', error.message);
    res.status(500).json({ message: 'Server error fetching chat history' });
  }
});

export default router;
