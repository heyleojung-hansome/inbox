import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans_KR, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const ko = IBM_Plex_Sans_KR({ weight: ["400", "500", "600"], variable: "--font-ko", preload: false, display: "swap" });
const display = Bricolage_Grotesque({ weight: ["600", "700"], subsets: ["latin"], variable: "--font-display", display: "swap" });
const en = Source_Serif_4({ weight: ["400", "600"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-en", display: "swap" });

export const metadata: Metadata = {
  title: "My English Coach",
  description: "하루 30분, 나를 기억하는 AI 영어 선생님",
  appleWebApp: { capable: true, title: "English Coach", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#111613" },
  ],
};

// 화면이 그려지기 전에 저장된 테마를 적용해 깜빡임을 막습니다
const themeScript = `try{var t=localStorage.getItem("ec-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${ko.variable} ${display.variable} ${en.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
