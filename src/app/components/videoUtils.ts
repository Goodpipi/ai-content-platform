/** 为视频方案生成蓝绿风格封面（SVG Data URL） */
export function buildVideoPosterDataUrl(title: string, styleTag = ''): string {
  const safeTitle = title.slice(0, 24).replace(/[<>&]/g, '');
  const sub = styleTag || '可申达 · 疾病教育';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#eaf7ff"/><stop offset="1" stop-color="#f4fff0"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#bg)"/>
    <circle cx="780" cy="100" r="90" fill="#69BE28" opacity="0.2"/>
    <circle cx="120" cy="120" r="70" fill="#1d6bff" opacity="0.15"/>
    <rect x="48" y="40" width="100" height="36" rx="18" fill="#103C8F"/>
    <text x="72" y="64" font-size="18" font-weight="700" fill="white">Bayer</text>
    <text x="48" y="200" font-size="36" font-weight="800" fill="#103C8F">${safeTitle}</text>
    <text x="48" y="250" font-size="20" fill="#40536a">${sub}</text>
    <circle cx="480" cy="380" r="48" fill="#103C8F" opacity="0.9"/>
    <polygon points="460,350 460,410 520,380" fill="white"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 演示用公开短视频（无 API 合成能力时的占位） */
export const DEMO_VIDEO_URLS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
];
