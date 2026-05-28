/** 审阅列表：映射到 generatedImages 的真实下标，并过滤运营端的演示占位图 */
export function getReviewImageEntries(
  images: string[],
  placeholderDataUrl: string
): { src: string; index: number }[] {
  if (!images.length) return [];
  const hasReal = images.some((img) => img !== placeholderDataUrl);
  return images
    .map((src, index) => ({ src, index }))
    .filter(({ src }) => !hasReal || src !== placeholderDataUrl);
}
