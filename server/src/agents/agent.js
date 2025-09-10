export class Agent {
  constructor({ id, displayName, systemPrompt, provider, broadcaster }) {
    this.id = id;
    this.displayName = displayName;
    this.systemPrompt = systemPrompt;
    this.provider = provider;
    this.broadcaster = broadcaster;
    this.cooldowns = new Map(); // messageId -> true to prevent duplicate replies
  }

  async onBroadcast(roomId, history, lastMessage) {
    // Don't respond to own messages
    if (lastMessage.senderType === 'ai' && lastMessage.agentId === this.id) return;
    if (this.cooldowns.get(lastMessage.id)) return;

    // Emit typing start immediately
    this.broadcaster.emitTypingStart(roomId, { agentId: this.id, displayName: this.displayName });

    try {
      const result = await this.provider.generate({ persona: this, history, lastMessage });
      if (result?.noResponse || !result?.content) {
        this.broadcaster.emitTypingStop(roomId, { agentId: this.id });
        this.cooldowns.set(lastMessage.id, true);
        return;
      }
      await this.broadcaster.submitAgentMessage({
        roomId,
        agentId: this.id,
        displayName: this.displayName,
        content: result.content
      });
    } catch (e) {
      console.error(`[Agent:${this.id}] generation error`, e);
    } finally {
      this.broadcaster.emitTypingStop(roomId, { agentId: this.id });
      this.cooldowns.set(lastMessage.id, true);
    }
  }
}
