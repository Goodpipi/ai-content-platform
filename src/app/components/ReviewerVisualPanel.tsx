import { getReviewImageEntries } from '@/app/components/visualReviewUtils';

interface ReviewerVisualPanelProps {
  images: string[];
  placeholderDataUrl: string;
  onEditImage: (src: string, index: number) => void;
}

export function ReviewerVisualPanel({
  images,
  placeholderDataUrl,
  onEditImage,
}: ReviewerVisualPanelProps) {
  const entries = getReviewImageEntries(images, placeholderDataUrl);

  if (!entries.length) {
    return (
      <div className="detail-card">
        <h4>配图审阅</h4>
        <div className="small">当前任务中还没有已生成的配图，请联系内容运营。</div>
      </div>
    );
  }

  return (
    <>
      <div className="detail-card">
        <h4>配图审阅</h4>
        <div className="small">
          共 {entries.length} 张。点击「编辑配图」进入全屏编辑器，可改文字、拖拽元素或 AI
          局部重绘；保存后由内容运营采纳或恢复原图。
        </div>
      </div>
      <div className="reviewer-visual-grid">
        {entries.map(({ src, index }) => (
          <div key={`${index}-${src.slice(0, 32)}`} className="reviewer-visual-card">
            <div className="reviewer-visual-preview">
              <img src={src} alt={`配图 ${index + 1}`} />
            </div>
            <div className="reviewer-visual-card-foot">
              <span className="small">配图 {index + 1}</span>
              <button
                type="button"
                className="btn primary"
                style={{ width: '100%' }}
                onClick={() => onEditImage(src, index)}
              >
                编辑配图
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
