import Message from '../models/Message.js';
import User from '../models/User.js';

// Keep track of active users: socketId -> { userId, roomId }
const activeConnections = new Map();

const configureSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // 1. Join Room
    socket.on('join-room', async ({ roomId, userId }) => {
      try {
        console.log(`👥 User ${userId} joining room ${roomId} via socket ${socket.id}`);
        
        socket.join(roomId);
        activeConnections.set(socket.id, { userId, roomId });

        // Fetch user profiles for other sockets in this room
        const room = io.sockets.adapter.rooms.get(roomId);
        const usersInRoom = [];

        if (room) {
          for (const otherSocketId of room) {
            if (otherSocketId !== socket.id) {
              const conn = activeConnections.get(otherSocketId);
              if (conn) {
                // Fetch basic user info from MongoDB to share with the newcomer
                const userInfo = await User.findOne({ uid: conn.userId });
                usersInRoom.push({
                  socketId: otherSocketId,
                  userId: conn.userId,
                  displayName: userInfo?.displayName || 'Demo User',
                  photoURL: userInfo?.photoURL || ''
                });
              }
            }
          }
        }

        // Fetch joining user's profile to broadcast to existing users
        const joiningUser = await User.findOne({ uid: userId });
        const userProfile = {
          socketId: socket.id,
          userId,
          displayName: joiningUser?.displayName || 'Demo User',
          photoURL: joiningUser?.photoURL || ''
        };

        // Send existing participants list to new user
        socket.emit('all-users', usersInRoom);

        // Broadcast new user join to existing participants
        socket.to(roomId).emit('user-joined', userProfile);

      } catch (err) {
        console.error('Error in join-room socket event:', err.message);
      }
    });

    // 2. Relay SDP Offer
    socket.on('offer', ({ target, sdp }) => {
      console.log(`Relaying SDP Offer from ${socket.id} to ${target}`);
      io.to(target).emit('offer', {
        sender: socket.id,
        sdp
      });
    });

    // 3. Relay SDP Answer
    socket.on('answer', ({ target, sdp }) => {
      console.log(`Relaying SDP Answer from ${socket.id} to ${target}`);
      io.to(target).emit('answer', {
        sender: socket.id,
        sdp
      });
    });

    // 4. Relay ICE Candidate
    socket.on('ice-candidate', ({ target, candidate }) => {
      // console.log(`Relaying ICE Candidate from ${socket.id} to ${target}`);
      io.to(target).emit('ice-candidate', {
        sender: socket.id,
        candidate
      });
    });

    // 5. Chat Messaging
    socket.on('chat-message', async ({ roomId, senderId, message, recipientId }) => {
      try {
        console.log(`💬 Chat message in ${roomId} from ${senderId} to ${recipientId || 'Everyone'}: "${message}"`);
        
        // Persist message to MongoDB
        const newMessage = await Message.create({
          roomId,
          senderId,
          recipientId,
          message,
          timestamp: new Date()
        });

        // Fetch sender's profile
        const sender = await User.findOne({ uid: senderId });

        const messageData = {
          _id: newMessage._id,
          roomId,
          senderId,
          recipientId,
          message,
          timestamp: newMessage.timestamp,
          sender: {
            displayName: sender?.displayName || 'Demo User',
            photoURL: sender?.photoURL || ''
          }
        };

        if (recipientId) {
          // Send privately to the recipient and back to the sender
          let recipientSocketId = null;
          for (const [sId, conn] of activeConnections.entries()) {
            if (conn.userId === recipientId && conn.roomId === roomId) {
              recipientSocketId = sId;
              break;
            }
          }
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('chat-message', messageData);
          }
          // Send back to the sender socket so it's in their chat window too
          socket.emit('chat-message', messageData);
        } else {
          // Broadcast message to everyone in the room
          io.to(roomId).emit('chat-message', messageData);
        }
      } catch (err) {
        console.error('Error handling chat-message socket event:', err.message);
      }
    });

    // 6. Screen Share State Sync
    socket.on('screen-share-start', ({ roomId }) => {
      console.log(`🖥️ Screen share started by ${socket.id} in room ${roomId}`);
      socket.to(roomId).emit('screen-share-start', { socketId: socket.id });
    });

    socket.on('screen-share-stop', ({ roomId }) => {
      console.log(`🖥️ Screen share stopped by ${socket.id} in room ${roomId}`);
      socket.to(roomId).emit('screen-share-stop', { socketId: socket.id });
    });

    // 7. Recording State Sync
    socket.on('recording-start', ({ roomId }) => {
      console.log(`⏺️ Recording started in room ${roomId} by host socket ${socket.id}`);
      socket.to(roomId).emit('recording-start', { hostSocketId: socket.id });
    });

    socket.on('recording-stop', ({ roomId }) => {
      console.log(`⏺️ Recording stopped in room ${roomId} by host socket ${socket.id}`);
      socket.to(roomId).emit('recording-stop');
    });

    // 8. User Global Registration (for real-time dashboard updates)
    socket.on('register-user', ({ userId }) => {
      console.log(`User ${userId} registered socket ${socket.id}`);
      socket.join(`user-${userId}`);
    });

    // 9. Admin Control Relays
    socket.on('admin-mute-user', ({ roomId, targetSocketId }) => {
      console.log(`🛡️ Admin ${socket.id} muting target ${targetSocketId} in room ${roomId}`);
      io.to(targetSocketId).emit('admin-mute');
    });

    socket.on('admin-stop-video', ({ roomId, targetSocketId }) => {
      console.log(`🛡️ Admin ${socket.id} stopping video for target ${targetSocketId} in room ${roomId}`);
      io.to(targetSocketId).emit('admin-stop-video');
    });

    socket.on('admin-kick-user', ({ roomId, targetSocketId }) => {
      console.log(`🛡️ Admin ${socket.id} kicking target ${targetSocketId} in room ${roomId}`);
      io.to(targetSocketId).emit('admin-kick');
    });

    // 10. Explicit Leave Room
    socket.on('leave-room', () => {
      handleDisconnect(socket);
    });

    // 9. Client Disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      handleDisconnect(socket);
    });
  });
};

const handleDisconnect = (socket) => {
  const connection = activeConnections.get(socket.id);
  if (connection) {
    const { roomId, userId } = connection;
    console.log(`👋 User ${userId} is leaving room ${roomId} (socket: ${socket.id})`);
    
    // Notify others in room
    socket.to(roomId).emit('user-left', { socketId: socket.id, userId });
    
    // Remove from room and local mapping
    socket.leave(roomId);
    activeConnections.delete(socket.id);
  }
};

export default configureSockets;
