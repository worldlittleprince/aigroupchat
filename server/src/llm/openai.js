import OpenAI from 'openai';
import { LLMProvider } from './provider.js';
import { withTimeout, isNoResponse, truncate } from '../utils.js';

function pickKeyForAgent(agentId) {
  const envKey = process.env[`OPENAI_API_KEY_${agentId.toUpperCase()}`];
  return envKey || process.env.OPENAI_API_KEY;
}

function makeSystemPrompt(persona, history, lastMessage) {
  return [
    persona.systemPrompt,
    '',
    '아래는 현재까지의 그룹 채팅 대화 내용이야.',
    history.map(m => `${m.displayName}: ${m.content}`).join('\n'),
    '',
    '마지막 메시지를 보고, 너의 성격과 역할에 따라 이 대화에 참여하고 싶으면 응답을 생성해. 만약 할 말이 없거나 끼어들 상황이 아니라고 판단되면, 오직 `[NO_RESPONSE]` 라고만 출력해.',
    '응답을 생성하는 경우 100자 이내로 간결하게 작성해.',
    '',
    `마지막 메시지: "${lastMessage?.content ?? ''}"`
  ].join('\n');
}

export class OpenAIProvider extends LLMProvider {
  constructor({ agentId }) {
    super();
    const apiKey = pickKeyForAgent(agentId);
    if (!apiKey) {
      throw new Error('Missing OPENAI_API_KEY for agent ' + agentId);
    }
    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);
  }

  async generate({ persona, history, lastMessage }) {
    const system = makeSystemPrompt(persona, history, lastMessage);
    const call = this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: '너의 응답:' }
      ],
      temperature: 0.7,
      max_tokens: 300
    });
    const resp = await withTimeout(call, this.timeoutMs).catch(() => null);
    if (!resp) return { noResponse: true };
    const text = resp.choices?.[0]?.message?.content?.trim() || '';
    if (isNoResponse(text)) return { noResponse: true };
    return { content: truncate(text, parseInt(process.env.AGENT_RESPONSE_MAX_CHARS || '100', 10)) };
  }
}
