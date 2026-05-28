import type { UserRole } from '@/types/review';
import { ROLE_PROFILES } from '@/types/review';

const STORAGE_KEY = 'acp_user_role_v1';

export function loadUserRole(): UserRole {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'medical' || raw === 'marketing' || raw === 'ops') return raw;
  } catch {
    /* ignore */
  }
  return 'ops';
}

export function saveUserRole(role: UserRole): void {
  localStorage.setItem(STORAGE_KEY, role);
}

export function isReviewerRole(role: UserRole): role is 'medical' | 'marketing' {
  return role === 'medical' || role === 'marketing';
}

export function roleLabel(role: UserRole): string {
  const p = ROLE_PROFILES[role];
  return `${p.name}-${p.dept}`;
}
