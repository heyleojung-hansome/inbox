import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My English Coach",
    short_name: "English Coach",
    description: "하루 30분, 나를 기억하는 AI 영어 선생님",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5EE",
    theme_color: "#1F5C45",
    lang: "ko",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
