/**
 * canvas.js — Canvas rendering engine.
 * Turns the sceneData object tree into DOM elements inside #canvasFrame.
 */

import { state, getLayout } from '../core/state.js';
import { sortByLayer } from '../utils/helpers.js';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full re-render of the canvas for the current scene.
 */
export function render() {
  const frame = document.getElementById('canvasFrame');
  frame.innerHTML = '';

  const layout = getLayout();
  if (!layout) return;

  const W = parseInt(layout.base_layout?.width) || 1920;
  const H = parseInt(layout.base_layout?.height) || 1080;
  const z = state.zoom;

  frame.style.width  = `${W * z}px`;
  frame.style.height = `${H * z}px`;

  document.getElementById('canvasLabel').textContent =
    `${W} × ${H} px — ${Math.round(z * 100)}%`;

  const sorted = sortByLayer(layout.objects ?? []);
  for (const obj of sorted) {
    frame.appendChild(_renderComponent(obj, z));

    // Render Button sub-children (layer_index === -1 → rendered flat at scene level)
    if (obj.objects) {
      sortByLayer(obj.objects.filter((c) => c.transform?.layer_index === -1))
        .forEach((child) => frame.appendChild(_renderComponent(child, z)));
    }
  }

  // Restore selection highlight
  if (state.selectedId) {
    document.getElementById(`layer_${state.selectedId}`)?.classList.add('selected');
  }
}

// ── Internal renderers ────────────────────────────────────────────────────────

/**
 * Build a single component DOM element. Does NOT attach to the DOM.
 * @param {object} obj
 * @param {number} scale
 * @returns {HTMLElement}
 */
function _renderComponent(obj, scale) {
  const el = document.createElement('div');
  el.className = 'component-layer';
  el.id = `layer_${obj.id}`;

  const t = obj.transform ?? { x: 0, y: 0, width: 100, height: 100 };
  el.style.cssText =
    `left:${t.x * scale}px; top:${t.y * scale}px; ` +
    `width:${t.width * scale}px; height:${t.height * scale}px;`;

  // Label overlay
  const lbl = document.createElement('div');
  lbl.className = 'comp-label';
  lbl.textContent = `${obj.component} · ${obj.id.split('_').pop()}`;
  el.appendChild(lbl);

  // Dispatch by component type
  const c = obj.component;
  if (c === 'ButtonGrid') _applyButtonGrid(el, obj, scale);
  else if (c === 'Slideshow') _applySlideshow(el, obj);
  else if (c === 'Rectangle' || c === 'Button_Rectangle') _applyRectangle(el, obj, scale);
  else if (c === 'Image'     || c === 'Button_Image')     _applyImage(el, obj);
  else if (c === 'Video')                                 _applyVideo(el);
  else if (_isTextLike(c))                                _applyText(el, obj, scale);

  // Drag start listener
  // Drag start listener (di dalam fungsi _renderComponent pada canvas.js)
  el.addEventListener('mousedown', (e) => {
    if (state.appMode !== 'layout') return;
    e.stopPropagation();
    const d = state.drag;
    d.isMouseDown = true;
    d.isDragging  = false;
    d.obj         = obj;
    d.startX      = e.clientX;
    d.startY      = e.clientY;
    d.lastMouseX  = e.clientX;
    d.lastMouseY  = e.clientY;
    
    // --- TAMBAHAN ---
    // Catat apakah child ini sudah ter-select sebelum di-klik
    d.wasSelected = (state.selectedId === obj.id);
    // Catat apakah user menahan tombol Alt/Shift (untuk paksa select child)
    d.forceChild  = e.altKey || e.shiftKey;
  });

  return el;
}

// ── Component Painters ────────────────────────────────────────────────────────

function _applyRectangle(el, obj, scale) {
  const t = obj.transform ?? {};
  el.style.background = obj.background?.background_color ?? '#888';
  el.style.opacity    = t.opacity ?? 1;

  const r = obj.radius_corner ?? 0;
  if (r > 0) el.style.borderRadius = `${Math.min(r * 20, 16) * scale}px`;

  if (obj.hover_color) {
    const normalBg  = el.style.background;
    const normalOp  = el.style.opacity;
    const hoverBg   = obj.hover_color;
    const hoverOp   = obj.hover_opacity ?? normalOp;
    el.style.transition = 'all 0.2s';
    el.addEventListener('mouseenter', () => { el.style.background = hoverBg; el.style.opacity = hoverOp; });
    el.addEventListener('mouseleave', () => { el.style.background = normalBg; el.style.opacity = normalOp; });
  }
}

function _applyImage(el, obj) {
  el.style.cssText +=
    'background:rgba(80,80,120,0.15); display:flex; align-items:center; justify-content:center; overflow:hidden;';

  const src = obj.source ?? '';
  if (src && !src.includes('%') && !src.includes('placeholder')) {
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'width:100%; height:100%; object-fit:contain; opacity:0.5; pointer-events:none;';
    el.appendChild(img);
  } else {
    const s = document.createElement('span');
    s.style.cssText = 'font-size:10px; opacity:0.5; pointer-events:none;';
    s.textContent = '🖼';
    el.appendChild(s);
  }
}

function _applyVideo(el) {
  el.style.cssText +=
    'background:#070714; display:flex; align-items:center; justify-content:center; color:#555; font-size:10px;';
  el.textContent = '▶ Video';
}

function _applySlideshow(el, obj) {
  const bgColor = obj.background?.background_color ?? '#000000';
  el.style.cssText +=
    `background:${bgColor}; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative;`;

  // Tampilkan gambar pertama sebagai pratinjau (jika ada)
  const firstImgObj = obj.images && obj.images[0];
  let src = '';
  if (firstImgObj) {
    src = firstImgObj;
  }
  // if (firstImgObj && firstImgObj.source && !firstImgObj.source.includes('%') && !firstImgObj.source.includes('placeholder')) {
  //   src = firstImgObj.source;
  // }

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'width:100%; height:100%; object-fit:contain; opacity:0.5; pointer-events:none; position:absolute; left:0; top:0;';
    el.appendChild(img);
  }

  // Label Slideshow overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:relative; z-index:1; color:#fff; font-size:12px; display:flex; flex-direction:column; align-items:center; opacity:0.8; pointer-events:none; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);';
  overlay.innerHTML = `<span style="font-size:24px; margin-bottom:4px;">🎞️</span> Slideshow (${obj.images?.length || 0} imgs)`;
  el.appendChild(overlay);
}

function _applyText(el, obj, scale) {
  const f   = obj.font ?? {};
  const txt = obj.text ?? '';
  const align = obj.text_align === 'right' ? 'flex-end'
              : obj.text_align === 'center' ? 'center'
              : 'flex-start';

  el.style.cssText +=
    `background:transparent; display:flex; align-items:flex-start; overflow:hidden; justify-content:${align};`;

  const span = document.createElement('span');
  span.style.cssText =
    `font-size:${Math.max(7, (f.font_size ?? 14) * scale)}px; ` +
    `color:${f.font_color ?? '#fff'}; ` +
    `font-weight:${f.font_weight ?? 'normal'}; ` +
    `font-family:${f.font_family ?? 'sans-serif'}; ` +
    `white-space:pre-wrap; line-height:1.3; pointer-events:none;`;
  span.textContent = txt;
  el.appendChild(span);
}

function _applyButtonGrid(el, obj, scale) {
  el.style.cssText +=
    'background:rgba(0,0,0,0.1); display:flex; flex-wrap:wrap; align-content:flex-start; overflow:hidden; position:absolute;';

  const cols    = parseInt(obj.column)  || 1;
  const rows    = parseInt(obj.row)     || 3;
  const itemW   = (obj.item_width  ?? 100) * scale;
  const itemH   = (obj.item_height ?? 75)  * scale;
  const gapH    = (obj.item_horizontal_gap ?? 0) * scale;
  const gapV    = (obj.item_vertical_gap   ?? 0) * scale;
  const ct      = obj.content_type;

  // Lazy-load data if not cached
  let itemsData = [];
  if (ct) {
    const cached = state.gridDataCache[ct];
    if (!cached) {
      _fetchForPreview(ct); // fire & forget
    } else if (Array.isArray(cached)) {
      itemsData = cached;
    }
  }

  const maxItems    = cols * rows;
  const displayCount = itemsData.length > 0 ? itemsData.length : Math.min(maxItems, 12);

  for (let i = 0; i < displayCount; i++) {
    const apiItem = itemsData[i] ?? null;
    const c = i % cols;
    const r = Math.floor(i / cols);

    const itemEl = document.createElement('div');
    itemEl.style.cssText =
      `position:absolute; width:${itemW}px; height:${itemH}px; overflow:hidden; ` +
      `left:${c * (itemW + gapH)}px; top:${r * (itemH + gapV)}px; ` +
      `background:rgba(255,255,255,0.05); pointer-events:none;`;

    _paintGridItem(itemEl, obj, apiItem, i, scale);
    el.appendChild(itemEl);
  }
}

function _paintGridItem(itemEl, gridObj, apiItem, index, scale) {
  const cfg  = gridObj.item_config    ?? {};
  const cmps = gridObj.item_component ?? {};

  const resolve = (tmpl, row) => {
    if (!tmpl || !row) return tmpl;
    const map = {
      '/name%': 'name_text', '/description%': 'desc_text', '/price%': 'price_text',
      '/qty%': 'qty_text', '/image%': 'image', '/text_1%': 'text_1',
      '/text_2%': 'text_2', '/text_3%': 'text_3',
    };
    for (const [pattern, field] of Object.entries(map)) {
      if (tmpl.includes(pattern)) return String(row[field] ?? '');
    }
    return tmpl;
  };

  const drawSub = (subKey, isText, isImage, isMainRect) => {
    if (cfg[`is_enable_${subKey}`] === false) return;
    const cmp = cmps[subKey];
    if (!cmp) return;

    const sub = document.createElement('div');
    if (isMainRect) sub.className = 'grid-item-bg';
    const st = cmp.transform ?? { x: 0, y: 0, width: 50, height: 20 };
    sub.style.cssText =
      `position:absolute; left:${st.x*scale}px; top:${st.y*scale}px; ` +
      `width:${st.width*scale}px; height:${st.height*scale}px; transition:all 0.2s;`;

    if (isText) {
      const f = cmp.font ?? {};
      sub.style.cssText +=
        `color:${f.font_color ?? '#fff'}; ` +
        `font-size:${Math.max(6, (f.font_size ?? 14) * scale)}px; ` +
        `font-family:${f.font_family ?? 'sans-serif'}; ` +
        `display:flex; align-items:center; white-space:nowrap; overflow:hidden;`;

      let raw = cmp.text ?? '';
      if (apiItem && raw.includes('%')) raw = resolve(raw, apiItem);
      else if (!apiItem) raw = raw || `Item ${index + 1}`;
      sub.textContent = raw;

    } else if (isImage) {
      const srcStr  = cmp.string_dynamic ?? '%/image%';
      const actual  = apiItem ? resolve(srcStr, apiItem) : null;
      if (actual && actual.length > 5) {
        sub.style.background = 'transparent';
        sub.innerHTML = `<img src="${actual}" style="width:100%;height:100%;object-fit:cover;border-radius:${cmp.radius_corner ?? 0}px;pointer-events:none;">`;
      } else {
        sub.style.background = 'rgba(80,80,120,0.3)';
        sub.innerHTML = `<span style="font-size:10px;opacity:0.5;display:flex;align-items:center;justify-content:center;height:100%;">🖼</span>`;
      }
    } else if (isMainRect) {
      sub.style.background = cmp.background?.background_color ?? 'transparent';
    }

    itemEl.appendChild(sub);
  };

  if (cmps.rectangle)                      drawSub('rectangle',  false, false, true);
  if (cfg.is_enable_name_text)             drawSub('name_text',  true,  false);
  if (cfg.is_enable_desc_text)             drawSub('desc_text',  true,  false);
  if (cfg.is_enable_price_text)            drawSub('price_text', true,  false);
  if (cfg.is_enable_qty_rect)              drawSub('qty_rect',   false, false);
  if (cfg.is_enable_qty_text)              drawSub('qty_text',   true,  false);
  if (cfg.is_enable_image)                 drawSub('image',      false, true);

  // Hover effect on grid items
  if (cmps.rectangle?.hover_color) {
    const rectNode  = itemEl.querySelector('.grid-item-bg');
    if (rectNode) {
      const normalBg = cmps.rectangle.background?.background_color ?? 'transparent';
      const normalOp = cmps.rectangle.transform?.opacity ?? 1;
      const hoverBg  = cmps.rectangle.hover_color;
      const hoverOp  = cmps.rectangle.hover_opacity ?? normalOp;
      itemEl.style.pointerEvents = 'auto';
      itemEl.addEventListener('mouseenter', () => { rectNode.style.background = hoverBg; rectNode.style.opacity = hoverOp; });
      itemEl.addEventListener('mouseleave', () => { rectNode.style.background = normalBg; rectNode.style.opacity = normalOp; });
    }
  }
}

// ── Preview data fetching ─────────────────────────────────────────────────────

async function _fetchForPreview(contentType) {
  if (!contentType || state.gridDataCache[contentType]) return;
  state.gridDataCache[contentType] = 'loading';
  try {
    const res = await fetch(`/api/items/${contentType}`);
    if (res.ok) {
      const data = await res.json();
      state.gridDataCache[contentType] = data.results?.items ?? [];
    } else {
      state.gridDataCache[contentType] = [];
    }
    render(); // re-render once data arrives
  } catch (e) {
    console.error('Preview fetch error:', e);
    state.gridDataCache[contentType] = [];
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const TEXT_LIKE_COMPONENTS = new Set([
  'Text', 'TextDynamic', 'Button_Text', 'Clock', 'Date', 'Temperature', 'RunningText',
]);

function _isTextLike(component) {
  return TEXT_LIKE_COMPONENTS.has(component);
}