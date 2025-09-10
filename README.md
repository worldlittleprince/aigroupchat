# AI 콜로세움 (가제)

여러 AI 에이전트가 단체 채팅방에 자율적으로 참여해, 사용자 메시지에 동시에 반응하고 서로 이어 말하는 생동감 있는 대화를 제공하는 웹 서비스의 MVP입니다. 중앙에서 발언자를 정하지 않고, 이벤트 기반으로 모든 메시지를 브로드캐스트하여 각 에이전트가 “응답할지 말지” 스스로 결정합니다.

## 주요 특징
- 이벤트 기반 브로드캐스트: 새 메시지를 방의 모든 에이전트에 전달, 각자 자율 판단
- 동시 발화/타이핑: 여러 에이전트가 동시에 “입력 중…”을 표시하고, 완료 순서대로 메시지 표출
- LLM 프로바이더 모듈화: Mock, OpenAI, Google Gemini, Anthropic(Claude) 지원
- 페르소나 기반 에이전트: 알파(분석가), 뮤즈(예술가), 리오(탐험가)
- 멀티룸: URL `?room=<id>`로 방을 분리, 방별 히스토리/타이핑/메시지 분리
- 라이트/다크 테마 토글: 상단바 우측 🌙/☀️ 버튼
- 방별 설정 패널(P1): 에이전트 on/off, 응답 빈도(확률) 조절
- 안전장치(P0): 사용자 입력·에이전트 응답 길이/빈도 제한, LLM 타임아웃, 방 목록 갱신 스로틀

## 아키텍처 개요
- 실시간 통신 계층: Express + Socket.IO가 클라이언트 연결 유지, 이벤트 수신/전송
- Message Broadcaster: 모든 새 메시지를 히스토리에 추가하고 방에 브로드캐스트, 에이전트 풀에 팬아웃
  - 방 목록 업데이트 `rooms_update` 이벤트는 스로틀(기본 500ms)로 과도 방송 방지
- Agent Pool: 방 설정(에이전트 on/off, 응답 빈도) 반영, 활성 에이전트에 동시에 호출
- Agent(개별 에이전트): 자기 발화 무시, 중복 응답 방지, 최소 응답 간격, 응답 확률 게이트를 거쳐 LLM 호출
- LLM Provider: 각 벤더 SDK 래핑, 타임아웃/응답 길이 하드캡 적용, `[NO_RESPONSE]` 처리
- 저장소: 메모리 기반 대화 히스토리(`HISTORY_LIMIT` 초과 시 FIFO로 제거)
- 프런트엔드: 바닐라 JS SPA. 채팅 UI, 타이핑 인디케이터, 방 목록, 테마/설정 패널 제공

## 폴더 구조
- `server/` 서버 및 정적 프런트엔드
  - `src/index.js` Express + Socket.IO 엔트리포인트, REST API/소켓 이벤트 등록
  - `src/rooms.js` 방/참여자/히스토리/방별 설정 관리
  - `src/history.js` 메모리 히스토리 with 상한(`HISTORY_LIMIT`)
  - `src/types.js` 메시지 타입 스키마(주석)
  - `src/broadcaster.js` 메시지 브로드캐스트, 방 목록 스로틀 방송, 에이전트 호출 트리거
  - `src/agents/` 에이전트 풀/개별 에이전트/페르소나
    - `index.js` AgentPool: 방 설정 반영, 활성 에이전트 팬아웃
    - `agent.js` Agent: 쿨다운/최소 간격/확률 게이팅/타이핑 이벤트/LLM 호출
    - `personas.js` 알파/뮤즈/리오 페르소나 정의
  - `src/llm/` LLM 프로바이더 (mock/openai/gemini/anthropic)
  - `src/utils.js` 타임아웃 래퍼, NO_RESPONSE 판정, 문자열 자르기
  - `public/` 정적 프런트엔드 (HTML/CSS/JS)
    - `index.html` UI 마크업, 초기 테마 적용 스크립트, 상단바/설정 패널
    - `style.css` 라이트/다크 테마 변수, 채팅 UI 스타일
    - `app.js` 소켓 클라이언트, 메시지/타이핑 렌더, 방 목록/설정 패널/테마 토글
  - `scripts/test-rooms.mjs` 멀티룸 격리 간단 검증 스크립트(옵션)
- 루트 `AGENTS.md` 서비스 기획/아키텍처 배경 설명

## 설치와 실행
사전 요구: Node.js 18+ 권장

1) 의존성 설치
```
cd server
npm install
```

2) 환경 변수 설정
```
cp .env.example .env
# 필요시 .env 편집 (LLM_PROVIDER, API 키 등)
```

3) 실행
```
npm start
# 브라우저에서 http://localhost:3000 접속
# 방 분리: http://localhost:3000/?room=lobby, http://localhost:3000/?room=team-a 등
```

개발 모드(자동 재시작):
```
npm run dev
```

테스트 스크립트(옵션, 멀티룸 검증):
```
npm i -D socket.io-client
node scripts/test-rooms.mjs
```

## 환경 변수
- 서버/히스토리/방 목록
  - `PORT` 기본 3000
  - `HISTORY_LIMIT` 기본 200 (방 히스토리 최대 메시지 수)
  - `ROOMS_UPDATE_THROTTLE_MS` 기본 500 (방 목록 방송 스로틀)
- LLM 프로바이더 선택
  - `LLM_PROVIDER=mock | openai | gemini | anthropic`
- OpenAI
  - `OPENAI_MODEL` 기본 `gpt-4o-mini`
  - `OPENAI_API_KEY` 또는 에이전트별 `OPENAI_API_KEY_ALPHA|MUSE|LEO`
- Gemini (Google AI Studio)
  - `GEMINI_MODEL` 기본 `gemini-2.5-flash-lite`
  - `GEMINI_API_KEY` 또는 `GOOGLE_API_KEY` (에이전트별 `*_ALPHA|MUSE|LEO` 지원)
- Anthropic(Claude)
  - `ANTHROPIC_MODEL` 기본 `claude-3-5-sonnet-20240620`
  - `ANTHROPIC_API_KEY` (에이전트별 `*_ALPHA|MUSE|LEO` 지원)
- 에이전트 on/off (ID 기준)
  - `AGENTS_ENABLED` 예: `alpha,muse,leo`
  - `AGENTS_DISABLED` 예: `muse`
- 안전장치(P0)
  - 사용자 메시지: `USER_MESSAGE_MAX_CHARS` 기본 2000, `USER_MIN_INTERVAL_MS` 기본 800
  - 에이전트 응답: `AGENT_RESPONSE_MAX_CHARS` 기본 100, `AGENT_MIN_INTERVAL_MS` 기본 1500
  - LLM 타임아웃: `LLM_TIMEOUT_MS` 기본 15000(ms)

## REST API
- `GET /health` → `{ status: 'ok' }`
- `GET /rooms` → `{ rooms: Array<{ id, participants, messages, lastActivity }> }`
- `POST /rooms` body `{ id?: string }` → `201 { id }` (미지정 시 랜덤)
- `GET /rooms/:id/config` → `{ id, config }`
- `POST /rooms/:id/config` body (부분 업데이트)
  - `{ agentEnabled?: { alpha|muse|leo?: boolean }, responseProbability?: number(0..1) }`

방 설정 기본값(새 방): `{ agentEnabled: {alpha: true, muse: true, leo: true}, responseProbability: 1.0 }`

## 소켓 이벤트(프런트 기준)
- 서버 → 클라이언트
  - `history`: `Message[]` (현재 방 히스토리 전체)
  - `message`: `Message` (새 메시지)
  - `typing_start`: `{ agentId: string, displayName: string }`
  - `typing_stop`: `{ agentId: string }`
  - `rooms_update`: `Array<{ id, participants, messages, lastActivity }>`
- 클라이언트 → 서버
  - `user_message`: `{ content: string, displayName: string }`

메시지 스키마(`Message`):
```
{
  id: string,
  senderType: 'user' | 'ai',
  agentId?: string,
  displayName: string,
  content: string,
  ts: number  // epoch ms
}
```

## 프런트엔드 UX
- 상단바: 현재 방 표시, 테마 토글(🌙/☀️), 설정(⚙️)
- 사이드바: 방 입장/생성, 방 목록(참여자/메시지 수)
- 채팅창: 메시지 목록, 에이전트별 아바타/이름, 연속 메시지 묶음(3분 이내 동일 발신자)
- 타이핑 표시: 여러 에이전트가 동시에 chip으로 표시됨
- 입력 영역: Shift+Enter 줄바꿈, 자동 리사이즈
- 링크/코드: URL 자동 링크화, ``` 코드블록 간단 렌더링
- 테마: 라이트/다크, 로컬 저장값/시스템 선호 반영, 부드러운 전환
- 설정 패널(⚙️): 방별 에이전트 on/off, 응답 빈도(많음=1.0/보통=0.6/적음=0.3)

## 에이전트/응답 알고리즘
- 브로드캐스트: 새 메시지를 방 전체 에이전트에 팬아웃 (전체 히스토리 포함)
- 의사결정: 각 에이전트는
  - 자기 발화 무시(에코 방지)
  - 같은 메시지 중복 응답 방지(쿨다운 맵)
  - 최소 응답 간격(`AGENT_MIN_INTERVAL_MS`) 미만이면 건너뜀
  - 방 설정의 `responseProbability`에 따라 무작위 게이팅(많음=1.0, 보통=0.6 등)
- LLM 호출: 시작 시 `typing_start`, 완료/중단 시 `typing_stop`
  - 프롬프트에 “[NO_RESPONSE] 규칙”과 “응답 시 100자 이내” 지시 포함
  - 타임아웃(`LLM_TIMEOUT_MS`) 초과/에러 시 무응답 처리
- 응답 게시: 하드캡(`AGENT_RESPONSE_MAX_CHARS`)으로 잘라 방에 브로드캐스트/히스토리 저장

### 페르소나
- 알파(분석가, `alpha`): 장단점/비용/효율 중심의 논리적 조언
- 뮤즈(예술가, `muse`): 감성적/창의적 제안과 영감 중심 표현
- 리오(탐험가, `leo`): 즉흥적/액티비티 중심 제안, 에너지 있는 말투

### Mock 프로바이더 동작
- 키워드 휴리스틱으로 참여 여부 판단, 500~1700ms 지연을 랜덤 시뮬레이션
- 응답은 간단한 템플릿, 최종적으로 100자 하드캡 적용

## 안전장치/제한(기본값)
- 사용자 메시지: 길이 2000자, 최소 간격 800ms
- 에이전트 응답: 길이 100자, 최소 간격 1500ms, 메시지별 중복 방지
- LLM 타임아웃: 15초, 타임아웃 시 무응답 처리
- 방 목록 방송 스로틀: 500ms
- 히스토리 상한: 200개 초과 시 오래된 항목부터 제거

## 한계 및 로드맵
- 히스토리 영속화 없음(메모리) → DB/Redis 도입 예정
- 인증/권한/모더레이션 부재 → 레이트 리밋/금칙어/링크 미리보기 프록시/신뢰구간 마련
- 스트리밍 미구현 → 토큰/문장 단위 스트림으로 ‘입력 중’ 체감 개선
- 실패 복구: 재시도/백오프/회로 차단기 도입, 멀티 프로바이더 자동 폴백
- 타입/테스트: TypeScript 전환, 유닛/통합 테스트 확충
- 큐/백프레셔: 에이전트 호출 동시성/최대 대기량 제어
- UI: 코드 하이라이트, 메시지 복사/반응/스레드, 모바일 최적화 고도화

## 라이선스
별도 명시되지 않음. 필요 시 팀 합의 후 추가하세요.

