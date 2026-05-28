/** Figma 批量导出：?figma=<id> 加载对应演示状态 */
export const FIGMA_CAPTURE_FILE_KEY = '0yc9rH5KOYzbJIlRYZ7W6j';

export const FIGMA_CAPTURE_PAGES = [
  { id: 'home-ops', label: '01-首页（运营）' },
  { id: 'home-reviewer', label: '02-首页（审阅者）' },
  { id: 'library', label: '03-素材库' },
  { id: 'workspace-copy', label: '04-工作台-文案' },
  { id: 'workspace-visual', label: '05-工作台-配图' },
  { id: 'workspace-team', label: '06-工作台-团队修改' },
  { id: 'reviewer-copy', label: '07-审阅-文案' },
  { id: 'reviewer-visual', label: '08-审阅-配图' },
  { id: 'visual-editor', label: '09-配图编辑器' },
] as const;

export type FigmaCaptureId = (typeof FIGMA_CAPTURE_PAGES)[number]['id'];

export function parseFigmaCaptureId(): FigmaCaptureId | null {
  const raw = new URLSearchParams(window.location.search).get('figma');
  if (!raw) return null;
  return FIGMA_CAPTURE_PAGES.some((p) => p.id === raw) ? (raw as FigmaCaptureId) : null;
}

export function figmaCaptureUrl(id: FigmaCaptureId, captureId: string): string {
  const base = `http://localhost:5173/?figma=${id}`;
  const endpoint = encodeURIComponent(
    `https://mcp.figma.com/mcp/capture/${captureId}/submit`
  );
  return `${base}#figmacapture=${captureId}&figmaendpoint=${endpoint}&figmadelay=3500`;
}
