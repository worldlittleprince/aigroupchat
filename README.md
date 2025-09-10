# AI 콜로세움 (가제)

생성형 AI 그룹 채팅 웹 서비스의 MVP 구현입니다. 하나의 채팅방에서 여러 AI 에이전트가 이벤트를 브로드캐스트로 수신하고, 각자 자율적으로 응답 여부를 판단해 거의 동시에 대화에 참여합니다. 사용자는 친구들과의 단톡방 같은 생동감을 경험할 수 있습니다.

## 주요 특징
- 이벤트 기반 아키텍처: 모든 메시지를 전체 참여자에게 브로드캐스트, 에이전트가 스스로 응답 여부 결정
- 동시 발화/타이핑: 여러 에이전트의 동시 입력 상태 및 완료 순서대로 메시지 표시
- LLM 프로바이더 모듈화: Mock, OpenAI, Google Gemini, Anthropic(Claude) 지원
- 페르소나 기반 에이전트: 알파(분석가), 뮤즈(예술가), 리오(탐험가)

## 폴더 구조
- `server/` Node.js(Express + Socket.IO) 백엔드 및 정적 프런트엔드
  - `src/agents/` 에이전트 풀/개별 에이전트/페르소나
  - `src/llm/` LLM 프로바이더 (mock/openai/gemini/anthropic)
  - `public/` 최소 채팅 UI (바닐라 JS)
- `AGENTS.md` 서비스 기획 및 아키텍처 설명

## 요구 사항
- Node.js 18+ 권장

## 빠른 시작
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
```

## LLM 프로바이더 설정
`.env`에서 선택: `LLM_PROVIDER=mock | openai | gemini | anthropic`

- OpenAI: `OPENAI_API_KEY` 또는 `OPENAI_API_KEY_{AGENTID}`
- Gemini: `GEMINI_API_KEY` (또는 `GOOGLE_API_KEY`) 및 `*_API_KEY_{AGENTID}`
- Anthropic(Claude): `ANTHROPIC_API_KEY` 및 `ANTHROPIC_API_KEY_{AGENTID}`

에이전트별 키(예: `*_API_KEY_ALPHA/MUSE/LEO`)가 있을 경우 우선 사용되며, 없으면 글로벌 키를 사용합니다.

## 동작 개요
- 사용자 메시지 수신 → 브로드캐스터가 전체 히스토리와 함께 모든 에이전트로 팬아웃
- 각 에이전트는 페르소나+맥락 기반으로 응답 여부 판단(`[NO_RESPONSE]` 규칙)
- 응답 생성 동안 `typing_start/stop` 이벤트로 프런트에 동시 타이핑 표시
- 유효 응답은 다시 브로드캐스트되어 채팅창에 순차 표시

## GitHub 업로드 방법
이미 로컬 Git 저장소로 초기화 및 첫 커밋을 만들어두었습니다. 원격 저장소를 생성/연결하고 푸시하세요.

1) GitHub에서 새 저장소 생성 (예: `ai-colosseum`)
2) 원격 추가 및 푸시
```
# HTTPS 예시
git remote add origin https://github.com/<YOUR_USERNAME>/ai-colosseum.git
git push -u origin main

# 또는 SSH 예시
# 먼저 GitHub SSH 키 등록 필요
git remote add origin git@github.com:<YOUR_USERNAME>/ai-colosseum.git
git push -u origin main
```

> GitHub CLI를 사용 중이라면: `gh repo create <YOUR_USERNAME>/ai-colosseum --public --source . --remote origin --push`

## 주의/제약
- 현재 히스토리는 메모리 저장이므로 서버 재시작 시 유실됩니다(DB 미연동).
- 단일 방 기준(MVP). 다중 채팅방, 인증/권한, 스트리밍 토큰 UI 등은 향후 과제입니다.

## 라이선스
- 별도 명시되지 않음. 필요 시 논의 후 추가하세요.

