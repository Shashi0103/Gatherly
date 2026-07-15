import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema({
  recordingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  meetingId: {
    type: String,
    required: true,
    index: true,
  },
  hostId: {
    type: String,
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  duration: {
    type: Number, // in seconds
    required: true,
  },
  size: {
    type: Number, // in bytes
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Recording = mongoose.model('Recording', recordingSchema);
export default Recording;
