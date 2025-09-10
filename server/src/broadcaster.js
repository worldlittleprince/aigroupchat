import { randomUUID } from 'crypto';
import { SenderType } from './types.js';

export class MessageBroadcaster {
  constructor(io, roomManager, agentPool) {
    this.io = io;
    this.rooms = roomManager;
    this.agentPool = agentPool;
  }

  // Broadcast a new message to clients and trigger agents
  async onIncomingMessage({ roomId = 'lobby', senderType, agentId, displayName, content }) {
    const message = {
      id: randomUUID(),
      senderType,
      agentId,
      displayName,
      content,
      ts: Date.now()
    };
    const history = this.rooms.history(roomId);
    history.add(message);
    this.rooms.touch(roomId);
    this.io.to(roomId).emit('message', message);
    // update rooms list (global)
    this.io.emit('rooms_update', this.rooms.list());

    // Notify agents about this message + full history
    try {
      await this.agentPool.handleBroadcast(roomId, history.all(), message);
    } catch (err) {
      console.error('AgentPool broadcast error:', err);
    }
  }

  // For agents to submit generated replies
  async submitAgentMessage({ roomId = 'lobby', agentId, displayName, content }) {
    return this.onIncomingMessage({
      roomId,
      senderType: SenderType.AI,
      agentId,
      displayName,
      content
    });
  }

  emitTypingStart(roomId, payload) {
    this.io.to(roomId).emit('typing_start', payload);
  }

  emitTypingStop(roomId, payload) {
    this.io.to(roomId).emit('typing_stop', payload);
  }
}
