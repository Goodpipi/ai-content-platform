import type { PptOutline, PptOutlineChapter, PptOutlinePage } from '@/types/content';
import { genId, outlinePageCount } from './pptUtils';
import { PPT_BUILTIN_TEMPLATES } from './pptTemplates';

interface PptOutlineEditorProps {
  outline: PptOutline;
  onChange: (outline: PptOutline) => void;
  onGenerateDesigns: (mode: 'template' | 'no-template') => void;
  onRegenerateOutline: () => void;
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string | null) => void;
  isGenerating?: boolean;
  /** 医学部 / 市场部审阅：仅编辑大纲，不触发生成 */
  reviewerMode?: boolean;
  onSaveOutlineReview?: () => void;
  /** inline：右侧 PPT大纲 标签内编辑；overlay：全屏侧栏（已弃用） */
  variant?: 'inline' | 'overlay';
  onClose?: () => void;
}

export function PptOutlineEditor({
  outline,
  onChange,
  onGenerateDesigns,
  onRegenerateOutline,
  selectedTemplateId,
  onSelectTemplate,
  isGenerating = false,
  reviewerMode = false,
  onSaveOutlineReview,
  variant = 'inline',
  onClose,
}: PptOutlineEditorProps) {
  const isInline = variant === 'inline';

  const updateChapter = (chId: string, patch: Partial<PptOutlineChapter>) => {
    onChange({
      ...outline,
      chapters: outline.chapters.map((ch) => (ch.id === chId ? { ...ch, ...patch } : ch)),
    });
  };

  const updatePage = (chId: string, pgId: string, patch: Partial<PptOutlinePage>) => {
    onChange({
      ...outline,
      chapters: outline.chapters.map((ch) =>
        ch.id === chId
          ? {
              ...ch,
              pages: ch.pages.map((pg) => (pg.id === pgId ? { ...pg, ...patch } : pg)),
            }
          : ch
      ),
    });
  };

  const addChapter = () => {
    onChange({
      ...outline,
      chapters: [
        ...outline.chapters,
        {
          id: genId('ch'),
          title: '新章节',
          pages: [{ id: genId('pg'), title: '新页面', bullets: ['要点 1'] }],
        },
      ],
    });
  };

  const addPage = (chId: string) => {
    onChange({
      ...outline,
      chapters: outline.chapters.map((ch) =>
        ch.id === chId
          ? {
              ...ch,
              pages: [...ch.pages, { id: genId('pg'), title: '新页面', bullets: ['要点 1'] }],
            }
          : ch
      ),
    });
  };

  const removePage = (chId: string, pgId: string) => {
    onChange({
      ...outline,
      chapters: outline.chapters.map((ch) => {
        if (ch.id !== chId) return ch;
        const pages = ch.pages.filter((p) => p.id !== pgId);
        return { ...ch, pages: pages.length ? pages : [{ id: genId('pg'), title: '新页面', bullets: ['要点 1'] }] };
      }),
    });
  };

  let pageNum = 0;

  const shellClass = isInline ? 'ppt-outline-inline' : 'ppt-outline-overlay';
  const panelClass = isInline ? 'ppt-outline-inline-panel' : 'ppt-outline-panel';

  return (
    <div className={shellClass}>
      <div className={panelClass}>
        <header className="ppt-outline-head">
          <div>
            {isInline ? (
              <h3 className="ppt-outline-inline-title">{outline.title}</h3>
            ) : (
              <h2>{outline.title}</h2>
            )}
            <div className="small">
              受众：{outline.audience} · 场景：{outline.scenario} · 共 {outlinePageCount(outline)} 页
            </div>
          </div>
          {!isInline && onClose && (
            <button type="button" className="ppt-close-btn" onClick={onClose} aria-label="关闭">
              ×
            </button>
          )}
        </header>

        {!reviewerMode && (
          <div className="ppt-outline-toolbar">
            <button type="button" className="btn soft" onClick={onRegenerateOutline} disabled={isGenerating}>
              重新生成大纲
            </button>
          </div>
        )}

        <div className="ppt-outline-body">
          {outline.chapters.map((ch, chIdx) => (
            <section key={ch.id} className="ppt-chapter">
              <div className="ppt-chapter-head">
                <span className="ppt-chapter-num">{chIdx + 1}</span>
                <input
                  className="ppt-chapter-title input"
                  value={ch.title}
                  onChange={(e) => updateChapter(ch.id, { title: e.target.value })}
                />
              </div>

              <div className="ppt-pages">
                {ch.pages.map((pg) => {
                  pageNum += 1;
                  const n = pageNum;
                  return (
                    <div key={pg.id} className="ppt-page-card">
                      <div className="ppt-page-num">{n}</div>
                      <div className="ppt-page-body">
                        <input
                          className="ppt-page-title input"
                          value={pg.title}
                          onChange={(e) => updatePage(ch.id, pg.id, { title: e.target.value })}
                        />
                        <textarea
                          className="ppt-page-bullets"
                          value={pg.bullets.join('\n')}
                          placeholder="每行一条要点"
                          onChange={(e) =>
                            updatePage(ch.id, pg.id, {
                              bullets: e.target.value.split('\n').filter(Boolean),
                            })
                          }
                        />
                        {ch.pages.length > 1 && (
                          <button
                            type="button"
                            className="ppt-remove-page"
                            onClick={() => removePage(ch.id, pg.id)}
                          >
                            删除页面
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button type="button" className="ppt-add-page" onClick={() => addPage(ch.id)}>
                  + 添加页面
                </button>
              </div>
            </section>
          ))}

          <button type="button" className="ppt-add-chapter" onClick={addChapter}>
            + 添加章节
          </button>
        </div>

        {!reviewerMode && (
          <section className="ppt-template-section">
            <h4 className="ppt-template-heading">选择 PPT 模板（可选）</h4>
            <div className="small" style={{ marginBottom: 10 }}>
              可选一套内置模板；不选用模板时在下方生成 3 套方案供对比。
            </div>
            <div className="ppt-template-grid">
              {PPT_BUILTIN_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className={`ppt-template-card ${selectedTemplateId === tpl.id ? 'selected' : ''}`}
                  onClick={() => onSelectTemplate(tpl.id)}
                >
                  <div
                    className="ppt-template-preview"
                    style={{ background: tpl.gradient }}
                  >
                    <span className="ppt-template-accent" style={{ background: tpl.accent }} />
                  </div>
                  <strong>{tpl.name}</strong>
                  <div className="small">{tpl.styleTag}</div>
                  <div className="small ppt-template-desc">{tpl.description}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="ppt-outline-foot">
          {reviewerMode ? (
            <>
              <button
                type="button"
                className="btn ppt-generate-btn primary"
                onClick={() => onSaveOutlineReview?.()}
              >
                保存大纲修改
              </button>
              <div className="small">
                仅需修改章节与页面要点，无需生成 PPT。保存后内容运营可在同一会话「PPT大纲」中查看。
              </div>
            </>
          ) : (
            <>
              <div className="ppt-generate-actions">
                <button
                  type="button"
                  className="btn ppt-generate-btn ppt-generate-btn-alt"
                  disabled={isGenerating}
                  onClick={() => onGenerateDesigns('no-template')}
                >
                  {isGenerating ? '生成中…' : '不选用模板直接生成'}
                </button>
                <button
                  type="button"
                  className="btn ppt-generate-btn primary"
                  disabled={isGenerating || !selectedTemplateId}
                  onClick={() => onGenerateDesigns('template')}
                >
                  {isGenerating ? '生成中…' : '按模板生成 PPT'}
                </button>
              </div>
              <div className="small ppt-generate-hint">
                {selectedTemplateId
                  ? `已选「${PPT_BUILTIN_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name}」· 左：3 套方案 · 右：按模板一套`
                  : '请先在上方选择模板，或点击「不选用模板直接生成」'}
              </div>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
