import { useEffect, useMemo, useState } from 'react';
import {
  IMAGE_BUILTIN_TEMPLATES,
  imageTemplateIdFromTitle,
  type ImageBuiltinTemplate,
} from '@/app/components/imageTemplates';

interface ImageTemplatePickerModalProps {
  open: boolean;
  preferredTitle?: string;
  onClose: () => void;
  /** 不使用模板，直接生成 */
  onSkip: () => void;
  /** 按所选模板各生成一版配图 */
  onConfirm: (templateIds: string[]) => void;
}

export function ImageTemplatePickerModal({
  open,
  preferredTitle = '',
  onClose,
  onSkip,
  onConfirm,
}: ImageTemplatePickerModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const preferredId = preferredTitle ? imageTemplateIdFromTitle(preferredTitle) : null;

  useEffect(() => {
    if (!open) return;
    const initial = preferredId ? [preferredId] : [];
    setSelectedIds(initial);
    setDetailId(preferredId || IMAGE_BUILTIN_TEMPLATES[0]?.id || null);
  }, [open, preferredId]);

  const detailTemplate = useMemo(
    () => IMAGE_BUILTIN_TEMPLATES.find((t) => t.id === detailId) ?? null,
    [detailId]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? IMAGE_BUILTIN_TEMPLATES.map((t) => t.id) : []);
  };

  const openDetail = (tpl: ImageBuiltinTemplate) => {
    setDetailId(tpl.id);
  };

  if (!open) return null;

  return (
    <div
      className="modal-bg show image-template-modal-bg"
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('modal-bg')) onClose();
      }}
    >
      <div
        className="modal image-template-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="image-template-modal-head">
          <div>
            <h3>选择配图模板</h3>
            <div className="small">
              可多选；将按每个模板各生成一版配图。点击缩略图查看详情，勾选后确认生成。
            </div>
          </div>
          <button type="button" className="ppt-close-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="image-template-modal-body">
          <div className="image-template-grid-wrap">
            <label className="option image-template-select-all">
              <input
                type="checkbox"
                checked={
                  selectedIds.length === IMAGE_BUILTIN_TEMPLATES.length &&
                  IMAGE_BUILTIN_TEMPLATES.length > 0
                }
                onChange={(e) => selectAll(e.target.checked)}
              />
              <strong>全选</strong>
              <span className="small">已选 {selectedIds.length} 个</span>
            </label>
            <div className="image-template-picker-grid">
              {IMAGE_BUILTIN_TEMPLATES.map((tpl) => {
                const selected = selectedIds.includes(tpl.id);
                const isDetail = detailId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    className={`image-template-picker-card ${selected ? 'selected' : ''} ${
                      isDetail ? 'detail-active' : ''
                    }`}
                  >
                    <label className="image-template-picker-check">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(tpl.id)}
                      />
                    </label>
                    <button
                      type="button"
                      className="image-template-thumb-btn"
                      onClick={() => openDetail(tpl)}
                    >
                      <div
                        className="image-template-thumb"
                        style={{ background: tpl.gradient }}
                      >
                        {tpl.previewImg ? (
                          <img src={tpl.previewImg} alt={tpl.name} />
                        ) : (
                          <span
                            className="image-template-thumb-accent"
                            style={{ background: tpl.accent }}
                          />
                        )}
                      </div>
                      <strong>{tpl.name}</strong>
                    </button>
                    <button
                      type="button"
                      className="btn soft image-template-detail-link"
                      onClick={() => openDetail(tpl)}
                    >
                      查看详情
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="image-template-detail-panel">
            {detailTemplate ? (
              <>
                <div
                  className="image-template-detail-preview"
                  style={{ background: detailTemplate.gradient }}
                >
                  {detailTemplate.previewImg ? (
                    <img src={detailTemplate.previewImg} alt={detailTemplate.name} />
                  ) : (
                    <span
                      className="image-template-detail-accent"
                      style={{ background: detailTemplate.accent }}
                    />
                  )}
                </div>
                <h4>{detailTemplate.name}</h4>
                <p className="small" style={{ lineHeight: 1.6 }}>
                  {detailTemplate.description}
                </p>
                <div className="detail-card" style={{ marginTop: 12 }}>
                  <div className="small">
                    <strong>风格</strong>
                    <br />
                    {detailTemplate.styleHint}
                  </div>
                </div>
                <div className="detail-card">
                  <div className="small">
                    <strong>版式</strong>
                    <br />
                    {detailTemplate.layoutHint}
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn ${selectedIds.includes(detailTemplate.id) ? 'soft' : 'primary'}`}
                  style={{ width: '100%', marginTop: 12 }}
                  onClick={() => toggleSelect(detailTemplate.id)}
                >
                  {selectedIds.includes(detailTemplate.id)
                    ? '取消选用此模板'
                    : '选用此模板'}
                </button>
              </>
            ) : (
              <div className="small">请选择左侧模板查看详情</div>
            )}
          </aside>
        </div>

        <footer className="image-template-modal-foot">
          <button type="button" className="btn soft" onClick={onSkip}>
            不使用模板，直接生成
          </button>
          <div className="quick-row" style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={selectedIds.length === 0}
              onClick={() => onConfirm(selectedIds)}
            >
              确认生成（{selectedIds.length} 个模板）
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
