import { randomUUID } from 'crypto';
import { SenderType } from './types.js';

export class MessageBroadcaster {
  constructor(io, roomManager, agentPool) {
    this.io = io;
    this.rooms = roomManager;
    this.agentPool = agentPool;
    this._roomsUpdatePending = false;
    this._roomsUpdateTimer = null;
    this._roomsUpdateIntervalMs = parseInt(process.env.ROOMS_UPDATE_THROTTLE_MS || '500', 10);
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
    // update rooms list (global, throttled)
    this._emitRoomsUpdateThrottled();

    // Notify agents about this message + full history
    try {
      await this.agentPool.handleBroadcast(roomId, history.all(), message);
    } catch (err) {
      console.error('AgentPool broadcast error:', err);
    }
  }

  // For agents to submit generated replies
  async submitAgentMessage({ roomId = 'lobby', agentId, displayName, content }) {
    // Enforce hard cap for agent responses (characters)
    const maxChars = parseInt(process.env.AGENT_RESPONSE_MAX_CHARS || '100', 10);
    let safe = String(content || '');
    if (safe.length > maxChars) {
      safe = safe.slice(0, maxChars);
    }
    return this.onIncomingMessage({
      roomId,
      senderType: SenderType.AI,
      agentId,
      displayName,
      content: safe
    });
  }

  emitTypingStart(roomId, payload) {
    this.io.to(roomId).emit('typing_start', payload);
  }

  emitTypingStop(roomId, payload) {
    this.io.to(roomId).emit('typing_stop', payload);
  }

  _emitRoomsUpdateThrottled() {
    const send = () => {
      this._roomsUpdatePending = false;
      this._roomsUpdateTimer = null;
      try {
        this.io.emit('rooms_update', this.rooms.list());
      } catch {}
    };
    if (this._roomsUpdateTimer) {
      this._roomsUpdatePending = true;
      return;
    }
    this._roomsUpdateTimer = setTimeout(send, this._roomsUpdateIntervalMs);
  }
}
