import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  applyElementProps,
  prepareEditableSvg,
  readElementProps,
  resolveEditableSvgSource,
  serializeSvgFromContainer,
  svgToDataUrl,
  getTranslate,
  setTranslate,
  type SvgElementInfo,
} from './svgEditorUtils';

export type EditMode = 'brush' | 'drag';

/** @deprecated 保留 API 兼容 */
export interface DragLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: string;
  color?: string;
  width?: number;
}

interface ElementProps {
  text: string;
  fill: string;
  fontSize: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
  opacity: number;
}

interface VisualEditorProps {
  imageSrc: string;
  initialSvg?: string;
  onClose: () => void;
  onUpdate: (dataUrl: string, svg?: string) => void;
  onGenerate: (params: {
    editPrompt: string;
    maskBounds: { x: number; y: number; w: number; h: number } | null;
    svg?: string;
    layers: DragLayer[];
  }) => Promise<{ dataUrl: string; svg?: string; title?: string }>;
  isGenerating?: boolean;
}

function getMaskBounds(canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 20) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!found) return null;
  const pad = 8;
  return {
    x: (Math.max(0, minX - pad) / width) * 100,
    y: (Math.max(0, minY - pad) / height) * 100,
    w: (Math.min(width, maxX + pad) - Math.max(0, minX - pad)) / width * 100,
    h: (Math.min(height, maxY + pad) - Math.max(0, minY - pad)) / height * 100,
  };
}

export function VisualEditor({
  imageSrc,
  initialSvg,
  onClose,
  onUpdate,
  onGenerate,
  isGenerating = false,
}: VisualEditorProps) {
  const [mode, setMode] = useState<EditMode>('brush');
  const [editPrompt, setEditPrompt] = useState(
    '把圈选区域调整得更清爽，减少营销感，保持拜耳蓝绿风格。'
  );
  const [svgHtml, setSvgHtml] = useState('');
  const [showRasterBack, setShowRasterBack] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [elementList, setElementList] = useState<SvgElementInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [props, setProps] = useState<ElementProps | null>(null);

  const svgHostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const strokeHistory = useRef<ImageData[]>([]);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origTx: number;
    origTy: number;
    scale: number;
  } | null>(null);

  const loadSvg = useCallback((raw: string) => {
    const { svg, elements } = prepareEditableSvg(raw);
    setSvgHtml(svg);
    setElementList(elements);
    setSelectedId(null);
    setProps(null);
  }, []);

  useEffect(() => {
    setLoadFailed(false);
    setShowRasterBack(false);
    const raw = resolveEditableSvgSource(imageSrc, initialSvg);
    if (raw) {
      loadSvg(raw);
      const isRasterWrap =
        !initialSvg?.trim() &&
        imageSrc &&
        !imageSrc.startsWith('data:image/svg+xml');
      if (isRasterWrap) setShowRasterBack(true);
      return;
    }
    if (imageSrc) {
      setShowRasterBack(true);
      setLoadFailed(true);
    }
  }, [imageSrc, initialSvg, loadSvg]);

  useLayoutEffect(() => {
    if (!svgHtml || !imageSrc) return;
    const host = svgHostRef.current;
    const svg = host?.querySelector('svg');
    if (!svg) {
      setShowRasterBack(true);
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) setShowRasterBack(true);
  }, [svgHtml, imageSrc]);

  const getCurrentSvg = useCallback(() => {
    if (!svgHostRef.current) return svgHtml;
    return serializeSvgFromContainer(svgHostRef.current);
  }, [svgHtml]);

  const selectElement = useCallback((id: string) => {
    const host = svgHostRef.current;
    if (!host) return;
    const el = host.querySelector(`[data-edit-id="${id}"]`);
    if (!el) return;

    host.querySelectorAll('.svg-edit-selected').forEach((n) => n.classList.remove('svg-edit-selected'));
    el.classList.add('svg-edit-selected');
    setSelectedId(id);
    const p = readElementProps(el);
    setProps({
      text: p.text,
      fill: p.fill,
      fontSize: p.fontSize,
      x: Math.round(p.x),
      y: Math.round(p.y),
      width: p.width,
      height: p.height,
      size: p.size ?? p.fontSize,
      opacity: p.opacity,
    });
  }, []);

  const updateSelectedDom = useCallback(
    (patch: Partial<ElementProps>) => {
      if (!selectedId || !svgHostRef.current) return;
      const el = svgHostRef.current.querySelector(`[data-edit-id="${selectedId}"]`);
      if (!el) return;
      applyElementProps(el, patch);
      const p = readElementProps(el);
      setProps({
        text: p.text,
        fill: p.fill,
        fontSize: p.fontSize,
        x: Math.round(p.x),
        y: Math.round(p.y),
        width: p.width,
        height: p.height,
        size: p.size ?? p.fontSize,
        opacity: p.opacity,
      });
    },
    [selectedId]
  );

  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || mode !== 'drag' || !svgHtml) return;

    host.querySelectorAll('[data-edit-id]').forEach((node) => {
      (node as SVGElement).style.pointerEvents = 'all';
      (node as SVGElement).style.cursor = 'move';
    });

    const onDown = (e: PointerEvent) => {
      const el = (e.target as Element).closest('[data-edit-id]') as SVGElement | null;
      if (!el || !host.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      const id = el.getAttribute('data-edit-id')!;
      selectElement(id);
      const svg = host.querySelector('svg');
      const stage = stageRef.current;
      if (!svg || !stage) return;
      const vb = svg.getAttribute('viewBox')?.split(/\s+/).map(Number) || [0, 0, 900, 560];
      const scale = stage.getBoundingClientRect().width / (vb[2] || 900);
      const { x: tx, y: ty } = getTranslate(el);
      dragRef.current = { id, startX: e.clientX, startY: e.clientY, origTx: tx, origTy: ty, scale };
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d || d.id !== id) return;
        const dx = (ev.clientX - d.startX) / d.scale;
        const dy = (ev.clientY - d.startY) / d.scale;
        setTranslate(el, d.origTx + dx, d.origTy + dy);
        const p = readElementProps(el);
        setProps((prev) => (prev ? { ...prev, x: Math.round(p.x), y: Math.round(p.y) } : null));
      };
      const onUp = () => {
        dragRef.current = null;
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
      };
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    };

    host.addEventListener('pointerdown', onDown);
    return () => host.removeEventListener('pointerdown', onDown);
  }, [mode, svgHtml, selectElement]);

  useEffect(() => {
    if (mode === 'drag' && elementList[0]) selectElement(elementList[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅切换模式时选中首个
  }, [mode]);

  const syncCanvasSize = useCallback(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255, 51, 79, 0.85)';
      ctx.lineWidth = 14;
    }
  }, []);

  useLayoutEffect(() => {
    syncCanvasSize();
    const raf = requestAnimationFrame(() => syncCanvasSize());
    window.addEventListener('resize', syncCanvasSize);
    const stage = stageRef.current;
    const ro =
      stage && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => syncCanvasSize())
        : null;
    if (stage && ro) ro.observe(stage);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', syncCanvasSize);
      ro?.disconnect();
    };
  }, [syncCanvasSize, svgHtml, showRasterBack, loadFailed]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== 'brush') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    strokeHistory.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || mode !== 'brush') return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokeHistory.current = [];
  };

  const undoStroke = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const prev = strokeHistory.current.pop();
    if (!canvas || !ctx) return;
    if (prev) ctx.putImageData(prev, 0, 0);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleAiGenerate = async () => {
    const canvas = canvasRef.current;
    const maskBounds = canvas ? getMaskBounds(canvas) : null;
    const svg = getCurrentSvg();
    const result = await onGenerate({ editPrompt, maskBounds, svg, layers: [] });
    if (result.svg) loadSvg(result.svg);
    onUpdate(result.dataUrl, result.svg);
    clearMask();
  };

  const handleSaveDrag = () => {
    const svg = getCurrentSvg();
    onUpdate(svgToDataUrl(svg), svg);
    onClose();
  };

  const selectedMeta = elementList.find((e) => e.id === selectedId);

  return (
    <div className="visual-editor-layout">
      <aside className="wpanel visual-editor-side visual-editor-props">
        <h3 className="section-title">视觉编辑</h3>
        <div className="chips" style={{ marginTop: 8 }}>
          <span className={`chip ${mode === 'brush' ? 'green' : ''}`} onClick={() => setMode('brush')}>
            画笔圈选
          </span>
          <span className={`chip ${mode === 'drag' ? 'green' : ''}`} onClick={() => setMode('drag')}>
            拖拽精调
          </span>
          {mode === 'brush' && (
            <>
              <span className="chip" onClick={clearMask}>清除圈选</span>
              <span className="chip" onClick={undoStroke}>撤销笔画</span>
            </>
          )}
        </div>

        {mode === 'drag' && (
          <>
            <div className="small" style={{ marginTop: 10 }}>
              点击画布中任意元素选中，可拖拽移动、改文字、颜色与大小。
            </div>
            <h4 className="props-subtitle">全部元素 ({elementList.length})</h4>
            <div className="element-list">
              {elementList.map((el) => (
                <button
                  key={el.id}
                  type="button"
                  className={`element-list-item ${selectedId === el.id ? 'active' : ''}`}
                  onClick={() => selectElement(el.id)}
                >
                  {el.label}
                </button>
              ))}
            </div>

            {props && selectedMeta && (
              <div className="props-form">
                <h4 className="props-subtitle">属性 · {selectedMeta.tag}</h4>
                {selectedMeta.isText && (
                  <label className="props-field">
                    <span>文字内容</span>
                    <textarea
                      className="input"
                      rows={3}
                      value={props.text}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProps((p) => (p ? { ...p, text: v } : p));
                        updateSelectedDom({ text: v });
                      }}
                    />
                  </label>
                )}
                <label className="props-field">
                  <span>颜色</span>
                  <div className="color-row">
                    <input
                      type="color"
                      value={props.fill.startsWith('#') ? props.fill.slice(0, 7) : '#103C8F'}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProps((p) => (p ? { ...p, fill: v } : p));
                        updateSelectedDom({ fill: v });
                      }}
                    />
                    <input
                      className="input"
                      value={props.fill}
                      onChange={(e) => {
                        const v = e.target.value;
                        setProps((p) => (p ? { ...p, fill: v } : p));
                        updateSelectedDom({ fill: v });
                      }}
                    />
                  </div>
                </label>
                {(selectedMeta.isText || selectedMeta.tag === 'text' || selectedMeta.tag === 'tspan') && (
                  <label className="props-field">
                    <span>字号 {Math.round(props.fontSize)}</span>
                    <input
                      type="range"
                      min={10}
                      max={96}
                      value={props.fontSize}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProps((p) => (p ? { ...p, fontSize: v, size: v } : p));
                        updateSelectedDom({ fontSize: v });
                      }}
                    />
                  </label>
                )}
                {(props.width != null || selectedMeta.tag === 'rect' || selectedMeta.tag === 'image') && (
                  <label className="props-field">
                    <span>宽度</span>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      value={Math.round(props.width ?? 100)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProps((p) => (p ? { ...p, width: v } : p));
                        updateSelectedDom({ width: v });
                      }}
                    />
                  </label>
                )}
                {(props.height != null || selectedMeta.tag === 'rect' || selectedMeta.tag === 'image') && (
                  <label className="props-field">
                    <span>高度</span>
                    <input
                      type="number"
                      className="input"
                      min={1}
                      value={Math.round(props.height ?? 100)}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProps((p) => (p ? { ...p, height: v } : p));
                        updateSelectedDom({ height: v });
                      }}
                    />
                  </label>
                )}
                {selectedMeta.tag === 'circle' && (
                  <label className="props-field">
                    <span>半径</span>
                    <input
                      type="range"
                      min={4}
                      max={200}
                      value={props.size ?? 40}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProps((p) => (p ? { ...p, size: v } : p));
                        updateSelectedDom({ size: v });
                      }}
                    />
                  </label>
                )}
                <label className="props-field">
                  <span>位置 X / Y</span>
                  <div className="xy-row">
                    <input
                      type="number"
                      className="input"
                      value={props.x}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProps((p) => (p ? { ...p, x: v } : p));
                        updateSelectedDom({ x: v });
                      }}
                    />
                    <input
                      type="number"
                      className="input"
                      value={props.y}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setProps((p) => (p ? { ...p, y: v } : p));
                        updateSelectedDom({ y: v });
                      }}
                    />
                  </div>
                </label>
                <label className="props-field">
                  <span>透明度 {Math.round(props.opacity * 100)}%</span>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={props.opacity}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setProps((p) => (p ? { ...p, opacity: v } : p));
                      updateSelectedDom({ opacity: v });
                    }}
                  />
                </label>
              </div>
            )}
          </>
        )}

        {mode === 'brush' && (
          <div className="small" style={{ marginTop: 10 }}>
            用画笔圈出需 AI 重绘的区域（红色笔迹）。
          </div>
        )}
      </aside>

      <main className="canvas-large visual-editor-main">
        <div ref={stageRef} className="visual-editor-stage">
          <div className={`visual-editor-artboard ${mode === 'drag' ? 'drag-mode' : ''}`}>
            {(showRasterBack || loadFailed) && imageSrc ? (
              <img src={imageSrc} alt="" className="visual-editor-raster-back" draggable={false} />
            ) : null}
            {svgHtml ? (
              <div
                ref={svgHostRef}
                className="visual-editor-svg-host"
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            ) : loadFailed ? (
              <div className="visual-editor-load-hint">配图加载失败，请关闭后重试或联系运营。</div>
            ) : (
              <div className="visual-editor-load-hint">正在加载配图…</div>
            )}
          </div>
          <canvas
            ref={canvasRef}
            className={`visual-editor-mask-canvas ${mode === 'brush' ? 'active' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
      </main>

      <aside className="wpanel visual-editor-side">
        <h3 className="section-title">AI 局部修改</h3>
        <textarea
          className="select"
          style={{ height: 110, width: '100%', resize: 'none' }}
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value)}
        />
        <button
          className="btn primary"
          style={{ width: '100%', marginTop: 12 }}
          disabled={isGenerating}
          onClick={() => void handleAiGenerate()}
        >
          {isGenerating ? '生成中…' : '生成新版本'}
        </button>
        {mode === 'drag' && (
          <button className="btn soft" style={{ width: '100%', marginTop: 8 }} onClick={handleSaveDrag}>
            保存精调并返回
          </button>
        )}
        <button className="btn" style={{ width: '100%', marginTop: 8 }} onClick={onClose}>
          返回
        </button>
      </aside>
    </div>
  );
}
