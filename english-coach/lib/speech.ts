"use client";

/** 브라우저 내장 음성 기능 (Web Speech API). 지원하지 않는 기기에서는 글자 입력으로 대신합니다. */

let cachedVoice: SpeechSynthesisVoice | null = null;

function englishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  cachedVoice =
    voices.find((v) => v.lang === "en-US" && /Samantha|Google US English|Aria|Jenny/i.test(v.name)) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null;
  return cachedVoice;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, rate = 0.9, onEnd?: () => void): void {
  if (!canSpeak()) return onEnd?.();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  const v = englishVoice();
  if (v) u.voice = v;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** 영어 음성 인식을 한 번 실행합니다. 중간 결과는 onPartial, 최종 결과는 onFinal로 전달됩니다. */
export function listenOnce(handlers: {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}): () => void {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    handlers.onError?.("이 브라우저는 음성 인식을 지원하지 않아요. 글자로 입력해 주세요.");
    handlers.onEnd?.();
    return () => {};
  }
  const rec: Recognition = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onPartial?.((finalText + interim).trim());
  };
  rec.onerror = (e: any) => {
    const map: Record<string, string> = {
      "not-allowed": "마이크 권한이 필요해요. 브라우저 설정에서 마이크를 허용해 주세요.",
      "no-speech": "목소리가 들리지 않았어요. 다시 눌러서 말해 주세요.",
      network: "음성 인식에 인터넷 연결이 필요해요.",
    };
    if (e.error !== "aborted") handlers.onError?.(map[e.error] ?? "음성 인식 중 문제가 생겼어요.");
  };
  rec.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim());
    handlers.onEnd?.();
  };
  rec.start();
  return () => rec.stop();
}
