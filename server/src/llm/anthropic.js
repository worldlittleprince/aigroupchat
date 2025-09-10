import { LLMProvider } from './provider.js';
import { withTimeout, isNoResponse, truncate } from '../utils.js';

function pickKeyForAgent(agentId) {
  const upper = agentId.toUpperCase();
  return (
    process.env[`ANTHROPIC_API_KEY_${upper}`] ||
    process.env.ANTHROPIC_API_KEY
  );
}

function buildPrompt(persona, history, lastMessage) {
  const transcript = history.map(m => `${m.displayName}: ${m.content}`).join('\n');
  const instruction = [
    '마지막 메시지를 보고, 너의 성격과 역할에 따라 이 대화에 참여하고 싶으면 응답을 생성해.',
    '만약 할 말이 없거나 끼어들 상황이 아니라고 판단되면, 오직 `[NO_RESPONSE]` 라고만 출력해.',
    '응답을 생성하는 경우 100자 이내로 간결하게 작성해.'
  ].join(' ');
  return [
    '아래는 현재까지의 그룹 채팅 대화 내용이야.',
    transcript,
    '',
    instruction,
    '',
    `마지막 메시지: "${lastMessage?.content ?? ''}"`,
    '',
    '너의 응답:'
  ].join('\n');
}

export class AnthropicProvider extends LLMProvider {
  constructor({ agentId }) {
    super();
    const apiKey = pickKeyForAgent(agentId);
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY for agent ' + agentId);
    this.apiKey = apiKey;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620';
    this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);
  }

  async generate({ persona, history, lastMessage }) {
    if (!this.client) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    const userContent = buildPrompt(persona, history, lastMessage);
    const call = this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      temperature: 0.7,
      system: persona.systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ]
    });
    const resp = await withTimeout(call, this.timeoutMs).catch(() => null);
    if (!resp) return { noResponse: true };
    const text = (resp?.content?.[0]?.text || '').trim();
    if (isNoResponse(text)) return { noResponse: true };
    return { content: truncate(text, parseInt(process.env.AGENT_RESPONSE_MAX_CHARS || '100', 10)) };
  }
}
