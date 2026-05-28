import type { CopyRevision, ReviewTask, ReviewTaskStatus } from '@/types/review';
import type { UserRole } from '@/types/review';
import type { TeamContentType } from '@/types/content';
import type { TabKey } from '@/types/session';
import type { SessionWorkspace } from '@/types/session';
import { DEMO_SESSION_ID } from '@/lib/chatSessions';

/** 审阅任务默认聚焦的标签（单标签类型） */
export function reviewerTabForContentType(contentType: TeamContentType): TabKey {
  const tabs = reviewerTabsForContentType(contentType, null);
  return tabs[0] || 'copy';
}

export type ReviewerWorkspaceSnapshot = Pick<
  SessionWorkspace,
  'pptOutline' | 'pptVersions' | 'pptResult' | 'videoVersions'
>;

/** 审阅任务可访问的标签（医学部/市场部 PPT 仅改大纲，不含生成成品） */
export function reviewerTabsForContentType(
  contentType: TeamContentType,
  _workspace?: ReviewerWorkspaceSnapshot | SessionWorkspace | null | undefined
): TabKey[] {
  switch (contentType) {
    case 'copy':
      return ['copy'];
    case 'visual':
      return ['visual'];
    case 'ppt':
      return ['ppt-outline'];
    case 'video':
      return (workspace?.videoVersions?.length ?? 0) > 0
        ? ['video-render']
        : ['video-script'];
    default:
      return ['copy'];
  }
}

const STORAGE_KEY = 'acp_review_tasks_v1';

export function loadReviewTasks(): ReviewTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReviewTask[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveReviewTasks(tasks: ReviewTask[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function upsertReviewTask(task: ReviewTask): void {
  const all = loadReviewTasks().filter((t) => t.id !== task.id);
  all.push({ ...task, updatedAt: Date.now() });
  saveReviewTasks(all.sort((a, b) => b.updatedAt - a.updatedAt));
}

export function getReviewTask(id: string): ReviewTask | undefined {
  return loadReviewTasks().find((t) => t.id === id);
}

export function tasksForRole(role: UserRole): ReviewTask[] {
  if (role !== 'medical' && role !== 'marketing') return [];
  return loadReviewTasks().filter((t) => t.assigneeRole === role);
}

/** 同一会话下所有文案审阅任务（医学部 + 市场部） */
export function copyReviewTasksForSession(sessionId: string): ReviewTask[] {
  return loadReviewTasks().filter(
    (t) => t.sessionId === sessionId && t.contentType === 'copy'
  );
}

/** 合并会话内各审阅任务的文案修改记录（按时间排序、按 id 去重） */
export function mergeSessionCopyRevisions(sessionId: string): CopyRevision[] {
  const byId = new Map<string, CopyRevision>();
  for (const task of copyReviewTasksForSession(sessionId)) {
    for (const rev of task.copyRevisions ?? []) {
      byId.set(rev.id, rev);
    }
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

/** 会话文案审阅的共用基准正文 */
export function sessionCopyRevisionBase(sessionId: string): string {
  const tasks = copyReviewTasksForSession(sessionId);
  for (const t of tasks) {
    const base = t.copyRevisionBase || t.baseCopyText;
    if (base?.trim()) return base;
  }
  return '';
}

/** 将文案修订同步到同会话所有文案审阅任务，便于医学部/市场部互相可见 */
export function propagateCopyRevisionsToSession(
  sessionId: string,
  revisions: CopyRevision[],
  revisionBase: string,
  options?: { activeTaskId?: string; statusForActive?: ReviewTaskStatus }
): void {
  const tasks = copyReviewTasksForSession(sessionId);
  if (!tasks.length) return;
  const now = Date.now();
  const all = loadReviewTasks().filter((t) => !tasks.some((ct) => ct.id === t.id));
  const updated = tasks.map((t) => ({
    ...t,
    copyRevisions: revisions,
    copyRevisionBase: revisionBase || t.copyRevisionBase,
    baseCopyText: t.baseCopyText || revisionBase || undefined,
    status:
      options?.activeTaskId === t.id && options.statusForActive
        ? options.statusForActive
        : t.status,
    updatedAt: options?.activeTaskId === t.id ? now : t.updatedAt,
  }));
  saveReviewTasks([...all, ...updated].sort((a, b) => b.updatedAt - a.updatedAt));
}

export function updateTaskStatus(id: string, status: ReviewTaskStatus): void {
  const task = getReviewTask(id);
  if (!task) return;
  upsertReviewTask({ ...task, status });
}

export function seedReviewTasksIfEmpty(): void {
  if (loadReviewTasks().length > 0) return;
  const now = Date.now();
  saveReviewTasks([
    {
      id: 'rt_demo_medical',
      sessionId: DEMO_SESSION_ID,
      title: '可申达｜小红书疾病教育图文',
      contentType: 'copy',
      assigneeRole: 'medical',
      assigneeName: '小王',
      assignerName: '小张',
      deadline: new Date(now + 86400000 * 2).toISOString().slice(0, 16),
      status: 'pending',
      createdAt: now - 3600000,
      updatedAt: now - 3600000,
      baseCopyText:
        '肾脏健康常常被忽略。了解相关风险因素，出现疑问时请咨询专业医生。',
    },
    {
      id: 'rt_demo_visual',
      sessionId: DEMO_SESSION_ID,
      title: '可申达｜配图团队审阅',
      contentType: 'visual',
      assigneeRole: 'medical',
      assigneeName: '小王',
      assignerName: '小张',
      deadline: new Date(now + 86400000 * 2).toISOString().slice(0, 16),
      status: 'pending',
      createdAt: now - 1800000,
      updatedAt: now - 1800000,
    },
    {
      id: 'rt_demo_marketing',
      sessionId: DEMO_SESSION_ID,
      title: '可申达｜HCP拜访材料改写',
      contentType: 'ppt',
      assigneeRole: 'marketing',
      assigneeName: '小李',
      assignerName: '小张',
      deadline: new Date(now + 86400000 * 3).toISOString().slice(0, 16),
      status: 'in_progress',
      createdAt: now - 7200000,
      updatedAt: now - 1800000,
    },
  ]);
}
