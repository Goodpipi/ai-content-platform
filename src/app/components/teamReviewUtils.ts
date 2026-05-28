import type { CopyItem, PptOutline, PptResult, TeamContentType, VideoResult } from '@/types/content';

export const TEAM_CONTENT_LABELS: Record<TeamContentType, string> = {
  copy: '文案',
  visual: '图片',
  video: '视频脚本',
  ppt: 'PPT',
};

export function serializePptForTeam(outline: PptOutline | null, result: PptResult | null): string {
  if (result?.slides?.length) {
    return [
      `PPT 标题：${result.title || outline?.title || '未命名'}`,
      `页数：${result.slides.length}`,
      ...result.slides.map(
        (s) => `第${s.page}页 ${s.title}：${(s.bullets || []).join('；')}`
      ),
    ].join('\n');
  }
  if (!outline) return '';
  return [
    `PPT 大纲：${outline.title}`,
    `受众：${outline.audience} · 场景：${outline.scenario}`,
    ...outline.chapters.flatMap((ch, ci) => [
      `第${ci + 1}章 ${ch.title}`,
      ...ch.pages.map((p) => `  - ${p.title}：${p.bullets.join('；')}`),
    ]),
  ].join('\n');
}

export function serializeVideoForTeam(video: VideoResult): string {
  return [
    `视频标题：${video.title}`,
    video.coverSuggestion ? `封面建议：${video.coverSuggestion}` : '',
    '分镜：',
    ...video.segments.map(
      (s) =>
        `[${s.time}] 画面：${s.scene} | 旁白：${s.narration}${s.compliance ? ` | 合规：${s.compliance}` : ''}`
    ),
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildTeamReviewPayload(
  type: TeamContentType,
  ctx: {
    copies: CopyItem[];
    selectedCopies: boolean[];
    getCopyBody: () => string;
    generatedImages: string[];
    selectedImages: boolean[];
    videoResult: VideoResult | null;
    pptOutline: PptOutline | null;
    pptResult: PptResult | null;
  }
): { body: string; title: string } | null {
  switch (type) {
    case 'copy': {
      const selected = ctx.copies.filter((_, i) => ctx.selectedCopies[i]);
      const list = selected.length > 0 ? selected : ctx.copies;
      const body = list.map((c) => `【${c.title}】\n${c.body}`).join('\n\n');
      const fromActive = ctx.getCopyBody();
      const finalBody = body || fromActive;
      if (!finalBody.trim()) return null;
      return {
        title: list[0]?.title || '文案',
        body: finalBody,
      };
    }
    case 'visual': {
      if (!ctx.generatedImages.length) return null;
      const picked = ctx.generatedImages
        .map((_, i) => i)
        .filter((i) => ctx.selectedImages[i]);
      const indices = picked.length > 0 ? picked : [];
      if (indices.length === 0) return null;
      const copyRef = ctx.getCopyBody();
      return {
        title: `配图 ${indices.map((i) => i + 1).join('、')}`,
        body: [
          `已勾选 ${indices.length}/${ctx.generatedImages.length} 张配图/海报提交团队审阅（第 ${indices.map((i) => i + 1).join('、')} 张）。`,
          copyRef ? `关联文案：\n${copyRef.slice(0, 800)}` : '',
          '请团队从画面视觉、文案层级、品牌元素与合规表述（避免疗效承诺）方面提出修改意见。',
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }
    case 'video': {
      if (!ctx.videoResult) return null;
      return {
        title: ctx.videoResult.title,
        body: serializeVideoForTeam(ctx.videoResult),
      };
    }
    case 'ppt': {
      const body = serializePptForTeam(ctx.pptOutline, ctx.pptResult);
      if (!body.trim()) return null;
      return {
        title: ctx.pptResult?.title || ctx.pptOutline?.title || 'PPT',
        body,
      };
    }
    default:
      return null;
  }
}
