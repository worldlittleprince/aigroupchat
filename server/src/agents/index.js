import { Agent } from './agent.js';
import { personas } from './personas.js';
import { MockProvider } from '../llm/mock.js';
import { OpenAIProvider } from '../llm/openai.js';
import { GeminiProvider } from '../llm/gemini.js';
import { AnthropicProvider } from '../llm/anthropic.js';

export class AgentPool {
  constructor({ broadcaster, rooms, providerFactory }) {
    this.broadcaster = broadcaster;
    this.rooms = rooms;
    const envProvider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
    const enabledList = (process.env.AGENTS_ENABLED || '').split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    const disabledList = (process.env.AGENTS_DISABLED || '').split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    this.providerFactory = providerFactory || ((persona) => {
      if (envProvider === 'openai') {
        try {
          return new OpenAIProvider({ agentId: persona.id });
        } catch (e) {
          console.warn('OpenAI provider unavailable, falling back to mock:', e.message);
        }
      }
      if (envProvider === 'gemini') {
        try {
          return new GeminiProvider({ agentId: persona.id });
        } catch (e) {
          console.warn('Gemini provider unavailable, falling back to mock:', e.message);
        }
      }
      if (envProvider === 'anthropic' || envProvider === 'claude') {
        try {
          return new AnthropicProvider({ agentId: persona.id });
        } catch (e) {
          console.warn('Anthropic provider unavailable, falling back to mock:', e.message);
        }
      }
      return new MockProvider();
    });
    let selected = personas;
    if (enabledList.length) {
      const aSet = new Set(enabledList);
      selected = personas.filter(p => aSet.has(p.id));
    }
    if (disabledList.length) {
      const dSet = new Set(disabledList);
      selected = selected.filter(p => !dSet.has(p.id));
    }
    this.agents = selected.map(p => new Agent({
      id: p.id,
      displayName: p.displayName,
      systemPrompt: p.systemPrompt,
      provider: this.providerFactory(p),
      broadcaster: this.broadcaster
    }));
  }

  async handleBroadcast(roomId, history, lastMessage) {
    const cfg = this.rooms?.getConfig(roomId) || { agentEnabled: {}, responseProbability: 1.0 };
    const enabled = cfg.agentEnabled || {};
    const prob = typeof cfg.responseProbability === 'number' ? cfg.responseProbability : 1.0;
    const work = [];
    for (const a of this.agents) {
      if (enabled[a.id] === false) continue;
      work.push(a.onBroadcast(roomId, history, lastMessage, { responseProbability: prob }));
    }
    await Promise.allSettled(work);
  }
}
