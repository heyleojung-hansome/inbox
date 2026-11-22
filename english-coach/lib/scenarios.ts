import type { TalkScenario } from "./ai/provider";

export const SCENARIOS: TalkScenario[] = [
  {
    id: "cafe", category: "daily", title: "카페에서 주문하기", roleAi: "barista", roleLearner: "customer",
    opener: "Hi there! What can I get for you today?", openerKo: "안녕하세요! 오늘 뭘 드릴까요?",
    sample: "Can I get a latte, please?",
    script: ["Sure! What size would you like?", "Great. For here or to go?", "Okay. That's five dollars. Anything else?", "Here you go. Have a nice day!"],
  },
  {
    id: "smalltalk", category: "daily", title: "이웃과 가벼운 대화", roleAi: "friendly neighbor", roleLearner: "neighbor",
    opener: "Good morning! Nice weather today, isn't it?", openerKo: "좋은 아침이에요! 오늘 날씨 좋네요, 그렇죠?",
    sample: "Yes, it's really nice.",
    script: ["Are you going to work now?", "What do you usually do on weekends?", "That sounds fun! Have a good day!"],
  },
  {
    id: "shopping", category: "daily", title: "옷 가게에서 사이즈 묻기", roleAi: "shop clerk", roleLearner: "shopper",
    opener: "Hello! Are you looking for anything special?", openerKo: "안녕하세요! 특별히 찾으시는 게 있나요?",
    sample: "Do you have this in a medium?",
    script: ["Let me check. What color do you like?", "Here it is. The fitting room is over there.", "How does it fit?", "Great choice! You can pay at the counter."],
  },
  {
    id: "hotel", category: "travel", title: "호텔 체크인", roleAi: "hotel front desk clerk", roleLearner: "guest",
    opener: "Good evening! Welcome to the Harbor Hotel. How can I help you?", openerKo: "안녕하세요! 하버 호텔에 오신 걸 환영해요. 무엇을 도와드릴까요?",
    sample: "Hi. I have a reservation under Kim.",
    script: ["Thank you. Can I see your passport, please?", "You're staying for two nights. Is that right?", "Your room is on the fifth floor. Breakfast is from seven to ten.", "Here is your key card. Enjoy your stay!"],
  },
  {
    id: "airport", category: "travel", title: "공항에서 길 묻기", roleAi: "airport staff", roleLearner: "traveler",
    opener: "Hello! Do you need any help?", openerKo: "안녕하세요! 도와드릴까요?",
    sample: "Yes. Where is gate 12?",
    script: ["Go straight and turn left. It's next to the coffee shop.", "It takes about five minutes on foot.", "Your flight boards at 3 p.m. Have a safe trip!"],
  },
  {
    id: "restaurant", category: "travel", title: "식당 예약하고 주문하기", roleAi: "restaurant server", roleLearner: "diner",
    opener: "Hi! Welcome. How many people?", openerKo: "안녕하세요! 어서 오세요. 몇 분이세요?",
    sample: "A table for two, please.",
    script: ["Right this way. Here is the menu.", "Are you ready to order?", "Anything to drink?", "Great. Your food will be ready soon."],
  },
  {
    id: "intro", category: "work", title: "회의에서 자기소개", roleAi: "new coworker at a team meeting", roleLearner: "team member",
    opener: "Hi, I'm Alex from the marketing team. Nice to meet you!", openerKo: "안녕하세요, 마케팅팀 알렉스예요. 반가워요!",
    sample: "Nice to meet you, too. I'm Jieun. I'm a designer.",
    script: ["Which team are you on?", "How long have you worked here?", "Great! Let's grab lunch sometime."],
  },
  {
    id: "schedule", category: "work", title: "회의 일정 잡기", roleAi: "colleague", roleLearner: "colleague",
    opener: "Hey, do you have time to talk about the project this week?", openerKo: "이번 주에 프로젝트 얘기할 시간 있어요?",
    sample: "Sure. Are you free on Thursday?",
    script: ["Thursday works. What time is good for you?", "Okay. Should we meet in the meeting room?", "Perfect. I'll send you an invite."],
  },
  {
    id: "phone", category: "work", title: "전화로 메시지 남기기", roleAi: "receptionist on the phone", roleLearner: "caller",
    opener: "Good afternoon, Bright Company. How can I help you?", openerKo: "안녕하세요, 브라이트 컴퍼니입니다. 무엇을 도와드릴까요?",
    sample: "Hi. Can I speak to Mr. Lee, please?",
    script: ["I'm sorry, he's in a meeting. Can I take a message?", "Sure. What's your phone number?", "Got it. I'll tell him you called."],
  },
];

export function scenarioById(id: string): TalkScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
