# Gatherly — Lightweight, Premium SaaS Video Conferences

Gatherly is a high-performance, lightweight, production-ready video conferencing web application built with the MERN stack (`MongoDB`, `Express.js`, `React`, `Node.js`) and native `WebRTC` (mesh topology up to 6 participants). It features real-time Socket.IO signaling, meeting scheduling, in-meeting persistent chat, a canvas-based video/audio mixer recorder, and local MP4 conversion using FFmpeg WebAssembly.

Authentication is handled locally using **JSON Web Tokens (JWT)** and **Bcrypt** password hashing, storing credentials directly in MongoDB.

Designed with a premium Green + Blue SaaS aesthetic, Gatherly employs subtle glassmorphism, responsive components, and clean UI animations (via `Framer Motion`).

---

## Technical Features

1. **Authentication (JWT & MongoDB)**
   - Custom self-contained JSON Web Token authentication system.
   - Credentials securely stored and verified using `bcryptjs` password hashing.
   - Synchronized MongoDB user profiles (`displayName`, `email`, `password`, `photoURL`, `createdAt`).
   - Custom session protection middleware (`protect`) verifying Bearer tokens.

2. **WebRTC Video Calling**
   - Pure Peer-to-Peer connection management (`RTCPeerConnection`) using STUN.
   - Priority munging for **VP9 Video Codec** and **Opus Audio Codec**.
   - Mute/Unmute toggle, video camera toggle, and speaking voice-level borders.

3. **Secure WebRTC Data Channels**
   - Private peer data synchronization.
   - **AES-256 GCM Encryption** using the browser WebCrypto API.

4. **Screen Sharing**
   - Native browser display capture via `getDisplayMedia()`.
   - Real-time video track swapping on all peer connections.

5. **In-Meeting Chat & Persistence**
   - Real-time chat synchronized using Socket.IO.
   - Clickable file link formatting.
   - Historical message logging loaded via MongoDB.

6. **Canvas & Web Audio API Meeting Recorder**
   - Dynamic HTML5 Canvas drawing loop matching active participants grid.
   - Multi-party audio track mixing using `AudioContext`.
   - In-browser local WebM-to-MP4 FFmpeg.wasm conversion.
   - Automatic background download and metadata logging.

---

## Folder Structure

```
Gatherly/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/      # UI components (Sidebar, ScheduleModal, ChatDrawer)
│   │   ├── context/         # AuthContext
│   │   ├── hooks/           # useWebRTC, useRecorder
│   │   ├── pages/           # Home, Login, Dashboard, Recordings, MeetingRoom
│   │   ├── utils/           # sdp (codec overrides), crypto (AES-256-GCM)
│   │   ├── App.jsx          # Route declarations
│   │   ├── index.css        # Tailwind v4 theme + Glass styles
│   │   └── main.jsx
│   ├── package.json
│   ├── postcss.config.js
│   └── vite.config.js
├── server/
│   ├── config/              # Db connection settings
│   ├── middleware/          # authMiddleware (custom JWT token decoder)
│   ├── models/              # User, Meeting, Message, Recording schemas
│   ├── routes/              # Express API endpoints (register, login, me)
│   ├── sockets/             # Socket.IO peer mesh signaling logic
│   ├── server.js            # Node Entrypoint
│   └── package.json
├── .env.example
├── seed.js                  # Database seeder
└── README.md
```

---

## Quick Start & Installation

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB](https://www.mongodb.com/) running locally or an Atlas cluster connection string.

### 2. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/gatherly
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
```

Create a `.env` file in the `client/` directory:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Install Dependencies & Seed Database

Open a terminal in the root directory and run:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Seed the database (from the project root)
cd ..
node seed.js
```
*(This seeds 3 demo users: `alex@gatherly.app`, `jordan@gatherly.app`, and `taylor@gatherly.app` with the password `password123`).*

### 4. Start the Application

Start the backend API server:
```bash
cd server
npm run dev
```

Start the Vite dev server in another terminal window:
```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in multiple browser tabs, login as `jordan@gatherly.app` / `password123` (or register a new user), create/schedule meetings, and begin testing WebRTC calling, screen sharing, chat, and local recording!
