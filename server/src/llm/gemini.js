import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider } from './provider.js';
import { withTimeout, isNoResponse, truncate } from '../utils.js';

function pickKeyForAgent(agentId) {
  const upper = agentId.toUpperCase();
  return (
    process.env[`GEMINI_API_KEY_${upper}`] ||
    process.env[`GOOGLE_API_KEY_${upper}`] ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

function buildPrompt(persona, history, lastMessage) {
  const header = persona.systemPrompt;
  const transcript = history.map(m => `${m.displayName}: ${m.content}`).join('\n');
  const instruction = [
    '마지막 메시지를 보고, 너의 성격과 역할에 따라 이 대화에 참여하고 싶으면 응답을 생성해.',
    '만약 할 말이 없거나 끼어들 상황이 아니라고 판단되면, 오직 `[NO_RESPONSE]` 라고만 출력해.',
    '응답을 생성하는 경우 100자 이내로 간결하게 작성해.'
  ].join(' ');
  return [
    header,
    '',
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

export class GeminiProvider extends LLMProvider {
  constructor({ agentId }) {
    super();
    const apiKey = pickKeyForAgent(agentId);
    if (!apiKey) throw new Error('Missing GEMINI/GOOGLE API key for agent ' + agentId);
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
    this.timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10);
  }

  async generate({ persona, history, lastMessage }) {
    const prompt = buildPrompt(persona, history, lastMessage);
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await withTimeout(model.generateContent(prompt), this.timeoutMs).catch(() => null);
    if (!result) return { noResponse: true };
    const response = await result.response;
    const text = (response.text() || '').trim();
    if (isNoResponse(text)) return { noResponse: true };
    return { content: truncate(text, parseInt(process.env.AGENT_RESPONSE_MAX_CHARS || '100', 10)) };
  }
}
