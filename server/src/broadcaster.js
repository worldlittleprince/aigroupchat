import { randomUUID } from 'crypto';
import { SenderType } from './types.js';

export class MessageBroadcaster {
  constructor(io, history, agentPool) {
    this.io = io;
    this.history = history;
    this.agentPool = agentPool;
  }

  // Broadcast a new message to clients and trigger agents
  async onIncomingMessage({ senderType, agentId, displayName, content }) {
    const message = {
      id: randomUUID(),
      senderType,
      agentId,
      displayName,
      content,
      ts: Date.now()
    };
    this.history.add(message);
    this.io.emit('message', message);

    // Notify agents about this message + full history
    try {
      await this.agentPool.handleBroadcast(this.history.all(), message);
    } catch (err) {
      console.error('AgentPool broadcast error:', err);
    }
  }

  // For agents to submit generated replies
  async submitAgentMessage({ agentId, displayName, content }) {
    return this.onIncomingMessage({
      senderType: SenderType.AI,
      agentId,
      displayName,
      content
    });
  }
}

