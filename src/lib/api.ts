import type {
  LibraryItem,
  TopicItem,
  CopyItem,
  TeamContentType,
  TeamResult,
  VideoResult,
  VideoRenderVersion,
  PptResult,
  PptOutline,
  PptDesignVersion,
  PosterResult,
} from '@/types/content';

const API_BASE = '/api';
const CLIENT_TIMEOUT_MS = 120_000;

export type ApiMeta = { mockUsed?: boolean; mockReason?: string };

async function post<T>(path: string, body: unknown): Promise<T & ApiMeta> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试或检查演示站服务是否可用');
    }
    throw new Error('无法连接 AI 服务，请检查网络或联系管理员确认演示站 API 是否正常');
  } finally {
    clearTimeout(timer);
  }

  let json: { ok?: boolean; error?: string; data?: T; mockUsed?: boolean; mockReason?: string };
  try {
    json = await res.json();
  } catch {
    throw new Error(`服务返回异常 (${res.status})，请检查 API 是否正常运行`);
  }
  if (!res.ok || !json.ok) {
    throw new Error(json.error || `请求失败 (${res.status})`);
  }
  return {
    ...(json.data as T),
    mockUsed: json.mockUsed,
    mockReason: json.mockReason,
  };
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export function generateInsight(materials: LibraryItem[], userNote?: string) {
  return post<{ topics: TopicItem[]; summary: string }>('/generate/insight', {
    materials: materials.filter((m) => m.def),
    userNote,
  });
}

export function generateCopy(
  materials: LibraryItem[],
  topics: TopicItem[],
  userNote?: string
) {
  return post<{ copies: CopyItem[] }>('/generate/copy', {
    materials: materials.filter((m) => m.def),
    topics,
    userNote,
  });
}

export function generateTeam(
  contentBody: string,
  options?: { feedback?: string; contentType?: TeamContentType; contentTitle?: string }
) {
  return post<TeamResult>('/generate/team', {
    copyBody: contentBody,
    feedback: options?.feedback,
    contentType: options?.contentType || 'copy',
    contentTitle: options?.contentTitle,
  });
}

export function generateVideo(copyBody: string, userNote?: string) {
  return post<VideoResult>('/generate/video', { copyBody, userNote });
}

export function generateVideoRender(script: VideoResult) {
  return post<{ versions: VideoRenderVersion[] }>('/generate/video-render', { script });
}

export function generatePpt(copyBody: string, audience?: string, userNote?: string) {
  return post<PptResult>('/generate/ppt', { copyBody, audience, userNote });
}

export function generatePptOutline(params: {
  materials: LibraryItem[];
  brief: string;
  audience: string;
  scenario: string;
  userNote?: string;
}) {
  return post<PptOutline>('/generate/ppt-outline', {
    materials: params.materials.filter((m) => m.def),
    brief: params.brief,
    audience: params.audience,
    scenario: params.scenario,
    userNote: params.userNote,
  });
}

export function generatePptDesigns(
  outline: PptOutline,
  audience: string,
  scenario: string,
  templateId?: string | null
) {
  return post<{ versions: PptDesignVersion[] }>('/generate/ppt-designs', {
    outline,
    audience,
    scenario,
    templateId: templateId || undefined,
  });
}

export function generatePoster(
  copyBody: string,
  userNote?: string,
  templateId?: string | null
) {
  return post<PosterResult>('/generate/poster', {
    copyBody,
    userNote,
    templateId: templateId || undefined,
  });
}

export function generatePosterEdit(params: {
  svg?: string;
  editPrompt: string;
  maskBounds?: { x: number; y: number; w: number; h: number } | null;
  layers?: { id: string; text: string; x: number; y: number; fontSize: number }[];
  copyBody?: string;
}) {
  return post<PosterResult>('/generate/poster-edit', params);
}

export function chat(
  materials: LibraryItem[],
  history: { role: string; content: string }[],
  message: string
) {
  return post<{ reply: string }>('/chat', { materials: materials.filter((m) => m.def), history, message });
}

export function generateSessionTitle(messages: { role: string; content: string }[]) {
  return post<{ title: string }>('/generate/session-title', { messages });
}
