import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import meetingRoutes from './routes/meetings.js';
import chatRoutes from './routes/chat.js';
import recordingRoutes from './routes/recordings.js';
import configureSockets from './sockets/signaling.js';

dotenv.config();

// Trigger clean redeploy on Render
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});
app.set('io', io);

// Middleware
// Disable contentSecurityPolicy to prevent blocking Vite hot-reloader and inline media
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/recordings', recordingRoutes);

// Serve static assets in production if client build exists
const clientBuildPath = path.join(__dirname, '../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientBuildPath)) {
  // Set static folder
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(clientBuildPath, 'index.html'));
  });
} else {
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({ message: 'Gatherly API is running...', env: process.env.NODE_ENV });
  });
}

// Bind Socket.IO Handlers
configureSockets(io);

// Server Listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
