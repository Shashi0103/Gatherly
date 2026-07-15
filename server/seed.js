import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Meeting from './models/Meeting.js';
import Message from './models/Message.js';
import Recording from './models/Recording.js';

dotenv.config();

// Hash password once for all demo users
const demoPasswordHash = bcrypt.hashSync('password123', 10);

const usersData = [
  {
    uid: 'mock_alex',
    displayName: 'Alex Rivera',
    email: 'alex@gatherly.app',
    password: demoPasswordHash,
    photoURL: '',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    uid: 'mock_jordan',
    displayName: 'Jordan Vance',
    email: 'jordan@gatherly.app',
    password: demoPasswordHash,
    photoURL: '',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
  },
  {
    uid: 'mock_taylor',
    displayName: 'Taylor Smith',
    email: 'taylor@gatherly.app',
    password: demoPasswordHash,
    photoURL: '',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
];

const meetingsData = (hostUid) => [
  {
    title: 'Gatherly Design System Review',
    hostId: hostUid,
    participants: [hostUid, 'mock_alex', 'mock_jordan'],
    meetingLink: 'uxd-syst-rev',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    duration: 45,
    status: 'upcoming',
  },
  {
    title: 'Marketing Weekly Alignment',
    hostId: hostUid,
    participants: [hostUid, 'mock_taylor'],
    meetingLink: 'mkt-week-aln',
    scheduledAt: new Date(Date.now() + 4 * 3600 * 1000),
    duration: 30,
    status: 'upcoming',
  },
  {
    title: 'Gatherly Core Architecture Sync',
    hostId: 'mock_alex',
    participants: ['mock_alex', hostUid, 'mock_jordan', 'mock_taylor'],
    meetingLink: 'rtc-core-syn',
    scheduledAt: new Date(Date.now() - 24 * 3600 * 1000),
    duration: 60,
    status: 'past',
  },
  {
    title: 'Sprint 12 Planning & Retro',
    hostId: 'mock_jordan',
    participants: ['mock_jordan', hostUid],
    meetingLink: 'spt-plan-ret',
    scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    duration: 90,
    status: 'past',
  },
];

const seedDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not defined in environment variables.');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('💚 Connected successfully to DB.');

    // Clear existing data
    console.log('🧹 Clearing existing collections...');
    await User.deleteMany({});
    await Meeting.deleteMany({});
    await Message.deleteMany({});
    await Recording.deleteMany({});
    console.log('🧹 Cleaned database tables.');

    // Seed Users
    console.log('🌱 Seeding Users...');
    const createdUsers = await User.insertMany(usersData);
    console.log(`✅ Seeded ${createdUsers.length} users with password: password123`);

    // Use Jordan as default host context reference for demo schedules
    const hostUid = 'mock_jordan';
    
    // Seed Meetings
    console.log('🌱 Seeding Meetings...');
    const createdMeetings = await Meeting.insertMany(meetingsData(hostUid));
    console.log(`✅ Seeded ${createdMeetings.length} meetings.`);

    // Seed a couple of historical messages to verify chat logs
    console.log('🌱 Seeding chat history...');
    await Message.create([
      {
        roomId: 'rtc-core-syn',
        senderId: 'mock_alex',
        message: 'Hello everyone! Let us review the WebRTC canvas recording latency today.',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000 + 5 * 60000),
      },
      {
        roomId: 'rtc-core-syn',
        senderId: 'mock_jordan',
        message: 'Sounds great. I have verified that client-side audio mixing is working properly.',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000 + 6 * 60000),
      },
      {
        roomId: 'rtc-core-syn',
        senderId: 'mock_alex',
        message: 'Awesome. I will upload the design documents link: https://gatherly.app/designs.zip',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000 + 8 * 60000),
      },
    ]);
    console.log('✅ Seeded message history.');

    console.log('🎉 Database seeding completed successfully.');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed database:', error.message);
    process.exit(1);
  }
};

seedDB();
