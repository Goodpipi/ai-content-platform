import { getPptTemplate } from './pptTemplates.js';

/** 从大纲展开页面列表 */
export function flattenOutlinePages(outline) {
  if (!outline?.chapters?.length) {
    return [{ title: '封面', bullets: ['可申达', '疾病教育'] }];
  }
  const pages = [];
  for (const ch of outline.chapters) {
    for (const p of ch.pages || []) {
      pages.push({
        title: p.title || '未命名页面',
        bullets: p.bullets?.length ? p.bullets : ['要点待补充'],
      });
    }
  }
  return pages.length ? pages : [{ title: '封面', bullets: ['可申达'] }];
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const VARIANTS = [
  { bg1: '#eaf7ff', bg2: '#f4fff0', accent: '#103C8F', sub: '#40536a' },
  { bg1: '#e8f5e9', bg2: '#f1f8e9', accent: '#2e7d32', sub: '#4a5f4a' },
  { bg1: '#e3f2fd', bg2: '#fafafa', accent: '#1565c0', sub: '#546e7a' },
  { bg1: '#e8eaf6', bg2: '#f3e5f5', accent: '#4527a0', sub: '#5c4d6a' },
];

/** 服务端生成幻灯片 SVG，避免 AI 返回超大 JSON */
export function buildSlideSvg(title, bullets, variantIndex = 0) {
  const v = VARIANTS[variantIndex % VARIANTS.length] || VARIANTS[0];
  const safeTitle = esc(title).slice(0, 36);
  const lines = (bullets || []).slice(0, 4).map((b) => esc(b).slice(0, 48));
  const bulletSvg = lines
    .map(
      (line, i) =>
        `<text x="56" y="${248 + i * 36}" font-size="22" fill="${v.sub}">• ${line}</text>`
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="${v.bg1}"/><stop offset="1" stop-color="${v.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="960" height="540" fill="url(#bg)"/>
    <rect x="48" y="40" width="100" height="36" rx="18" fill="${v.accent}"/>
    <text x="72" y="64" font-size="18" font-weight="700" fill="white">Bayer</text>
    <text x="48" y="160" font-size="34" font-weight="800" fill="${v.accent}">${safeTitle}</text>
    ${bulletSvg}
    <rect x="48" y="480" width="520" height="36" rx="8" fill="#fff" opacity="0.85"/>
    <text x="64" y="504" font-size="14" fill="${v.accent}">疾病教育内容｜仅供科普参考</text>
  </svg>`;
}

export function enrichPptDesignVersions(data, outline, options = {}) {
  const { templateId = null, singleVersion = false } = options;
  const basePages = flattenOutlinePages(outline);
  let versions = data?.versions || [];

  if (singleVersion && templateId) {
    const tpl = getPptTemplate(templateId);
    const first = versions[0] || {};
    versions = [
      {
        id: templateId,
        name: tpl.name,
        styleTag: tpl.styleTag,
        description: first.description || `按「${tpl.name}」模板生成`,
        slides: first.slides || [],
        _variantIndex: tpl.variantIndex,
      },
    ];
  } else {
    versions = versions.slice(0, 3);
  }

  if (!versions.length) {
    return {
      versions: [
        { id: 'v1', name: '方案 A', styleTag: '拜耳蓝', description: '演示方案', slides: [] },
      ],
    };
  }

  return {
    versions: versions.map((ver, vi) => {
      const variantIndex =
        ver._variantIndex != null ? ver._variantIndex : vi;
      const aiSlides = ver.slides || [];
      const slides = basePages.map((pg, i) => {
        const fromAi = aiSlides[i] || aiSlides.find((s) => s.page === i + 1) || {};
        return {
          page: i + 1,
          title: fromAi.title || pg.title,
          bullets: fromAi.bullets?.length ? fromAi.bullets : pg.bullets,
          speakerNotes: fromAi.speakerNotes,
          svg: buildSlideSvg(
            fromAi.title || pg.title,
            fromAi.bullets || pg.bullets,
            variantIndex
          ),
        };
      });
      const { _variantIndex, ...rest } = ver;
      return {
        id: rest.id || `v${vi + 1}`,
        name: rest.name || `方案 ${String.fromCharCode(65 + vi)}`,
        styleTag: rest.styleTag || '拜耳蓝绿',
        description: rest.description || '',
        slides,
      };
    }),
  };
}
