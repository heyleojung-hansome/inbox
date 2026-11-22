# My English Coach

하루 30분, 나를 기억하는 AI 영어 선생님. 수준 진단 → 매일 5단계 수업 → 간격 반복 복습 → 상황별 AI 회화 → 성장 리포트까지 한 흐름으로 이어지는 개인용 웹앱입니다. 휴대폰과 패드에 맞춰 만들었고, 홈 화면에 추가하면 앱처럼 열립니다.

## 바로 실행하기 (내 컴퓨터)

```bash
cd english-coach
npm install
cp .env.example .env.local   # GEMINI_API_KEY 등을 채웁니다
npm run dev                  # http://localhost:3000
```

- `GEMINI_API_KEY`를 비워두면 **예비 모드**로 동작합니다. 커리큘럼에 미리 써둔 문제와 규칙 기반 채점을 쓰므로 비용 없이 전체 흐름을 써볼 수 있습니다.
- 키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급합니다. 키는 서버에만 있고 브라우저로 보내지 않습니다.
- 같은 Wi‑Fi의 휴대폰에서 열려면 `npm run dev -- -H 0.0.0.0` 후 `http://<컴퓨터 IP>:3000`으로 접속합니다. 단, 휴대폰 브라우저는 보안 연결(https)이 아니면 마이크를 막을 수 있어서 음성 입력은 배포 후에 쓰는 것을 권장합니다.

## 휴대폰·패드에서 쓰기 (배포)

Vercel(무료)과 Turso(무료 SQLite 클라우드)를 추천합니다. 코드는 그대로 두고 환경변수만 바꾸면 됩니다.

1. [Turso](https://turso.tech)에서 데이터베이스를 만들고 URL(`libsql://...`)과 토큰을 받습니다.
2. 이 저장소를 [Vercel](https://vercel.com)에 연결하고 **Root Directory**를 `english-coach`로 지정합니다.
3. Vercel 환경변수에 다음을 넣습니다.

| 이름 | 값 |
|---|---|
| `GEMINI_API_KEY` | Gemini API 키 |
| `GEMINI_MODEL` | `gemini-3.8-flash` (선택) |
| `DATABASE_URL` | Turso URL |
| `DATABASE_AUTH_TOKEN` | Turso 토큰 |
| `APP_PASSCODE` | **꼭 설정.** 다른 사람이 내 API 키를 쓰지 못하게 막는 접속 비밀번호 |
| `APP_TIMEZONE` | `Asia/Seoul` |

4. 배포된 주소를 휴대폰 Safari/Chrome에서 열고 비밀번호를 입력한 뒤, 공유 → **홈 화면에 추가**를 누르면 앱처럼 쓸 수 있습니다.

## 화면

| 경로 | 화면 |
|---|---|
| `/onboarding` | 첫 접속 시 이름·목표·학습 시간 설정 + 10문항 수준 진단 |
| `/` | 홈: 오늘의 수업 진행률, 연속 학습, 복습 카드, 영역별 성취도, 약점, 코치 메모 |
| `/lesson` | 30분 수업 (복습 → 듣기·읽기 → 말하기 → 문장 만들기 → 정리) |
| `/talk` | 상황별 AI 회화 9종 (일상·여행·직장), 발화마다 피드백, 끝나면 리포트 |
| `/review` | 간격 반복 복습 카드 (다시/어려움/좋음/쉬움) |
| `/stats` | 성장 리포트: 달성률, 학습 시간, 정답률, 영역별 추이, 캘린더, 취약 영역 |
| `/settings` | 목표, 학습 시간, 한국어 설명 비율, 음성 속도, 말투, 테마, 데이터 내보내기 |

## 개발

```bash
npm test          # 엔진 단위 테스트 (Vitest)
npm run typecheck
npm run build
```

구조와 설계는 [docs/PLAN.md](docs/PLAN.md), 승인된 디자인 시안은 [design/prototype.html](design/prototype.html)에 있습니다.
