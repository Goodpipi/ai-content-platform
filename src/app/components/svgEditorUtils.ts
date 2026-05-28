const EDITABLE_TAGS = new Set([
  'text',
  'tspan',
  'rect',
  'circle',
  'ellipse',
  'path',
  'line',
  'polyline',
  'polygon',
  'image',
  'g',
]);

export interface SvgElementInfo {
  id: string;
  tag: string;
  label: string;
  isText: boolean;
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** 从 data:image/svg+xml URL 解码出 SVG 字符串（支持 url 编码与 base64） */
export function parseSvgFromDataUrl(src: string): string | undefined {
  if (!src.startsWith('data:image/svg+xml')) return undefined;
  const comma = src.indexOf(',');
  if (comma < 0) return undefined;
  const payload = src.slice(comma + 1);
  const isBase64 = /;base64/i.test(src.slice(0, comma));
  if (isBase64) {
    try {
      return atob(payload);
    } catch {
      return undefined;
    }
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    try {
      return decodeURIComponent(payload.replace(/\+/g, ' '));
    } catch {
      return undefined;
    }
  }
}

export function isValidSvgMarkup(svgString: string): boolean {
  const trimmed = svgString.trim();
  if (!trimmed || !trimmed.includes('<svg')) return false;
  const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return false;
  return doc.documentElement?.tagName?.toLowerCase() === 'svg';
}

export function resolveEditableSvgSource(imageSrc: string, initialSvg?: string): string | undefined {
  const fromInitial = initialSvg?.trim();
  if (fromInitial && isValidSvgMarkup(fromInitial)) return fromInitial;
  const fromUrl = parseSvgFromDataUrl(imageSrc);
  if (fromUrl && isValidSvgMarkup(fromUrl)) return fromUrl;
  if (imageSrc && !imageSrc.startsWith('data:image/svg+xml')) {
    return wrapRasterAsSvg(imageSrc);
  }
  return undefined;
}

export function wrapRasterAsSvg(imageSrc: string, w = 900, h = 560): string {
  const href = escapeXmlAttr(imageSrc);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}"><image data-edit-id="el-bg" xlink:href="${href}" href="${href}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

export function prepareEditableSvg(svgString: string): { svg: string; elements: SvgElementInfo[] } {
  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = doc.documentElement;
  const elements: SvgElementInfo[] = [];
  let counter = 0;

  const walk = (el: Element) => {
    if (el.closest('defs, clipPath, mask, symbol')) return;
    const tag = el.tagName.toLowerCase();
    if (EDITABLE_TAGS.has(tag)) {
      let id = el.getAttribute('data-edit-id');
      if (!id) {
        id = `el-${counter++}`;
        el.setAttribute('data-edit-id', id);
      }
      const isText = tag === 'text' || tag === 'tspan';
      const textPreview = isText ? (el.textContent || '').trim().slice(0, 24) : '';
      const label = isText
        ? `文本: ${textPreview || '(空)'}`
        : `${tag}${el.getAttribute('fill') ? '' : ''} #${id.replace('el-', '')}`;
      elements.push({ id, tag, label, isText });
    }
    Array.from(el.children).forEach(walk);
  };

  walk(root);
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  return {
    svg: new XMLSerializer().serializeToString(root),
    elements,
  };
}

export function serializeSvgFromContainer(container: HTMLElement): string {
  const svg = container.querySelector('svg');
  if (!svg) return '';
  const clone = svg.cloneNode(true) as SVGElement;
  clone.querySelectorAll('.svg-edit-selection-box').forEach((n) => n.remove());
  clone.querySelectorAll('[class]').forEach((n) => {
    n.classList.remove('svg-edit-selected');
  });
  return new XMLSerializer().serializeToString(clone);
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function getTranslate(el: Element): { x: number; y: number } {
  const t = el.getAttribute('transform') || '';
  const m = t.match(/translate\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/);
  if (m) return { x: parseFloat(m[1]) || 0, y: parseFloat(m[2] ?? m[1]) || 0 };
  return { x: 0, y: 0 };
}

export function setTranslate(el: Element, x: number, y: number) {
  const rest = (el.getAttribute('transform') || '')
    .replace(/translate\([^)]*\)/g, '')
    .trim();
  const translate = `translate(${x}, ${y})`;
  el.setAttribute('transform', rest ? `${translate} ${rest}` : translate);
}

export function readElementProps(el: Element) {
  const tag = el.tagName.toLowerCase();
  const isText = tag === 'text' || tag === 'tspan';
  const fill = el.getAttribute('fill') || el.getAttribute('stroke') || '#103C8F';
  const fontSize = parseFloat(el.getAttribute('font-size') || '16') || 16;
  const { x: tx, y: ty } = getTranslate(el);

  let x = parseFloat(el.getAttribute('x') || '0') + tx;
  let y = parseFloat(el.getAttribute('y') || '0') + ty;
  let width: number | undefined;
  let height: number | undefined;
  let size: number | undefined;

  if (tag === 'rect') {
    width = parseFloat(el.getAttribute('width') || '0') || undefined;
    height = parseFloat(el.getAttribute('height') || '0') || undefined;
    x = parseFloat(el.getAttribute('x') || '0') + tx;
    y = parseFloat(el.getAttribute('y') || '0') + ty;
  } else if (tag === 'circle') {
    size = parseFloat(el.getAttribute('r') || '0') || undefined;
    x = parseFloat(el.getAttribute('cx') || '0') + tx;
    y = parseFloat(el.getAttribute('cy') || '0') + ty;
  } else if (tag === 'ellipse') {
    width = (parseFloat(el.getAttribute('rx') || '0') || 0) * 2;
    height = (parseFloat(el.getAttribute('ry') || '0') || 0) * 2;
    size = parseFloat(el.getAttribute('rx') || '0') || undefined;
    x = parseFloat(el.getAttribute('cx') || '0') + tx;
    y = parseFloat(el.getAttribute('cy') || '0') + ty;
  } else if (tag === 'image') {
    width = parseFloat(el.getAttribute('width') || '0') || undefined;
    height = parseFloat(el.getAttribute('height') || '0') || undefined;
    x = parseFloat(el.getAttribute('x') || '0') + tx;
    y = parseFloat(el.getAttribute('y') || '0') + ty;
  }

  return {
    tag,
    isText: isText,
    text: isText ? el.textContent || '' : '',
    fill: fill === 'none' ? '#000000' : fill,
    fontSize,
    x,
    y,
    width,
    height,
    size,
    opacity: parseFloat(el.getAttribute('opacity') || '1') || 1,
  };
}

export function applyElementProps(
  el: Element,
  props: Partial<{
    text: string;
    fill: string;
    fontSize: number;
    x: number;
    y: number;
    width: number;
    height: number;
    size: number;
    opacity: number;
  }>
) {
  const tag = el.tagName.toLowerCase();

  if (props.fill != null) {
    if (tag === 'line' || tag === 'path') {
      if (el.getAttribute('fill') && el.getAttribute('fill') !== 'none') el.setAttribute('fill', props.fill);
      else el.setAttribute('stroke', props.fill);
    } else {
      el.setAttribute('fill', props.fill);
    }
  }

  if (props.opacity != null) el.setAttribute('opacity', String(props.opacity));

  if (props.fontSize != null && (tag === 'text' || tag === 'tspan')) {
    el.setAttribute('font-size', String(props.fontSize));
  }

  if (props.text != null && (tag === 'text' || tag === 'tspan')) {
    el.textContent = props.text;
  }

  const { x: tx, y: ty } = getTranslate(el);

  if (props.x != null || props.y != null) {
    const cur = readElementProps(el);
    const nx = props.x ?? cur.x;
    const ny = props.y ?? cur.y;

    if (tag === 'text' || tag === 'tspan') {
      el.setAttribute('x', String(nx - tx));
      el.setAttribute('y', String(ny - ty));
    } else if (tag === 'rect' || tag === 'image') {
      el.setAttribute('x', String(nx - tx));
      el.setAttribute('y', String(ny - ty));
    } else if (tag === 'circle') {
      el.setAttribute('cx', String(nx - tx));
      el.setAttribute('cy', String(ny - ty));
    } else if (tag === 'ellipse') {
      el.setAttribute('cx', String(nx - tx));
      el.setAttribute('cy', String(ny - ty));
    } else {
      setTranslate(el, (props.x ?? cur.x) - (parseFloat(el.getAttribute('x') || '0') || 0), (props.y ?? cur.y) - (parseFloat(el.getAttribute('y') || '0') || 0));
    }
  }

  if (props.width != null) {
    if (tag === 'rect' || tag === 'image') el.setAttribute('width', String(props.width));
    if (tag === 'ellipse') el.setAttribute('rx', String(props.width / 2));
  }
  if (props.height != null) {
    if (tag === 'rect' || tag === 'image') el.setAttribute('height', String(props.height));
    if (tag === 'ellipse') el.setAttribute('ry', String(props.height / 2));
  }
  if (props.size != null && tag === 'circle') el.setAttribute('r', String(props.size));
  if (props.size != null && tag === 'text') el.setAttribute('font-size', String(props.size));
}
