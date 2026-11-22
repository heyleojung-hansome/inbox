const PATHS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  lesson: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M9 8h6M9 12h4" /></>,
  talk: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" /></>,
  review: <><rect x="3" y="6" width="14" height="15" rx="2" /><path d="M7 3h12a2 2 0 0 1 2 2v12" /></>,
  stats: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  prefs: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  send: <path d="M5 12h14M13 6l6 6-6 6" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  volume: <><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></>,
  stop: <rect x="7" y="7" width="10" height="10" rx="2" />,
};

export function Icon({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) {
  if (name === "play") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={style}>
        <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
      </svg>
    );
  }
  if (name === "flame") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={style}>
        <path d="M12 2c.6 3.2 4.8 5.6 4.8 10.4A4.8 4.8 0 0 1 12 17.2a4.8 4.8 0 0 1-4.8-4.8c0-2 1-3.4 2-4.4.2 1.4.9 2.4 1.9 2.8C11 8 11.2 4.8 12 2zM6 15.5A6 6 0 0 0 18 15.5 6 6 0 0 1 12 22a6 6 0 0 1-6-6.5z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "check" || name === "x" ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      {PATHS[name]}
    </svg>
  );
}
