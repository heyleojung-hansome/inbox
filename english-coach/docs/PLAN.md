# My English Coach 개발 기획서

> 상태: **디자인 시안 검토 단계**. 시안(`design/prototype.html`)을 승인받은 뒤 기능 개발을 시작합니다.

## 0. 확정된 결정 사항

| 항목 | 결정 |
|---|---|
| 기술 스택 | Next.js(App Router) + TypeScript + Tailwind CSS + SQLite(Prisma) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`). API 키는 서버 `.env`에만 보관 |
| 디자인 톤 | 차분한 딥그린 + 아이보리, 다크 모드 지원 |
| 선생님 스타일 | 친근한 코치. 처음엔 한국어 설명 위주, 실력이 오르면 영어 비율 자동 증가 |
| 사용 형태 | 개인 1인 사용(로그인 없음 → 추후 확장), 반응형 웹, PWA 확장 가능 |

---

## 1. 기능 명세

### F1. 온보딩 · 수준 진단
- 첫 접속 시 목표(일상 회화 / 여행 / 직장), 하루 학습 시간(기본 30분), 학습 알림 시간을 고릅니다.
- 진단 테스트 10문항: 어휘 3, 문장 이해 3, 문장 만들기 2, 듣기 2. AI가 정답률에 따라 난이도를 바꿔 가며 출제합니다.
- 결과로 CEFR 근사 레벨(Pre-A1 ~ B1)과 영역별 초기 점수(듣기·말하기·읽기·쓰기)를 저장합니다.

### F2. 오늘의 수업(30분) 자동 생성
- 접속하면 서버가 **오늘의 수업 계획(LessonPlan)** 을 만듭니다. 재료는 다음 세 가지입니다.
  1. 커리큘럼상 다음 단원 (기초 문장 → 일상 회화 → 실생활 응용)
  2. 복습 대기 항목 (간격 반복으로 오늘 복습할 차례가 된 항목)
  3. 최근 약점 (반복되는 오답 유형)
- 5단계 구성: 복습 5분 → 듣기·읽기 8분 → 말하기 8분 → 문장 만들기 5분 → 정리 4분.
- 수업 중간에 나가도 이어서 할 수 있습니다(단계와 문항 위치 저장).

### F3. AI 인터랙티브 수업
- 한 번에 한 문제씩 출제하고 답을 기다립니다.
- 문제 유형: 객관식, 빈칸 채우기, 한→영 작문, 듣고 고르기, 따라 말하기(음성), 자유 응답.
- 답을 제출하면 AI 평가 결과를 받습니다: 정답 여부, 점수(0~100), 교정 문장, 틀린 이유를 쉽게 푼 설명, 오류 유형 태그.
- 같은 오류 유형이 2번 이상 나오면 비슷한 문제를 추가로 냅니다.
- 단계의 목표 시간이 지나고 최소 문항 수를 채우면 다음 단계로 넘어갑니다.

### F4. AI 영어 회화
- 상황(일상·여행·직장)과 시나리오(예: 카페 주문, 체크인, 회의 자기소개)를 고릅니다.
- AI는 학습자 레벨에 맞는 짧은 문장으로 대화하고, 학습자의 매 발화에 인라인 피드백(문법·표현·발음)을 붙입니다.
- 대화를 마치면 요약 리포트(잘한 표현, 고칠 표현 3개)를 보여주고 복습 카드로 저장합니다.

### F5. 스마트 복습
- 수업과 회화에서 나온 단어, 문장, 오답을 복습 카드로 자동 저장합니다.
- 간격 반복(SM-2 변형): 다시 / 어려움 / 좋음 / 쉬움 4단계로 다음 복습일을 계산합니다.
- 오늘 복습할 카드는 다음 날 수업의 복습 단계에 자동으로 들어갑니다.

### F6. 학습 대시보드 · 통계
- 홈: 오늘의 수업 진행률, 남은 시간, 연속 학습일, 복습 대기 수, 주간 달성률.
- 통계: 주간·월간 달성률, 학습 캘린더(히트맵), 영역별 점수 추이, 약점 Top 5와 개선 추이, 누적 학습 시간.
- 모든 지표는 실제 응답 기록(Attempt)에서 계산합니다. AI의 자기 평가는 지표에 쓰지 않습니다.

### F7. 설정
- 학습 목표, 하루 학습 시간, 알림 시간, 한국어 설명 비율(자동 / 수동 슬라이더), 음성 속도, 테마(시스템 / 라이트 / 다크), 데이터 내보내기.

### MVP 범위 밖(2차 이후)
- 발음 정밀 평가, 실시간 음성 대화, 다중 사용자 로그인, 푸시 알림, 고급 통계.

---

## 2. UI/UX 디자인 시스템

### 2-1. 색상 토큰
| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--bg` | `#F7F5EE` 아이보리 | `#111613` | 페이지 배경 |
| `--surface` | `#FFFDF7` | `#18201B` | 카드, 패널 |
| `--surface-2` | `#EFEDE3` | `#202A24` | 입력창, 보조 영역 |
| `--ink` | `#1B2620` | `#E8EDE6` | 본문 |
| `--ink-2` | `#5B675F` | `#9DAAA1` | 보조 텍스트 |
| `--line` | `#E1DED2` | `#2A352E` | 구분선 |
| `--green` | `#1F5C45` | `#6CC49A` | 주요 강조, 버튼 |
| `--green-soft` | `#DCE9DF` | `#1E3A2D` | 강조 배경 |
| `--amber` | `#B7791F` | `#E2B45C` | 연속 학습, 주의 |
| `--red` | `#B4442E` | `#EE8A73` | 오답 표시 |

영역 색상: 듣기 `#2F6F8F`, 말하기 `#1F5C45`, 읽기 `#8A6A2F`, 쓰기 `#7A4D6E` (다크에서는 밝게 조정).

### 2-2. 타이포그래피
- 한글 본문: **IBM Plex Sans KR** (400/500/600)
- 영문 제목·숫자: **Bricolage Grotesque** (600/700)
- 영어 학습 문장: **Source Serif 4** (교재처럼 읽히도록 영어 예문만 세리프)
- 스케일: 12 / 14 / 16 / 18 / 22 / 28 / 36px, 본문 행간 1.6

### 2-3. 컴포넌트
- 레이아웃: 데스크톱은 왼쪽 사이드바, 모바일은 하단 탭 바
- 버튼: Primary(그린 채움), Secondary(외곽선), Ghost
- 채팅 말풍선: 선생님(왼쪽, surface) / 학습자(오른쪽, green-soft) / 피드백 카드(교정 비교 표시)
- 진행 표시: 5단계 스텝퍼, 원형 진행률, 영역별 막대
- 칩: 오류 유형, 카드 종류, 시나리오
- 간격 4px 단위, 모서리 반경은 카드 14px · 칩 999px · 입력 10px로 역할별로 구분

### 2-4. UX 원칙
- 홈에서 한 번 탭하면 바로 오늘의 수업이 시작됩니다.
- 수업 화면은 한 번에 한 문제만 보여주고, 입력창은 엄지가 닿는 아래쪽에 둡니다.
- 정답·오답은 색상과 아이콘을 함께 써서 색맹 사용자도 구분할 수 있게 합니다.
- 음성 기능은 항상 텍스트로도 할 수 있습니다.

---

## 3. 데이터 구조 (Prisma 스키마 초안)

```prisma
model Learner {
  id            String   @id @default(cuid())
  name          String
  level         String   // "PRE_A1" | "A1" | "A2" | "B1"
  goal          String   // "daily" | "travel" | "work"
  dailyMinutes  Int      @default(30)
  koreanRatio   Float    @default(0.8)  // 설명 중 한국어 비율 (자동 조정)
  skillScores   Json     // { listening, speaking, reading, writing } 0~100
  curriculumPos String   // 현재 단원 id
  memorySummary String   // AI가 기억하는 학습자 요약 (수업 끝날 때마다 갱신)
  settings      Json
  createdAt     DateTime @default(now())
  sessions      LessonSession[]
  cards         ReviewCard[]
  conversations Conversation[]
}

model CurriculumUnit {   // 시드 데이터
  id         String @id   // "U01-greetings"
  stage      String       // "basic" | "daily" | "applied"
  order      Int
  title      String
  goals      Json         // 목표 표현, 문법 포인트
  vocabulary Json
}

model LessonSession {
  id          String    @id @default(cuid())
  learnerId   String
  date        DateTime  // 학습 날짜(로컬 기준)
  unitId      String
  plan        Json      // LessonPlan (단계별 목표, 복습 카드 id 목록)
  currentStep Int       @default(0)  // 0~4
  status      String    // "planned" | "in_progress" | "completed"
  startedAt   DateTime?
  endedAt     DateTime?
  activeSecs  Int       @default(0)
  summary     Json?     // 정리 단계 결과
  attempts    Attempt[]
  messages    Message[]
}

model Message {          // 수업 채팅 기록 (AI 컨텍스트 재구성용)
  id        String   @id @default(cuid())
  sessionId String
  role      String   // "teacher" | "learner" | "system"
  content   Json     // 텍스트 + 구조화 블록(문제, 피드백 등)
  createdAt DateTime @default(now())
}

model Attempt {          // 모든 지표의 근거 데이터
  id          String   @id @default(cuid())
  sessionId   String?
  learnerId   String
  step        String   // "review" | "listen_read" | "speak" | "build" | "wrap"
  skill       String   // "listening" | "speaking" | "reading" | "writing"
  itemType    String   // "mcq" | "cloze" | "translate" | "shadowing" | "free"
  prompt      Json
  answer      String
  isCorrect   Boolean
  score       Int      // 0~100
  errorTags   String[] // 예: ["article", "past_tense"]  (SQLite에서는 JSON으로 저장)
  feedback    Json
  latencyMs   Int
  createdAt   DateTime @default(now())
}

model ReviewCard {
  id          String   @id @default(cuid())
  learnerId   String
  kind        String   // "word" | "sentence" | "mistake"
  front       String
  back        String
  example     String?
  sourceId    String?  // Attempt 또는 Conversation id
  ease        Float    @default(2.5)
  intervalDay Int      @default(0)
  reps        Int      @default(0)
  lapses      Int      @default(0)
  dueAt       DateTime
  createdAt   DateTime @default(now())
}

model Conversation {
  id         String   @id @default(cuid())
  learnerId  String
  scenario   String
  messages   Json
  report     Json?
  createdAt  DateTime @default(now())
}

model DailyStat {        // 대시보드 조회용 집계 (Attempt에서 재계산 가능)
  learnerId   String
  date        DateTime
  minutes     Int
  completed   Boolean
  accuracy    Float
  skillDelta  Json
  @@id([learnerId, date])
}
```

---

## 4. AI 학습 엔진

### 4-1. 역할 분리: 코드가 흐름을, AI가 내용을 맡습니다
수업 진행(단계 전환, 시간, 문항 수, 난이도, 복습 일정)은 **서버 코드의 상태 머신**이 결정합니다. AI는 문제 만들기, 답 평가, 설명 쓰기만 맡습니다. 이렇게 해야 진도와 성취도가 실제 데이터 기준으로 일관되게 유지됩니다.

```
[수업 시작] → buildLessonPlan()
   ↓
 for step in [복습, 듣기·읽기, 말하기, 문장 만들기, 정리]:
   loop:
     item  = AI.generateItem(step, 난이도, 최근 오답, 목표 표현)   // 구조화 출력
     answer = 학습자 응답
     eval  = AI.evaluate(item, answer)                         // 구조화 출력
     Attempt 저장 → 난이도 조정 → 오답이면 ReviewCard 생성
     if 같은 errorTag 2회 이상: 다음 문제는 같은 유형 보강 문제
     if 단계 목표 시간 경과 && 최소 문항 수 충족: break
 → AI.wrapUp(): 요약, 핵심 표현, memorySummary 갱신
```

### 4-2. AI 호출 종류
| 호출 | 입력 | 출력(JSON 스키마) |
|---|---|---|
| `generateItem` | 레벨, 단계, 목표 표현, 최근 오답, 한국어 비율 | `{ type, instructionKo, promptEn, audioText?, choices?, answerKey, hint }` |
| `evaluate` | 문제, 정답 키, 학습자 답 | `{ isCorrect, score, corrected, explanationKo, errorTags[], encouragement }` |
| `converse` | 시나리오, 대화 기록, 레벨 | `{ reply, feedback: [{ type, original, suggestion, noteKo }] }` |
| `wrapUp` | 오늘의 Attempt 요약 | `{ summaryKo, keyPhrases[], nextFocus, memorySummary }` |

- JSON 응답은 Claude API의 구조화 출력(`output_config.format`)으로 받아서 서버에서 다시 검증합니다(zod).
- 객관식과 빈칸 문제는 AI를 부르지 않고 코드에서 정답 키와 바로 비교합니다. 비용과 응답 시간이 줄어듭니다.

### 4-3. 프롬프트 구성 (프롬프트 캐싱 고려)
1. **고정 시스템 프롬프트**: 튜터 원칙(한 문제씩, 쉬운 설명, 이유 설명, 친근한 말투)
2. **학습자 프로필**: 레벨, 목표, `memorySummary`, 한국어 비율. 수업 중에는 바뀌지 않습니다.
3. **오늘의 수업 계획**
4. **현재 단계 대화**

1~3을 앞쪽에 고정 배치하고 캐시해서, 매 턴 재전송 비용을 줄입니다.

### 4-4. 난이도 · 언어 비율 자동 조정
- 최근 10문항 정답률이 85% 이상이면 난이도 +1, 50% 미만이면 -1 (1~5단계).
- 영역 점수는 지수이동평균으로 갱신합니다: `score = 0.85 × score + 0.15 × attemptScore`.
- 한국어 비율: 주간 평균 정답률이 80% 이상이면 비율을 0.05 낮춥니다(최소 0.3). 설정에서 직접 고정할 수도 있습니다.

### 4-5. 간격 반복 (SM-2 변형)
- 다시(0): 간격 0일, lapses+1, ease −0.2
- 어려움(1): 간격 × 1.2, ease −0.15
- 좋음(2): 간격 × ease (첫 복습은 1일, 두 번째는 3일)
- 쉬움(3): 간격 × ease × 1.3, ease +0.15
- ease는 1.3 ~ 2.8 범위로 제한합니다.

### 4-6. 모델 설정
- 기본 모델: `claude-opus-5-5`. 빠른 응답이 필요한 평가·회화 턴은 effort `low`, 수업 계획과 정리는 `medium`으로 둡니다.
- 수업 응답은 스트리밍으로 보내 타이핑되듯 표시합니다.
- 안전 분류기 거절에 대비해 서버 측 fallback 옵션을 켜고, `stop_reason`을 확인합니다.
- 비용을 더 줄이고 싶다면 회화·평가 턴만 더 저렴한 모델로 나누는 방안을 나중에 검토할 수 있습니다(사용자 결정 사항).

---

## 5. 개발 아키텍처

```
english-coach/
├─ app/
│  ├─ (main)/page.tsx            홈 대시보드
│  ├─ (main)/lesson/page.tsx     AI 수업
│  ├─ (main)/talk/page.tsx       AI 회화
│  ├─ (main)/review/page.tsx     복습
│  ├─ (main)/stats/page.tsx      통계
│  ├─ (main)/settings/page.tsx   설정
│  ├─ onboarding/page.tsx        수준 진단
│  └─ api/
│     ├─ lesson/today/route.ts   오늘 수업 계획 생성/조회
│     ├─ lesson/turn/route.ts    문제 생성·답 평가 (스트리밍)
│     ├─ talk/route.ts           회화 턴
│     ├─ review/route.ts         복습 카드 조회·평가
│     └─ stats/route.ts          통계 집계
├─ lib/
│  ├─ ai/  client.ts, prompts.ts, schemas.ts(zod)
│  ├─ engine/ lessonStateMachine.ts, difficulty.ts, srs.ts, planner.ts
│  ├─ db.ts (Prisma)
│  └─ speech.ts  (Web Speech API: TTS, 음성 인식)
├─ prisma/ schema.prisma, seed.ts (커리큘럼 단원)
└─ docs/ PLAN.md
```

- **음성**: MVP는 브라우저 내장 Web Speech API(TTS + 음성 인식)를 씁니다. 추가 비용이 없고, Chrome·Edge·Safari에서 동작합니다.
- **상태 관리**: 서버 컴포넌트와 Route Handler 중심, 클라이언트 상태는 최소화(채팅 화면만).
- **테스트**: 엔진 로직(SRS, 난이도, 상태 머신)은 Vitest 단위 테스트, 주요 흐름은 Playwright E2E. AI 호출은 테스트에서 목(mock) 처리합니다.
- **배포**: 로컬 실행 우선. 외부 배포가 필요하면 SQLite 대신 Turso나 Postgres로 바꿉니다.

---

## 6. MVP 구현 계획

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| **0. 디자인 시안** | 핵심 6개 화면 클릭형 HTML 시안 | 사용자 승인 ← *현재* |
| 1. 기반 | Next.js 프로젝트, 디자인 토큰, 레이아웃, Prisma 스키마, 시드 데이터 | 6개 화면 정적 이동 가능 |
| 2. 프로필 · 진도 | 온보딩, 수준 진단, Learner 저장 | 새로고침해도 프로필 유지 |
| 3. 30분 수업 | 수업 계획 생성, 상태 머신, AI 문제 생성 | 5단계를 끝까지 진행 |
| 4. 평가 · 피드백 | 답 평가, 교정 카드, 오류 태그, 보강 문제 | 오답 시 이유 설명과 유사 문제 출제 |
| 5. 이력 · 복습 | Attempt·ReviewCard 저장, SRS, 다음 수업 반영 | 어제 오답이 오늘 복습에 나옴 |
| 6. 대시보드 | 홈·통계 실데이터 연결 | 지표가 Attempt와 일치 |
| 7. 확장 | 회화 화면, 음성 입력, PWA, 고급 통계 | 단계별 진행 |

## 7. 확인이 필요한 질문 (기능 개발 전)
1. Claude API 키를 가지고 계신가요? (기능 개발 단계에서 필요)
2. 주로 어떤 기기로 공부하시나요? (PC / 태블릿 / 휴대폰 중 우선순위)
3. 커리큘럼 첫 단원 주제로 원하는 상황이 있나요? (예: 직장 이메일, 해외 출장)
