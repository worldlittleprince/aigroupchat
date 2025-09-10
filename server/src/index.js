import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { RoomManager } from './rooms.js';
import { MessageBroadcaster } from './broadcaster.js';
import { AgentPool } from './agents/index.js';
import { SenderType } from './types.js';

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(new URL('../public', import.meta.url).pathname));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Rooms API is registered after io/rooms are initialized below

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*'}
});

// Core objects
const rooms = new RoomManager();
const broadcaster = new MessageBroadcaster(io, rooms, {
  handleBroadcast: (...args) => agentPool.handleBroadcast(...args)
});
const agentPool = new AgentPool({ broadcaster });

// Rooms API (simple, in-memory)
app.get('/rooms', (_req, res) => {
  res.json({ rooms: rooms.list() });
});

app.post('/rooms', express.json(), (req, res) => {
  const id = String(req.body?.id || '').trim();
  const roomId = id || `room-${Math.random().toString(36).slice(2, 8)}`;
  rooms.ensure(roomId);
  io.emit('rooms_update', rooms.list());
  res.status(201).json({ id: roomId });
});

io.on('connection', (socket) => {
  const roomFromAuth = socket.handshake?.auth?.roomId;
  const roomFromQuery = socket.handshake?.query?.roomId;
  const roomId = String(roomFromAuth || roomFromQuery || 'lobby');
  socket.join(roomId);
  console.log(`Client connected: ${socket.id} joined room: ${roomId}`);
  rooms.join(roomId, socket.id);
  io.emit('rooms_update', rooms.list());

  // Send current history to new client
  socket.emit('history', rooms.history(roomId).all());

  // Receive user messages
  socket.on('user_message', async (payload) => {
    const content = (payload && payload.content) ? String(payload.content) : '';
    const displayName = payload?.displayName || '사용자';
    if (!content.trim()) return;
    await broadcaster.onIncomingMessage({
      roomId,
      senderType: SenderType.USER,
      displayName,
      content
    });
  });

  socket.on('disconnect', () => {
    rooms.leave(roomId, socket.id);
    io.emit('rooms_update', rooms.list());
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`AI Colosseum server listening on :${PORT}`);
});
