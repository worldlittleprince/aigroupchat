import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { ConversationHistory } from './history.js';
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

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*'}
});

// Core objects
const history = new ConversationHistory();
const broadcaster = new MessageBroadcaster(io, history, {
  handleBroadcast: (...args) => agentPool.handleBroadcast(...args)
});
const agentPool = new AgentPool({ broadcaster });

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current history to new client
  socket.emit('history', history.all());

  // Receive user messages
  socket.on('user_message', async (payload) => {
    const content = (payload && payload.content) ? String(payload.content) : '';
    const displayName = payload?.displayName || '사용자';
    if (!content.trim()) return;
    await broadcaster.onIncomingMessage({
      senderType: SenderType.USER,
      displayName,
      content
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`AI Colosseum server listening on :${PORT}`);
});
