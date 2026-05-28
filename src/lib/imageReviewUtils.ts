import type { ImageReviewStatus } from '@/types/review';

/** 与 generatedImages 下标对齐的原图 / 审阅状态 */
export function alignImageReviewArrays(
  images: string[],
  origins: string[],
  statuses: ImageReviewStatus[]
): { origins: string[]; statuses: ImageReviewStatus[] } {
  return {
    origins: images.map((img, i) => origins[i] ?? img),
    statuses: images.map((_, i) => statuses[i] ?? null),
  };
}

export function hasPendingImageReviews(statuses: ImageReviewStatus[]): boolean {
  return statuses.some((s) => s === 'pending');
}

export function pendingImageReviewIndices(statuses: ImageReviewStatus[]): number[] {
  return statuses
    .map((s, i) => (s === 'pending' ? i : -1))
    .filter((i) => i >= 0);
}
