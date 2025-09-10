import { LLMProvider } from './provider.js';

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
    '만약 할 말이 없거나 끼어들 상황이 아니라고 판단되면, 오직 `[NO_RESPONSE]` 라고만 출력해.'
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
  }

  async generate({ persona, history, lastMessage }) {
    if (!this.client) {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    const userContent = buildPrompt(persona, history, lastMessage);
    const resp = await this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      temperature: 0.7,
      system: persona.systemPrompt,
      messages: [
        { role: 'user', content: userContent }
      ]
    });
    const text = (resp?.content?.[0]?.text || '').trim();
    if (!text || text === '[NO_RESPONSE]' || (text.includes('[NO_RESPONSE]') && text.replace('[NO_RESPONSE]', '').trim().length === 0)) {
      return { noResponse: true };
    }
    return { content: text };
  }
}
