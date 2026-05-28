import type { ChatMessage, ChatSession, SessionStatus } from '@/types/session';

const STORAGE_KEY = 'acp_chat_sessions_v1';
export const DEMO_SESSION_ID = 'sess_demo_team';
/** 新建对话的默认标题；非此标题视为已命名，不再自动改名 */
export const DEFAULT_SESSION_TITLE = '可申达｜新内容任务';

export function loadAllSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveSession(session: ChatSession): void {
  const all = loadAllSessions().filter((s) => s.id !== session.id);
  all.push({ ...session, updatedAt: Date.now() });
  all.sort((a, b) => b.updatedAt - a.updatedAt);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function deleteSession(id: string): void {
  const all = loadAllSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getSession(id: string): ChatSession | undefined {
  return loadAllSessions().find((s) => s.id === id);
}

export function formatSessionTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `今天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return `昨天 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function deriveSessionStatus(session: ChatSession): SessionStatus {
  const { state } = session.workspace;
  if (state.submit) return 'submitted';
  if (state.team) return 'team';
  if (state.tabs.length > 0) return 'in_progress';
  return 'draft';
}

export function sessionStatusLabel(status: SessionStatus): string {
  switch (status) {
    case 'submitted':
      return '已提交Veeva';
    case 'team':
      return '团队修改中';
    case 'in_progress':
      return '进行中';
    default:
      return '草稿';
  }
}

export function sessionStatusBadgeClass(status: SessionStatus): string {
  switch (status) {
    case 'submitted':
      return 'badge green';
    case 'team':
      return 'badge warn';
    case 'in_progress':
      return 'badge';
    default:
      return 'badge';
  }
}

export function deriveSessionSubtitle(session: ChatSession): string {
  const ctx = session.workspace.entryContext;
  const intent = ctx?.intent;
  const parts: string[] = [`KS-${session.id.slice(-6).toUpperCase()}`];
  if (intent === 'insight') parts.push('话题洞察');
  else if (intent === 'copy') parts.push('文案');
  else if (intent === 'visual' || intent === 'visual-template') parts.push('配图');
  else if (intent === 'video') parts.push('视频');
  else if (intent === 'ppt' || intent === 'ppt-template') parts.push('PPT');
  const firstUser = session.messages.find((m) => m.role === 'user');
  if (firstUser) {
    const t = firstUser.html.replace(/<[^>]+>/g, '').trim().slice(0, 28);
    if (t) parts.push(t);
  }
  return parts.join(' · ');
}

export function fallbackSessionTitle(messages: ChatMessage[]): string {
  const userTexts = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.html.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
  const text = userTexts[userTexts.length - 1] || userTexts[0] || '';
  if (!text) return DEFAULT_SESSION_TITLE;
  const core = text.length > 20 ? `${text.slice(0, 20)}…` : text;
  return `可申达｜${core}`;
}

export function seedSessionsIfEmpty(): ChatSession[] {
  const existing = loadAllSessions();
  if (existing.length > 0) return existing;

  const now = Date.now();
  const seeds: ChatSession[] = [
    {
      id: DEMO_SESSION_ID,
      title: '可申达｜小红书疾病教育图文',
      titleLocked: true,
      createdAt: now - 3600000,
      updatedAt: now - 600000,
      messages: [
        {
          role: 'ai',
          html: '已加载进行中任务：团队修改意见已收集，可以继续选择文案生成图片、PPT 或视频脚本。',
          model: 'DeepSeek-V3.1',
          quick: ['生成图片', '生成PPT', '提交当前版本到Veeva Vault'],
        },
      ],
      workspace: {
        state: {
          tabs: ['team'],
          active: 'team',
          insight: false,
          copy: false,
          team: true,
          visual: false,
          videoScript: false,
          videoRender: false,
          pptOutline: false,
          pptDesign: false,
          submit: false,
        },
        topics: [],
        copies: [],
        teamResult: {
          contentType: 'copy',
          contentTitle: '小红书疾病教育图文',
          before: '改善肾脏健康，从现在开始。',
          after: '肾脏健康常常被忽略。了解相关风险因素，出现疑问时请咨询专业医生。',
          changes: ['降低营销感', '疾病教育'],
          summary: '团队修改意见已整合，可继续生成配图或 PPT。',
        },
        videoResult: null,
        videoVersions: [],
        selectedVideoVersionId: null,
        pptResult: null,
        pptOutline: null,
        pptVersions: [],
        selectedPptVersionId: null,
        selectedPptTemplateId: null,
        generatedImages: [],
        selectedImages: [],
        insightSummary: '',
        selectedTopics: [],
        selectedCopies: [],
        copyRevisions: [],
        copyRevisionBase: '',
        entryContext: { intent: 'copy' },
        pptWizard: null,
        visualWizard: null,
      },
    },
    {
      id: 'sess_demo_hcp',
      title: '可申达｜HCP拜访材料改写',
      titleLocked: true,
      createdAt: now - 86400000,
      updatedAt: now - 43200000,
      messages: [
        {
          role: 'ai',
          html: '文案已生成，可在右侧查看并继续生成配图或 PPT。',
          model: 'DeepSeek-V3.1',
          quick: ['生成图片', '生成PPT'],
        },
      ],
      workspace: {
        state: {
          tabs: ['copy'],
          active: 'copy',
          insight: false,
          copy: true,
          team: false,
          visual: false,
          videoScript: false,
          videoRender: false,
          pptOutline: false,
          pptDesign: false,
          submit: false,
        },
        topics: [],
        copies: [{ title: 'HCP沟通稿', body: '示例文案内容…', compliance: '' }],
        teamResult: null,
        videoResult: null,
        videoVersions: [],
        selectedVideoVersionId: null,
        pptResult: null,
        pptOutline: null,
        pptVersions: [],
        selectedPptVersionId: null,
        selectedPptTemplateId: null,
        generatedImages: [],
        selectedImages: [],
        insightSummary: '',
        selectedTopics: [],
        selectedCopies: [true],
        copyRevisions: [],
        copyRevisionBase: '',
        entryContext: { intent: 'copy' },
        pptWizard: null,
        visualWizard: null,
      },
    },
    {
      id: 'sess_demo_patient',
      title: '可申达｜患者教育长图',
      titleLocked: true,
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000 * 4,
      messages: [],
      workspace: {
        state: {
          tabs: ['submit'],
          active: 'submit',
          insight: true,
          copy: true,
          team: false,
          visual: true,
          videoScript: false,
          videoRender: false,
          pptOutline: false,
          pptDesign: false,
          submit: true,
        },
        topics: [],
        copies: [],
        teamResult: null,
        videoResult: null,
        videoVersions: [],
        selectedVideoVersionId: null,
        pptResult: null,
        pptOutline: null,
        pptVersions: [],
        selectedPptVersionId: null,
        selectedPptTemplateId: null,
        generatedImages: [],
        selectedImages: [],
        insightSummary: '',
        selectedTopics: [],
        selectedCopies: [],
        copyRevisions: [],
        copyRevisionBase: '',
        entryContext: { intent: 'visual' },
        pptWizard: null,
        visualWizard: null,
      },
    },
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeds));
  return seeds.sort((a, b) => b.updatedAt - a.updatedAt);
}
