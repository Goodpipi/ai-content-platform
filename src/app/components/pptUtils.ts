import type { PptOutline, PptOutlineChapter, PptOutlinePage, PptSlide } from '@/types/content';

export function genId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseAudience(text: string): string {
  const t = text.toLowerCase();
  if (/医生|hcp|医师|专家|科室/.test(text) || t.includes('hcp')) return 'HCP';
  if (/患者|病人/.test(text)) return '患者';
  if (/公众|大众|小红书/.test(text)) return '公众';
  return '';
}

export function parseScenario(text: string): string {
  const patterns = [
    '作用机制',
    '产品培训',
    '疾病教育',
    '学术会',
    '科室会',
    '患教',
    '拜访',
    '内部培训',
    '机制',
    '疗效',
    '安全',
  ];
  for (const p of patterns) {
    if (text.includes(p)) return p;
  }
  if (text.length >= 8 && !/生成|ppt/i.test(text)) return text.slice(0, 40);
  return '';
}

export function normalizeOutline(
  raw: {
    title?: string;
    audience?: string;
    scenario?: string;
    chapters?: {
      title: string;
      pages?: { title: string; bullets?: string[]; speakerNotes?: string }[];
    }[];
  },
  audience: string,
  scenario: string
): PptOutline {
  const chapters: PptOutlineChapter[] = (raw.chapters || []).map((ch) => ({
    id: genId('ch'),
    title: ch.title || '未命名章节',
    pages: (ch.pages || []).map((p) => ({
      id: genId('pg'),
      title: p.title || '未命名页面',
      bullets: p.bullets?.length ? p.bullets : ['待补充要点'],
      speakerNotes: p.speakerNotes,
    })),
  }));

  if (!chapters.length) {
    chapters.push({
      id: genId('ch'),
      title: '主要内容',
      pages: [{ id: genId('pg'), title: '封面', bullets: ['标题', '副标题'] }],
    });
  }

  chapters.forEach((ch) => {
    if (!ch.pages.length) {
      ch.pages.push({ id: genId('pg'), title: '新页面', bullets: ['要点 1'] });
    }
  });

  return {
    title: raw.title || '可申达 演示文稿',
    audience: raw.audience || audience,
    scenario: raw.scenario || scenario,
    chapters,
  };
}

export function flattenOutline(outline: PptOutline): PptSlide[] {
  let page = 0;
  const slides: PptSlide[] = [];
  for (const ch of outline.chapters) {
    for (const p of ch.pages) {
      page += 1;
      slides.push({
        page,
        title: p.title,
        bullets: p.bullets,
        speakerNotes: p.speakerNotes || `章节：${ch.title}`,
      });
    }
  }
  return slides;
}

export function outlinePageCount(outline: PptOutline) {
  return outline.chapters.reduce((n, ch) => n + ch.pages.length, 0);
}

/** 将幻灯片转为可预览/编辑的 data URL */
export function slideToPreviewUrl(slide: PptSlide): string {
  if (slide.svg) {
    const encoded = encodeURIComponent(slide.svg);
    return `data:image/svg+xml;charset=utf-8,${encoded}`;
  }
  const title = (slide.title || '未命名').slice(0, 20);
  const bullets = (slide.bullets || []).slice(0, 4).join(' · ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#eaf7ff"/><stop offset="1" stop-color="#f4fff0"/>
    </linearGradient></defs>
    <rect width="960" height="540" fill="url(#g)"/>
    <rect x="48" y="40" width="100" height="36" rx="18" fill="#103C8F"/>
    <text x="72" y="64" font-size="18" font-weight="700" fill="white">Bayer</text>
    <text x="48" y="140" font-size="32" font-weight="800" fill="#103C8F">${title}</text>
    <text x="48" y="200" font-size="20" fill="#40536a">${bullets}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
