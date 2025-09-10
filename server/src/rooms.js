import { ConversationHistory } from './history.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { history, participants, lastActivity, config }
  }

  _defaultConfig() {
    return {
      agentEnabled: { alpha: true, muse: true, leo: true },
      responseProbability: 1.0,
    };
  }

  ensure(roomId) {
    const id = String(roomId || 'lobby');
    if (!this.rooms.has(id)) {
      this.rooms.set(id, {
        history: new ConversationHistory(),
        participants: new Set(),
        lastActivity: Date.now(),
        config: this._defaultConfig()
      });
    }
    return this.rooms.get(id);
  }

  history(roomId) {
    return this.ensure(roomId).history;
  }

  touch(roomId) {
    const r = this.ensure(roomId);
    r.lastActivity = Date.now();
  }

  join(roomId, socketId) {
    const r = this.ensure(roomId);
    r.participants.add(socketId);
  }

  leave(roomId, socketId) {
    const r = this.ensure(roomId);
    r.participants.delete(socketId);
  }

  getConfig(roomId) {
    return { ...this.ensure(roomId).config };
  }

  updateConfig(roomId, partial) {
    const r = this.ensure(roomId);
    r.config = {
      ...r.config,
      ...partial,
      // deep-merge for agentEnabled if provided
      agentEnabled: partial?.agentEnabled ? { ...r.config.agentEnabled, ...partial.agentEnabled } : r.config.agentEnabled
    };
    return this.getConfig(roomId);
  }

  list() {
    const arr = [];
    for (const [id, r] of this.rooms.entries()) {
      arr.push({
        id,
        participants: r.participants.size,
        messages: r.history.messages.length,
        lastActivity: r.lastActivity
      });
    }
    arr.sort((a, b) => b.lastActivity - a.lastActivity);
    return arr;
  }
}
