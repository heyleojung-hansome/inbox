import type { DialogueLine, ErrorTag } from "./types";

export interface Unit {
  id: string;
  stage: "basic" | "daily" | "applied";
  title: string;
  keySentence: string;
  grammar: { tag: ErrorTag; noteKo: string };
  phrases: { en: string; ko: string; note?: string }[];
  vocab: { en: string; ko: string }[];
  dialogue: DialogueLine[];
  questions: { q: string; choices: string[]; answer: string }[];
  build: { ko: string; en: string; acceptable?: string[] }[];
}

export const STAGE_NAME = { basic: "기초 문장", daily: "일상 회화", applied: "실생활 응용" } as const;

export const UNITS: Unit[] = [
  {
    id: "U01-hello",
    stage: "basic",
    title: "처음 만나 인사하기",
    keySentence: "Nice to meet you.",
    grammar: { tag: "subject_verb", noteKo: "I am / You are / He is 처럼 주어에 맞는 be동사를 써요." },
    phrases: [
      { en: "Hi, I'm Jieun.", ko: "안녕하세요, 저는 지은이에요." },
      { en: "Nice to meet you.", ko: "만나서 반가워요." },
      { en: "Where are you from?", ko: "어디에서 오셨어요?" },
      { en: "I'm from Seoul.", ko: "저는 서울에서 왔어요." },
    ],
    vocab: [
      { en: "name", ko: "이름" },
      { en: "meet", ko: "만나다" },
      { en: "from", ko: "~에서 (출신)" },
      { en: "friend", ko: "친구" },
    ],
    dialogue: [
      { speaker: "A", en: "Hi, I'm Tom.", ko: "안녕하세요, 저는 톰이에요." },
      { speaker: "B", en: "Hi, Tom. I'm Jieun. Nice to meet you.", ko: "안녕하세요, 톰. 저는 지은이에요. 만나서 반가워요." },
      { speaker: "A", en: "Nice to meet you, too. Where are you from?", ko: "저도 반가워요. 어디에서 오셨어요?" },
      { speaker: "B", en: "I'm from Seoul, Korea.", ko: "저는 한국 서울에서 왔어요." },
    ],
    questions: [
      { q: "B의 이름은 무엇인가요?", choices: ["Tom", "Jieun", "Seoul", "Korea"], answer: "Jieun" },
      { q: "B는 어디에서 왔나요?", choices: ["Tokyo", "London", "Seoul", "New York"], answer: "Seoul" },
    ],
    build: [
      { ko: "저는 부산에서 왔어요.", en: "I'm from Busan.", acceptable: ["I am from Busan."] },
      { ko: "저는 민수예요. 만나서 반가워요.", en: "I'm Minsu. Nice to meet you.", acceptable: ["I am Minsu. Nice to meet you."] },
      { ko: "그녀는 캐나다에서 왔어요.", en: "She is from Canada.", acceptable: ["She's from Canada."] },
    ],
  },
  {
    id: "U02-job",
    stage: "basic",
    title: "하는 일 소개하기",
    keySentence: "I work at a bank.",
    grammar: { tag: "article", noteKo: "직업이나 셀 수 있는 명사 하나를 말할 때는 앞에 a/an을 붙여요. (a teacher, an engineer)" },
    phrases: [
      { en: "What do you do?", ko: "무슨 일 하세요?" },
      { en: "I'm an engineer.", ko: "저는 엔지니어예요." },
      { en: "I work at a bank.", ko: "저는 은행에서 일해요." },
      { en: "How about you?", ko: "당신은요?" },
    ],
    vocab: [
      { en: "engineer", ko: "엔지니어" },
      { en: "office", ko: "사무실" },
      { en: "company", ko: "회사" },
      { en: "designer", ko: "디자이너" },
    ],
    dialogue: [
      { speaker: "A", en: "What do you do, Jieun?", ko: "지은 씨는 무슨 일 하세요?" },
      { speaker: "B", en: "I'm a designer. I work at a small company.", ko: "저는 디자이너예요. 작은 회사에서 일해요." },
      { speaker: "A", en: "That's cool. I'm an engineer.", ko: "멋지네요. 저는 엔지니어예요." },
      { speaker: "B", en: "Oh, where do you work?", ko: "오, 어디서 일하세요?" },
    ],
    questions: [
      { q: "B의 직업은 무엇인가요?", choices: ["engineer", "designer", "teacher", "doctor"], answer: "designer" },
      { q: "A의 직업은 무엇인가요?", choices: ["designer", "banker", "engineer", "student"], answer: "engineer" },
    ],
    build: [
      { ko: "저는 선생님이에요.", en: "I'm a teacher.", acceptable: ["I am a teacher."] },
      { ko: "저는 병원에서 일해요.", en: "I work at a hospital.", acceptable: ["I work in a hospital."] },
      { ko: "그는 엔지니어예요.", en: "He's an engineer.", acceptable: ["He is an engineer."] },
    ],
  },
  {
    id: "U03-cafe",
    stage: "basic",
    title: "카페에서 주문하기",
    keySentence: "Can I get a latte, please?",
    grammar: { tag: "article", noteKo: "음료 '한 잔'을 주문할 때는 a/an을 붙여요. 모음 소리로 시작하면 an (an iced tea)." },
    phrases: [
      { en: "Can I get a latte, please?", ko: "라떼 한 잔 주시겠어요?" },
      { en: "For here or to go?", ko: "드시고 가세요, 가져가세요?" },
      { en: "To go, please.", ko: "가져갈게요." },
      { en: "That's all, thanks.", ko: "그게 다예요, 감사합니다." },
    ],
    vocab: [
      { en: "latte", ko: "라떼" },
      { en: "iced", ko: "아이스, 차가운" },
      { en: "size", ko: "크기" },
      { en: "receipt", ko: "영수증" },
    ],
    dialogue: [
      { speaker: "A", en: "Hi! What can I get for you?", ko: "안녕하세요! 무엇을 드릴까요?" },
      { speaker: "B", en: "Can I get an iced latte, please?", ko: "아이스 라떼 한 잔 주시겠어요?" },
      { speaker: "A", en: "Sure. For here or to go?", ko: "네. 드시고 가세요, 가져가세요?" },
      { speaker: "B", en: "To go, please. That's all, thanks.", ko: "가져갈게요. 그게 다예요, 감사합니다." },
    ],
    questions: [
      { q: "B가 주문한 음료는 무엇인가요?", choices: ["hot latte", "iced latte", "iced tea", "orange juice"], answer: "iced latte" },
      { q: "B는 음료를 어떻게 하나요?", choices: ["매장에서 마신다", "가져간다", "주문을 취소한다", "친구에게 준다"], answer: "가져간다" },
    ],
    build: [
      { ko: "아이스 아메리카노 한 잔 주시겠어요?", en: "Can I get an iced americano, please?" },
      { ko: "핫초코 한 잔 주시겠어요?", en: "Can I get a hot chocolate, please?" },
      { ko: "여기서 먹을게요.", en: "For here, please.", acceptable: ["For here."] },
    ],
  },
  {
    id: "U04-yesterday",
    stage: "basic",
    title: "어제 한 일 말하기",
    keySentence: "I went to the gym yesterday.",
    grammar: { tag: "tense", noteKo: "지난 일은 과거형으로 말해요. 규칙 동사는 -ed (watched), 불규칙 동사는 따로 외워요 (go → went, eat → ate)." },
    phrases: [
      { en: "What did you do yesterday?", ko: "어제 뭐 했어요?" },
      { en: "I went to the gym.", ko: "저는 헬스장에 갔어요." },
      { en: "I watched a movie.", ko: "저는 영화를 봤어요." },
      { en: "I stayed home.", ko: "저는 집에 있었어요." },
    ],
    vocab: [
      { en: "yesterday", ko: "어제" },
      { en: "went", ko: "갔다 (go의 과거)" },
      { en: "ate", ko: "먹었다 (eat의 과거)" },
      { en: "weekend", ko: "주말" },
    ],
    dialogue: [
      { speaker: "A", en: "What did you do yesterday?", ko: "어제 뭐 했어요?" },
      { speaker: "B", en: "I went to the gym after work.", ko: "퇴근 후에 헬스장에 갔어요." },
      { speaker: "A", en: "Nice. I stayed home and watched a movie.", ko: "좋네요. 저는 집에서 영화를 봤어요." },
      { speaker: "B", en: "Sounds relaxing!", ko: "편안했겠네요!" },
    ],
    questions: [
      { q: "B는 어제 퇴근 후 어디에 갔나요?", choices: ["집", "영화관", "헬스장", "카페"], answer: "헬스장" },
      { q: "A는 어제 무엇을 했나요?", choices: ["운동을 했다", "영화를 봤다", "요리를 했다", "친구를 만났다"], answer: "영화를 봤다" },
    ],
    build: [
      { ko: "저는 어제 친구를 만났어요.", en: "I met a friend yesterday.", acceptable: ["I met my friend yesterday.", "Yesterday I met a friend."] },
      { ko: "저는 점심으로 피자를 먹었어요.", en: "I ate pizza for lunch.", acceptable: ["I had pizza for lunch."] },
      { ko: "저는 주말에 집에 있었어요.", en: "I stayed home on the weekend.", acceptable: ["I stayed home over the weekend.", "I stayed at home on the weekend."] },
    ],
  },
  {
    id: "U05-directions",
    stage: "daily",
    title: "길 묻고 답하기",
    keySentence: "Excuse me, where is the station?",
    grammar: { tag: "preposition", noteKo: "위치는 전치사로 말해요: next to (옆에), across from (건너편에), on the left (왼쪽에)." },
    phrases: [
      { en: "Excuse me, where is the station?", ko: "실례합니다, 역이 어디에 있어요?" },
      { en: "Go straight and turn left.", ko: "직진하다가 왼쪽으로 도세요." },
      { en: "It's next to the bank.", ko: "은행 옆에 있어요." },
      { en: "Is it far from here?", ko: "여기서 멀어요?" },
    ],
    vocab: [
      { en: "station", ko: "역" },
      { en: "straight", ko: "똑바로" },
      { en: "corner", ko: "모퉁이" },
      { en: "across from", ko: "~의 건너편에" },
    ],
    dialogue: [
      { speaker: "A", en: "Excuse me, where is the subway station?", ko: "실례합니다, 지하철역이 어디에 있어요?" },
      { speaker: "B", en: "Go straight and turn right at the corner.", ko: "직진하다가 모퉁이에서 오른쪽으로 도세요." },
      { speaker: "A", en: "Is it far from here?", ko: "여기서 멀어요?" },
      { speaker: "B", en: "No, it's about five minutes. It's across from the park.", ko: "아니요, 5분 정도예요. 공원 건너편에 있어요." },
    ],
    questions: [
      { q: "모퉁이에서 어느 쪽으로 돌아야 하나요?", choices: ["왼쪽", "오른쪽", "뒤쪽", "돌지 않는다"], answer: "오른쪽" },
      { q: "역은 어디에 있나요?", choices: ["은행 옆", "공원 건너편", "병원 뒤", "카페 안"], answer: "공원 건너편" },
    ],
    build: [
      { ko: "실례합니다, 화장실이 어디에 있어요?", en: "Excuse me, where is the restroom?", acceptable: ["Excuse me, where is the bathroom?", "Excuse me, where's the restroom?"] },
      { ko: "그건 우체국 옆에 있어요.", en: "It's next to the post office.", acceptable: ["It is next to the post office."] },
      { ko: "공항이 여기서 멀어요?", en: "Is the airport far from here?" },
    ],
  },
  {
    id: "U06-restaurant",
    stage: "daily",
    title: "식당에서 주문하기",
    keySentence: "I'd like the pasta, please.",
    grammar: { tag: "politeness", noteKo: "I want 대신 I'd like ~를 쓰면 훨씬 공손하게 들려요." },
    phrases: [
      { en: "A table for two, please.", ko: "두 명 자리 부탁해요." },
      { en: "I'd like the pasta, please.", ko: "파스타로 할게요." },
      { en: "Could I have some water?", ko: "물 좀 주시겠어요?" },
      { en: "Can I get the check, please?", ko: "계산서 주시겠어요?" },
    ],
    vocab: [
      { en: "menu", ko: "메뉴" },
      { en: "order", ko: "주문하다" },
      { en: "check", ko: "계산서" },
      { en: "recommend", ko: "추천하다" },
    ],
    dialogue: [
      { speaker: "A", en: "Are you ready to order?", ko: "주문하시겠어요?" },
      { speaker: "B", en: "Yes. I'd like the chicken salad, please.", ko: "네. 치킨 샐러드로 할게요." },
      { speaker: "A", en: "Anything to drink?", ko: "음료는요?" },
      { speaker: "B", en: "Could I have some water?", ko: "물 좀 주시겠어요?" },
    ],
    questions: [
      { q: "B가 주문한 음식은 무엇인가요?", choices: ["pasta", "steak", "chicken salad", "pizza"], answer: "chicken salad" },
      { q: "B가 마실 것으로 부탁한 것은?", choices: ["콜라", "물", "커피", "주스"], answer: "물" },
    ],
    build: [
      { ko: "스테이크로 할게요.", en: "I'd like the steak, please.", acceptable: ["I would like the steak, please.", "I'd like the steak."] },
      { ko: "세 명 자리 부탁해요.", en: "A table for three, please." },
      { ko: "메뉴 좀 주시겠어요?", en: "Could I have the menu?", acceptable: ["Could I have a menu?", "Could I have the menu, please?", "Can I have the menu, please?"] },
    ],
  },
  {
    id: "U07-hotel",
    stage: "applied",
    title: "호텔 체크인하기",
    keySentence: "I have a reservation under Kim.",
    grammar: { tag: "article", noteKo: "처음 말하는 것 하나에는 a, 서로 아는 특정한 것에는 the를 써요. (a reservation → the room)" },
    phrases: [
      { en: "I have a reservation under Kim.", ko: "김이라는 이름으로 예약했어요." },
      { en: "Can I check in now?", ko: "지금 체크인할 수 있나요?" },
      { en: "What time is breakfast?", ko: "아침 식사는 몇 시예요?" },
      { en: "Could I have a late checkout?", ko: "체크아웃을 늦게 할 수 있을까요?" },
    ],
    vocab: [
      { en: "reservation", ko: "예약" },
      { en: "passport", ko: "여권" },
      { en: "floor", ko: "층" },
      { en: "key card", ko: "카드키" },
    ],
    dialogue: [
      { speaker: "A", en: "Good evening. How can I help you?", ko: "안녕하세요. 무엇을 도와드릴까요?" },
      { speaker: "B", en: "Hi. I have a reservation under Kim.", ko: "안녕하세요. 김이라는 이름으로 예약했어요." },
      { speaker: "A", en: "Yes, two nights. Your room is on the fifth floor.", ko: "네, 2박이시네요. 방은 5층이에요." },
      { speaker: "B", en: "Thank you. What time is breakfast?", ko: "감사합니다. 아침 식사는 몇 시예요?" },
      { speaker: "A", en: "From seven to ten.", ko: "7시부터 10시까지예요." },
    ],
    questions: [
      { q: "B는 몇 박을 예약했나요?", choices: ["1박", "2박", "3박", "5박"], answer: "2박" },
      { q: "B의 방은 몇 층인가요?", choices: ["2층", "3층", "5층", "7층"], answer: "5층" },
    ],
    build: [
      { ko: "박이라는 이름으로 예약했어요.", en: "I have a reservation under Park." },
      { ko: "체크아웃은 몇 시예요?", en: "What time is checkout?", acceptable: ["What time is check-out?", "What time is the checkout?"] },
      { ko: "수건을 좀 더 받을 수 있을까요?", en: "Could I have some more towels?", acceptable: ["Could I have more towels?", "Can I have some more towels?"] },
    ],
  },
  {
    id: "U08-meeting",
    stage: "applied",
    title: "회의 일정 잡기",
    keySentence: "Are you free on Thursday?",
    grammar: { tag: "preposition", noteKo: "요일 앞에는 on (on Monday), 시각 앞에는 at (at 3 p.m.), 달·연도 앞에는 in (in May)을 써요." },
    phrases: [
      { en: "Are you free on Thursday?", ko: "목요일에 시간 괜찮으세요?" },
      { en: "How about 3 p.m.?", ko: "오후 3시 어때요?" },
      { en: "That works for me.", ko: "저는 좋아요." },
      { en: "I'll send you an invite.", ko: "초대장 보내드릴게요." },
    ],
    vocab: [
      { en: "schedule", ko: "일정" },
      { en: "available", ko: "시간이 되는" },
      { en: "invite", ko: "(회의) 초대" },
      { en: "reschedule", ko: "일정을 바꾸다" },
    ],
    dialogue: [
      { speaker: "A", en: "Can we talk about the project this week?", ko: "이번 주에 프로젝트 얘기 좀 할 수 있을까요?" },
      { speaker: "B", en: "Sure. Are you free on Thursday?", ko: "그럼요. 목요일에 시간 괜찮으세요?" },
      { speaker: "A", en: "Yes. How about 3 p.m.?", ko: "네. 오후 3시 어때요?" },
      { speaker: "B", en: "That works for me. I'll send you an invite.", ko: "좋아요. 초대장 보내드릴게요." },
    ],
    questions: [
      { q: "회의는 무슨 요일인가요?", choices: ["Tuesday", "Wednesday", "Thursday", "Friday"], answer: "Thursday" },
      { q: "회의는 몇 시인가요?", choices: ["오전 10시", "오후 1시", "오후 3시", "오후 5시"], answer: "오후 3시" },
    ],
    build: [
      { ko: "월요일에 시간 괜찮으세요?", en: "Are you free on Monday?", acceptable: ["Are you available on Monday?"] },
      { ko: "오전 10시 어때요?", en: "How about 10 a.m.?", acceptable: ["How about 10 am?", "How about ten a.m.?"] },
      { ko: "회의를 금요일로 바꿀 수 있을까요?", en: "Can we reschedule the meeting to Friday?", acceptable: ["Could we reschedule the meeting to Friday?", "Can we move the meeting to Friday?"] },
    ],
  },
];

export function unitAt(index: number): Unit {
  return UNITS[Math.max(0, Math.min(index, UNITS.length - 1))];
}
