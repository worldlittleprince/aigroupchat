import { LLMProvider } from './provider.js';

const POSITIVE_KEYWORDS = [
  '주말', '여행', '액티비티', '전시', '추천', '놀', '휴식', '공원', '카페', '산책', '영화'
];

function shouldRespond(personaId, lastContent) {
  const text = (lastContent || '').toLowerCase();
  const hasPositive = POSITIVE_KEYWORDS.some(k => text.includes(k));

  // Simple heuristic: Leo responds more on action topics; Muse on art; Alpha on planning.
  if (personaId === 'leo') return hasPositive || /가보|하자|하니|어때|어딜|뭐하/.test(text);
  if (personaId === 'muse') return hasPositive || /전시|예술|음악|영감|감성/.test(text);
  if (personaId === 'alpha') return /계획|비용|비싸|효율|분석|장단점|추천|일정|예산|항공|가격/.test(text) || hasPositive;
  return Math.random() > 0.6;
}

function craftReply(persona, history) {
  const last = history[history.length - 1];
  const base = last?.content || '';
  const id = persona.id;
  if (id === 'alpha') {
    return `아이디어 3가지를 비교해봤어. 1) 야외 피크닉: 비용 낮고 접근성 좋아. 2) 실내 전시 관람: 날씨 영향 적고 영감 상승. 3) 액티비티(클라이밍 등): 비용 중간, 체력 소모 큼. 예산과 이동 시간을 기준으로 선택해보자.`;
  }
  if (id === 'muse') {
    return `햇살이 비치는 오후, 작은 전시관에서 시작해보는 건 어때? 골목의 향을 맡으며 걷다가, 분위기 좋은 카페에서 스케치 한 장. 그 하루가 오래 남을 거야.`;
  }
  if (id === 'leo') {
    return `좋아! 그냥 나가서 먼저 몸을 풀자. 한강 자전거 → 클라이밍 체험 → 야시장 간식 코스, 어때? 즉흥이 최고의 계획이지!`;
  }
  return `흥미롭네! 그 얘기 조금만 더 해줘. 함께 아이디어를 던져볼게.`;
}

export class MockProvider extends LLMProvider {
  async generate({ persona, history, lastMessage }) {
    // Simulate model latency
    const latency = 500 + Math.floor(Math.random() * 1200);
    await new Promise(r => setTimeout(r, latency));

    const willRespond = shouldRespond(persona.id, lastMessage?.content || '');
    if (!willRespond) {
      return { noResponse: true };
    }
    const content = craftReply(persona, history);
    const maxChars = parseInt(process.env.AGENT_RESPONSE_MAX_CHARS || '100', 10);
    return { content: content.slice(0, maxChars) };
  }
}
