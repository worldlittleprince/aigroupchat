import { ConversationHistory } from './history.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> { history: ConversationHistory, participants: Set<string>, lastActivity: number }
  }

  ensure(roomId) {
    const id = String(roomId || 'lobby');
    if (!this.rooms.has(id)) {
      this.rooms.set(id, {
        history: new ConversationHistory(),
        participants: new Set(),
        lastActivity: Date.now()
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
