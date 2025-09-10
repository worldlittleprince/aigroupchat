export class Agent {
  constructor({ id, displayName, systemPrompt, provider, broadcaster }) {
    this.id = id;
    this.displayName = displayName;
    this.systemPrompt = systemPrompt;
    this.provider = provider;
    this.broadcaster = broadcaster;
    this.cooldowns = new Map(); // messageId -> true to prevent duplicate replies
    this.lastReplyAtPerRoom = new Map(); // roomId -> ts
    this.minIntervalMs = parseInt(process.env.AGENT_MIN_INTERVAL_MS || '1500', 10);
    this.maxCooldownEntries = parseInt(process.env.AGENT_COOLDOWN_MAX || '1000', 10);
  }

  _cleanupCooldowns() {
    const excess = this.cooldowns.size - this.maxCooldownEntries;
    if (excess > 0) {
      let i = 0;
      for (const key of this.cooldowns.keys()) {
        this.cooldowns.delete(key);
        i++;
        if (i >= excess) break;
      }
    }
  }

  async onBroadcast(roomId, history, lastMessage, { responseProbability = 1.0 } = {}) {
    // Don't respond to own messages
    if (lastMessage.senderType === 'ai' && lastMessage.agentId === this.id) return;
    if (this.cooldowns.get(lastMessage.id)) return;

    // Rate limit: per-room minimum interval between this agent's replies
    const now = Date.now();
    const last = this.lastReplyAtPerRoom.get(roomId) || 0;
    if (now - last < this.minIntervalMs) return;

    // Probability gating (P1): reduce or increase response chance globally per room
    if (responseProbability < 1.0) {
      if (Math.random() > responseProbability) return;
    }

    // Emit typing start immediately
    this.broadcaster.emitTypingStart(roomId, { agentId: this.id, displayName: this.displayName });

    try {
      const result = await this.provider.generate({ persona: this, history, lastMessage });
      if (result?.noResponse || !result?.content) {
        this.broadcaster.emitTypingStop(roomId, { agentId: this.id });
        this.cooldowns.set(lastMessage.id, true);
        this._cleanupCooldowns();
        return;
      }
      await this.broadcaster.submitAgentMessage({
        roomId,
        agentId: this.id,
        displayName: this.displayName,
        content: result.content
      });
      this.lastReplyAtPerRoom.set(roomId, Date.now());
    } catch (e) {
      console.error(`[Agent:${this.id}] generation error`, e);
    } finally {
      this.broadcaster.emitTypingStop(roomId, { agentId: this.id });
      this.cooldowns.set(lastMessage.id, true);
      this._cleanupCooldowns();
    }
  }
}
