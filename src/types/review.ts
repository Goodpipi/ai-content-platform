import type { TeamContentType } from '@/types/content';

/** 工作台角色：内容运营 / 医学部 / 市场部 */
export type UserRole = 'ops' | 'medical' | 'marketing';

export interface RoleProfile {
  id: UserRole;
  name: string;
  dept: string;
}

export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  ops: { id: 'ops', name: '小张', dept: '内容运营' },
  medical: { id: 'medical', name: '小王', dept: '医学部' },
  marketing: { id: 'marketing', name: '小李', dept: '市场部' },
};

export type ReviewTaskStatus = 'pending' | 'in_progress' | 'completed';

/** 运营分配给医学部 / 市场部的团队修改任务 */
export interface ReviewTask {
  id: string;
  sessionId: string;
  title: string;
  contentType: TeamContentType;
  assigneeRole: 'medical' | 'marketing';
  assigneeName: string;
  assignerName: string;
  deadline: string;
  status: ReviewTaskStatus;
  createdAt: number;
  updatedAt: number;
  /** 文案审阅时的基准正文 */
  baseCopyText?: string;
  /** 审阅者保存的文案修改记录（运营端可查看） */
  copyRevisions?: CopyRevision[];
  copyRevisionBase?: string;
}

export type CopyDiffKind = 'equal' | 'add' | 'delete';

export interface CopyDiffSegment {
  kind: CopyDiffKind;
  text: string;
}

/** 单次审阅者的修改记录（相对上一版） */
export interface CopyRevision {
  id: string;
  authorRole: UserRole;
  authorName: string;
  authorDept: string;
  createdAt: number;
  segments: CopyDiffSegment[];
  resultText: string;
}

/** 配图团队审阅：待运营采纳 / 已采纳 / 已拒绝恢复原图 */
export type ImageReviewStatus = 'pending' | 'accepted' | 'rejected' | null;

export const AUTHOR_COLORS: Record<UserRole, { add: string; del: string; label: string }> = {
  ops: { add: '#2e7d32', del: '#c62828', label: '内容运营' },
  medical: { add: '#1565c0', del: '#b71c1c', label: '医学部' },
  marketing: { add: '#6a1b9a', del: '#e65100', label: '市场部' },
};
