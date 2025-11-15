const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// In-memory rooms
const ROOMS = {}; // roomId -> { users: Map(socketId -> name) }

app.use(express.static(path.join(__dirname, 'public')));

// Home page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// Create room
app.get('/create', (req, res) => {
  const id = crypto.randomBytes(4).toString('hex');
  ROOMS[id] = { users: new Map() };
  res.redirect(`/room/${id}`);
});

// Room page
app.get('/room/:id', (req, res) => {
  const id = req.params.id;
  if (!ROOMS[id]) ROOMS[id] = { users: new Map() };
  res.sendFile(path.join(__dirname, 'public/room.html'));
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

  socket.on('join', ({ room, name }) => {
    if (!room) return;
    socket.join(room);
    ROOMS[room] = ROOMS[room] || { users: new Map() };
    ROOMS[room].users.set(socket.id, name || 'Guest');

    io.to(room).emit('user-list', { users: Array.from(ROOMS[room].users.values()) });
    io.to(room).emit('user-joined', { name: name || 'Guest', usersCount: ROOMS[room].users.size });
  });

  socket.on('leave', ({ room, name }) => {
    socket.leave(room);
    if (ROOMS[room]) {
      ROOMS[room].users.delete(socket.id);
      io.to(room).emit('user-list', { users: Array.from(ROOMS[room].users.values()) });
      io.to(room).emit('user-left', { name: name || 'Guest', usersCount: ROOMS[room].users.size });
    }
  });

  socket.on('chat', (data) => {
    if (!data.room) return;
    io.to(data.room).emit('chat', data);
  });

  socket.on('reaction', (data) => {
    if (!data.room) return;
    io.to(data.room).emit('reaction', data);
  });

  socket.on('media-control', (data) => {
    if (!data.room) return;
    socket.to(data.room).emit('media-control', data);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      if (ROOMS[room]) {
        ROOMS[room].users.delete(socket.id);
        io.to(room).emit('user-list', { users: Array.from(ROOMS[room].users.values()) });
        io.to(room).emit('user-left', { name: ROOMS[room].users.get(socket.id) || 'Guest', usersCount: ROOMS[room].users.size });
      }
    }
  });

  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});