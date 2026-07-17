import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  hostId: {
    type: String,
    required: true,
    index: true,
  },
  participants: [{
    type: String, // Array of User UIDs
  }],
  meetingLink: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  scheduledAt: {
    type: Date,
    default: Date.now,
  },
  duration: {
    type: Number, // in minutes
    required: true,
    default: 30,
  },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'past', 'cancelled'],
    default: 'upcoming',
  },
  invitees: [{
    type: String,
    lowercase: true,
    trim: true,
  }],
}, {
  timestamps: true,
});

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
