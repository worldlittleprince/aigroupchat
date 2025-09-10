import { Agent } from './agent.js';
import { personas } from './personas.js';
import { MockProvider } from '../llm/mock.js';
import { OpenAIProvider } from '../llm/openai.js';
import { GeminiProvider } from '../llm/gemini.js';
import { AnthropicProvider } from '../llm/anthropic.js';

export class AgentPool {
  constructor({ broadcaster, providerFactory }) {
    this.broadcaster = broadcaster;
    const envProvider = (process.env.LLM_PROVIDER || 'mock').toLowerCase();
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
    this.agents = personas.map(p => new Agent({
      id: p.id,
      displayName: p.displayName,
      systemPrompt: p.systemPrompt,
      provider: this.providerFactory(p),
      broadcaster: this.broadcaster
    }));
  }

  async handleBroadcast(history, lastMessage) {
    // Fan out concurrently
    await Promise.allSettled(this.agents.map(a => a.onBroadcast(history, lastMessage)));
  }
}
