import type { PptSlide } from '@/types/content';
import { slideToPreviewUrl } from '@/app/components/pptUtils';
import { downloadDataUrl } from '@/lib/copyRevisionUtils';

interface PptSlidesPanelProps {
  slides: PptSlide[];
  title?: string;
  onEditSlide: (index: number, previewUrl: string) => void;
}

export function PptSlidesPanel({ slides, title, onEditSlide }: PptSlidesPanelProps) {
  const exportSlide = (slide: PptSlide, index: number) => {
    const url = slideToPreviewUrl(slide);
    downloadDataUrl(url, `${title || 'PPT'}-第${slide.page || index + 1}页.png`);
  };

  const exportAll = () => {
    slides.forEach((s, i) => {
      setTimeout(() => exportSlide(s, i), i * 200);
    });
  };

  return (
    <div className="ppt-slides-panel">
      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <h4 style={{ margin: 0 }}>PPT 分页预览与编辑</h4>
          <button type="button" className="btn soft" onClick={exportAll}>
            导出全部页面
          </button>
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          点击页面进入与配图相同的视觉编辑器；支持单页导出 PNG。
        </div>
      </div>
      <div className="ppt-slide-grid">
        {slides.map((slide, index) => {
          const preview = slideToPreviewUrl(slide);
          return (
            <div key={slide.page ?? index} className="ppt-slide-card">
              <div
                className="ppt-slide-preview content-tile"
                onClick={() => onEditSlide(index, preview)}
              >
                <img src={preview} alt={slide.title} />
                <span className="img-edit-hint">点击编辑本页</span>
              </div>
              <div className="ppt-slide-card-meta">
                <strong>
                  第 {slide.page ?? index + 1} 页 · {slide.title}
                </strong>
                <div className="quick-row" style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn soft"
                    style={{ flex: 1 }}
                    onClick={() => onEditSlide(index, preview)}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={() => exportSlide(slide, index)}
                  >
                    导出
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
