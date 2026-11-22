"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Icon } from "./Icon";

const NAV = [
  { href: "/", icon: "home", label: "홈", short: "홈" },
  { href: "/lesson", icon: "lesson", label: "오늘의 수업", short: "수업" },
  { href: "/talk", icon: "talk", label: "AI 회화", short: "회화" },
  { href: "/review", icon: "review", label: "복습", short: "복습" },
  { href: "/stats", icon: "stats", label: "성장 리포트", short: "리포트" },
  { href: "/settings", icon: "prefs", label: "목표·설정", short: "설정" },
];

type Theme = "system" | "light" | "dark";
const THEME_LABEL: Record<Theme, string> = { system: "시스템", light: "라이트", dark: "다크" };

export function applyTheme(t: Theme) {
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem("ec-theme", t);
  } catch {}
  window.dispatchEvent(new CustomEvent("ec-theme", { detail: t }));
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    try {
      const t = localStorage.getItem("ec-theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
    const on = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener("ec-theme", on);
    return () => window.removeEventListener("ec-theme", on);
  }, []);
  return [theme, applyTheme];
}

function ThemeButton({ prefix }: { prefix?: boolean }) {
  const [theme, set] = useTheme();
  const order: Theme[] = ["system", "light", "dark"];
  return (
    <button className="theme-btn" type="button" onClick={() => set(order[(order.indexOf(theme) + 1) % 3])}>
      <Icon name="sun" size={16} />
      <span>{prefix ? "테마: " : ""}{THEME_LABEL[theme]}</span>
    </button>
  );
}

interface Prefs {
  voiceRate: number;
  streak: number;
}
const PrefsContext = createContext<Prefs>({ voiceRate: 0.9, streak: 0 });
export const usePrefs = () => useContext(PrefsContext);

export function Shell({ children, voiceRate, streak }: { children: React.ReactNode; voiceRate: number; streak: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <PrefsContext.Provider value={{ voiceRate, streak }}>
      <div className="app">
        <aside className="side">
          <Link href="/" className="brand card-link"><div className="brand-mark">Ec</div><b>English Coach</b></Link>
          <nav className="nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
                <Icon name={n.icon} />{n.label}
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            {streak > 0 && (
              <div className="streak-mini"><Icon name="flame" size={16} style={{ color: "var(--amber)" }} /><span><b className="num">{streak}일</b> 연속 학습 중</span></div>
            )}
            <ThemeButton prefix />
          </div>
        </aside>
        <main className="main">
          <div className="wrap">
            <div className="m-top">
              <Link href="/" className="brand card-link" style={{ padding: 0 }}><div className="brand-mark">Ec</div><b>English Coach</b></Link>
              <ThemeButton />
            </div>
            {children}
          </div>
        </main>
        <nav className="tabbar">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>
              <Icon name={n.icon} size={22} />{n.short}
            </Link>
          ))}
        </nav>
      </div>
    </PrefsContext.Provider>
  );
}
