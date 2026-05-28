import type {
  TopicItem,
  CopyItem,
  TeamResult,
  VideoResult,
  VideoRenderVersion,
  PptResult,
  PptOutline,
  PptDesignVersion,
} from '@/types/content';
import type { HomeEntryContext } from '@/app/components/homeGuide';
import type { CopyRevision, ImageReviewStatus } from '@/types/review';

export type TabKey =
  | 'insight'
  | 'copy'
  | 'team'
  | 'visual'
  | 'video-script'
  | 'video-render'
  | 'ppt-outline'
  | 'ppt-design'
  | 'submit';

export interface ChatMessage {
  role: 'user' | 'ai';
  html: string;
  model: string;
  quick?: string[];
  /** 生成中的占位消息，完成后移除 */
  loading?: boolean;
}

export interface SessionAppState {
  tabs: TabKey[];
  active: TabKey | null;
  insight: boolean;
  copy: boolean;
  team: boolean;
  visual: boolean;
  videoScript: boolean;
  videoRender: boolean;
  pptOutline: boolean;
  pptDesign: boolean;
  submit: boolean;
}

export interface SessionWorkspace {
  state: SessionAppState;
  topics: TopicItem[];
  copies: CopyItem[];
  teamResult: TeamResult | null;
  videoResult: VideoResult | null;
  videoVersions: VideoRenderVersion[];
  selectedVideoVersionId: string | null;
  pptResult: PptResult | null;
  pptOutline: PptOutline | null;
  pptVersions: PptDesignVersion[];
  selectedPptVersionId: string | null;
  selectedPptTemplateId: string | null;
  generatedImages: string[];
  /** 团队审阅前或上次采纳时的原图（与 generatedImages 下标对齐） */
  imageReviewOrigins?: string[];
  /** 每张配图的采纳状态（审阅者保存后为 pending） */
  imageReviewStatuses?: ImageReviewStatus[];
  selectedImages: boolean[];
  insightSummary: string;
  selectedTopics: boolean[];
  selectedCopies: boolean[];
  copyRevisions: CopyRevision[];
  copyRevisionBase: string;
  entryContext: HomeEntryContext | null;
  pptWizard: {
    active: boolean;
    step: 'audience' | 'scenario' | null;
    audience: string;
    scenario: string;
    pendingNote: string;
  } | null;
  visualWizard: {
    active: boolean;
    step: 'ask' | 'template';
    pendingNote: string;
    templateHint: string;
  } | null;
}

export type SessionStatus = 'draft' | 'in_progress' | 'team' | 'submitted';

export interface ChatSession {
  id: string;
  title: string;
  titleLocked: boolean;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  workspace: SessionWorkspace;
}
