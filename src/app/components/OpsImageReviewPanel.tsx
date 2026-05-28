import type { ImageReviewStatus } from '@/types/review';
import { pendingImageReviewIndices } from '@/lib/imageReviewUtils';

interface OpsImageReviewPanelProps {
  images: string[];
  origins: string[];
  statuses: ImageReviewStatus[];
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

export function OpsImageReviewPanel({
  images,
  origins,
  statuses,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
}: OpsImageReviewPanelProps) {
  const pending = pendingImageReviewIndices(statuses);
  if (!pending.length) return null;

  return (
    <div className="detail-card ops-image-review-panel">
      <h4>配图审阅待处理</h4>
      <div className="small" style={{ marginBottom: 12 }}>
        医学部 / 市场部已提交 {pending.length} 张修改配图，请逐张采纳，或一键恢复为原图。
      </div>
      <div className="ops-image-review-bulk">
        <button type="button" className="btn primary" onClick={onAcceptAll}>
          全部采纳
        </button>
        <button type="button" className="btn warn" onClick={onRejectAll}>
          全部恢复原图
        </button>
      </div>
      <div className="ops-image-review-list">
        {pending.map((index) => (
          <div key={index} className="ops-image-review-item">
            <div className="ops-image-review-compare">
              <figure>
                <figcaption className="small">原图</figcaption>
                <img src={origins[index] || images[index]} alt={`原图 ${index + 1}`} />
              </figure>
              <figure>
                <figcaption className="small">审阅修改</figcaption>
                <img src={images[index]} alt={`修改 ${index + 1}`} />
              </figure>
            </div>
            <div className="ops-image-review-actions">
              <span className="small">配图 {index + 1}</span>
              <button type="button" className="btn primary" onClick={() => onAccept(index)}>
                采纳修改
              </button>
              <button type="button" className="btn soft" onClick={() => onReject(index)}>
                拒绝 · 恢复原图
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
