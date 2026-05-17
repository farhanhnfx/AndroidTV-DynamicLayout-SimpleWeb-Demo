/**
 * editor.js — Right-panel property editor.
 * Renders editable fields for the currently selected component.
 */

import { state, getLayout }   from '../core/state.js';
import { saveHistory }        from '../core/history.js';
import { render }             from './canvas.js';
import { renderSidebar }      from './sidebar.js';
import { removeById, setByPath, coerceInputValue, detectType } from '../utils/helpers.js';

// ── Public API ────────────────────────────────────────────────────────────────

export function renderEditor(obj) {
  const scroll = document.getElementById('editorScroll');
  const header = document.getElementById('editorHeader');

  if (!obj) {
    scroll.innerHTML =
      '<div class="no-selection"><span>Click a component<br>to edit its properties</span></div>';
    header.textContent = 'Properties';
    return;
  }

  scroll.innerHTML = '';
  header.textContent = `${obj.component} · ${obj.id.split('_').pop()}`;

  // ── Section builders ─────────────────────────────────────────────

  function addGroup(title, fields) {
    const grp = _makeGroupEl(title);
    fields.forEach(([label, type, value, dotPath]) => {
      const row = _makeRow(label, dotPath);
      const inp = _makeInput(type, value, dotPath, obj);
      row.appendChild(inp._wrap ?? inp);
      grp.body.appendChild(row);
    });
    scroll.appendChild(grp.el);
  }

  function addObjectGroup(title, sourceObj, dotPrefix) {
    if (!sourceObj || typeof sourceObj !== 'object') return;

    const collapsed = title.includes('multilanguage') ||
                      title.includes('metadata')      ||
                      title.includes('objects')       ||
                      title.includes('images');

    const grp  = _makeGroupEl(title, collapsed);
    const body = grp.body;

    if (Array.isArray(sourceObj)) {
      sourceObj.forEach((item, idx) => {
        if (item !== null && typeof item === 'object') {
          const sub    = document.createElement('div');
          sub.style.cssText =
            'border-left:2px solid rgba(109,24,16,0.15); margin:4px 0 4px 6px; padding-left:6px;';
          const subHdr = document.createElement('div');
          subHdr.style.cssText =
            'font-size:9px; font-weight:600; color:#6d1810; padding:3px 8px; background:rgba(109,24,16,0.05);';
          subHdr.textContent = `[${idx}]${item.lg_id ? ` lg_id:${item.lg_id}` : ''}`;
          sub.appendChild(subHdr);
          _renderFlatFields(item, `${dotPrefix}.${idx}`, sub, obj);
          body.appendChild(sub);
        } else {
          const row = _makeRow(`[${idx}]`, `${dotPrefix}.${idx}`);
          const inp = _makeInput(detectType('', item), item, `${dotPrefix}.${idx}`, obj);
          row.appendChild(inp._wrap ?? inp);
          body.appendChild(row);
        }
      });
    } else {
      _renderFlatFields(sourceObj, dotPrefix, body, obj);
    }

    scroll.appendChild(grp.el);
  }

  // ── Identity ──────────────────────────────────────────────────────
  addGroup('Identity', [
    ['id',        'text', obj.id,        'id'],
    ['component', 'text', obj.component, 'component'],
  ]);
  if (obj.group_id !== undefined) {
    addGroup('Group', [['group_id', 'text', obj.group_id, 'group_id']]);
  }

  // ── Transform ────────────────────────────────────────────────────
  const t = obj.transform ?? {};
  addGroup('Transform', [
    ['x',           'number', t.x,           'transform.x'],
    ['y',           'number', t.y,           'transform.y'],
    ['width',       'number', t.width,       'transform.width'],
    ['height',      'number', t.height,      'transform.height'],
    ['layer_index', 'number', t.layer_index, 'transform.layer_index'],
    ['opacity',     'text',   t.opacity,     'transform.opacity'],
  ]);
  if (t.raw) addObjectGroup('transform.raw', t.raw, 'transform.raw');

  // ── Source / Media ────────────────────────────────────────────────
  const srcFields = [
    ['source',          obj.source],
    ['source_asli',     obj.source_asli],
    ['string_dynamic',  obj.string_dynamic],
    ['sourcex',         obj.sourcex],
  ].filter(([, v]) => v !== undefined);
  if (srcFields.length) {
    addGroup('Source / Media', srcFields.map(([k, v]) => [k, 'text', v, k]));
  }

  // ── Text / Font ───────────────────────────────────────────────────
  const textFields = [];
  if (obj.text         !== undefined) textFields.push(['text',          'multiline', obj.text,         'text']);
  if (obj.text_align   !== undefined) textFields.push(['text_align',    'text',      obj.text_align,   'text_align']);
  if (obj.format       !== undefined) textFields.push(['format',        'text',      obj.format,       'format']);
  if (obj.include_day_name !== undefined) textFields.push(['include_day_name', 'boolean', obj.include_day_name, 'include_day_name']);
  if (textFields.length) addGroup('Text', textFields);

  if (obj.font) {
    addGroup('Font', Object.keys(obj.font).map((k) => [k, detectType(k, obj.font[k]), obj.font[k], `font.${k}`]));
  }

  // ── Scroll ────────────────────────────────────────────────────────
  const scrollFields = [];
  if (obj.scroll_direction !== undefined) scrollFields.push(['scroll_direction', 'text',   obj.scroll_direction, 'scroll_direction']);
  if (obj.scroll_speed     !== undefined) scrollFields.push(['scroll_speed',     'number', obj.scroll_speed,     'scroll_speed']);
  if (scrollFields.length) addGroup('Scroll', scrollFields);

  // ── Background ────────────────────────────────────────────────────
  if (obj.background) {
    addGroup('Background', Object.keys(obj.background).map(
      (k) => [k, detectType(k, obj.background[k]), obj.background[k], `background.${k}`]
    ));
  }

  // ── Style ─────────────────────────────────────────────────────────
  const styleFields = [];
  if (obj.radius_corner             !== undefined) styleFields.push(['radius_corner',             'number',  obj.radius_corner,             'radius_corner']);
  if (obj.hover_color               !== undefined) styleFields.push(['hover_color',               'color',   obj.hover_color,               'hover_color']);
  if (obj.hover_opacity             !== undefined) styleFields.push(['hover_opacity',             'text',    obj.hover_opacity,             'hover_opacity']);
  if (obj.hover_color_from_template !== undefined) styleFields.push(['hover_color_from_template', 'boolean', obj.hover_color_from_template, 'hover_color_from_template']);
  if (obj.scale_type                !== undefined) styleFields.push(['scale_type',                'text',    obj.scale_type,                'scale_type']);
  if (styleFields.length) addGroup('Style', styleFields);

  // ── Button ────────────────────────────────────────────────────────
  if (obj.action_id !== undefined || obj.action_parameter !== undefined) {
    const actFields = [
      obj.action_id          !== undefined && ['action_id',          'text',    obj.action_id,          'action_id'],
      obj.is_enable_text     !== undefined && ['is_enable_text',     'boolean', obj.is_enable_text,     'is_enable_text'],
      obj.is_enable_image    !== undefined && ['is_enable_image',    'boolean', obj.is_enable_image,    'is_enable_image'],
      obj.scroll_x           !== undefined && ['scroll_x',           'boolean', obj.scroll_x,           'scroll_x'],
      obj.scroll_y           !== undefined && ['scroll_y',           'boolean', obj.scroll_y,           'scroll_y'],
      obj.is_action_compatible !== undefined && ['is_action_compatible', 'boolean', obj.is_action_compatible, 'is_action_compatible'],
    ].filter(Boolean);
    if (actFields.length) addGroup('Button Behavior', actFields);
    if (obj.action_parameter) addObjectGroup('action_parameter', obj.action_parameter, 'action_parameter');
  }

  if (obj.menu)     addGroup('Menu Ref', [['dm_id','text',obj.menu.dm_id,'menu.dm_id'],['dm_name','text',obj.menu.dm_name,'menu.dm_name']]);
  if (obj.language) addGroup('Language', [['lg_id','text',obj.language.lg_id,'language.lg_id'],['lg_name','text',obj.language.lg_name,'language.lg_name']]);

  // ── Video ─────────────────────────────────────────────────────────
  const videoFields = [];
  if (obj.is_streaming !== undefined) videoFields.push(['is_streaming','text',obj.is_streaming,'is_streaming']);
  if (obj.is_looping   !== undefined) videoFields.push(['is_looping',  'text',obj.is_looping,  'is_looping']);
  if (obj.is_mute      !== undefined) videoFields.push(['is_mute',     'text',obj.is_mute,     'is_mute']);
  if (videoFields.length) addGroup('Video Settings', videoFields);

  // ── Slideshow ─────────────────────────────────────────────────────
  const slideshowFields = [];
  if (obj.show_time         !== undefined) slideshowFields.push(['show_time',         'number',  obj.show_time,         'show_time']);
  if (obj.transition_time   !== undefined) slideshowFields.push(['transition_time',   'number',  obj.transition_time,   'transition_time']);
  if (obj.transition_effect !== undefined) slideshowFields.push(['transition_effect', 'text',    obj.transition_effect, 'transition_effect']);
  if (obj.slideshow_source  !== undefined) slideshowFields.push(['slideshow_source',  'text',    obj.slideshow_source,  'slideshow_source']);
  if (obj.controllable      !== undefined) slideshowFields.push(['controllable',      'boolean', obj.controllable,      'controllable']);
  if (slideshowFields.length) addGroup('Slideshow Settings', slideshowFields);

  if (obj.images) addObjectGroup('images', obj.images, 'images');

  // ── Parameter Source ──────────────────────────────────────────────
  const paramFields = [];
  if (obj.parameter_source       !== undefined) paramFields.push(['parameter_source',       'text', obj.parameter_source,       'parameter_source']);
  if (obj.parameter_source_value !== undefined) paramFields.push(['parameter_source_value', 'text', obj.parameter_source_value, 'parameter_source_value']);
  if (paramFields.length) addGroup('Parameter Source', paramFields);

  // ── ButtonGrid ────────────────────────────────────────────────────
  if (obj.button_grid_id !== undefined || obj.content_type !== undefined) {
    const gridFields = [
      ['button_grid_id',         'text',   obj.button_grid_id],
      ['order',                  'number', obj.order],
      ['layout',                 'text',   obj.layout],
      ['horizontal_alignment',   'text',   obj.horizontal_alignment],
      ['vertical_alignment',     'text',   obj.vertical_alignment],
      ['column',                 'text',   obj.column],
      ['row',                    'text',   obj.row],
      ['item_width',             'number', obj.item_width],
      ['item_height',            'number', obj.item_height],
      ['item_horizontal_gap',    'number', obj.item_horizontal_gap],
      ['item_vertical_gap',      'number', obj.item_vertical_gap],
      ['scroll_horizontal_offset','number',obj.scroll_horizontal_offset],
      ['scroll_vertical_offset', 'number', obj.scroll_vertical_offset],
      ['content_type',           'text',   obj.content_type],
      ['item_data',              'text',   obj.item_data],
    ].filter(([, , v]) => v !== undefined)
     .map(([label, type, value]) => [label, type, value, label]);

    if (gridFields.length) addGroup('ButtonGrid Settings', gridFields);
    if (obj.item_config)    addObjectGroup('item_config',    obj.item_config,    'item_config');
    if (obj.item_component) addObjectGroup('item_component', obj.item_component, 'item_component');
    if (obj.action_parameter && obj.button_grid_id) addObjectGroup('action_parameter (grid)', obj.action_parameter, 'action_parameter');
  }

  // ── Nested collapsible sections ───────────────────────────────────
  if (obj.multilanguage) addObjectGroup('multilanguage', obj.multilanguage, 'multilanguage');
  if (obj.metadata)      addObjectGroup('metadata',      obj.metadata,      'metadata');

  // ── Child objects (Button sub-components) ─────────────────────────
  if (obj.objects?.length > 0) {
    const grp     = _makeGroupEl(`objects [${obj.objects.length} child components]`, true);
    obj.objects.forEach((child) => {
      const btn = document.createElement('button');
      btn.className = 'btn-sm';
      btn.style.cssText = 'width:100%; margin-bottom:4px; text-align:left;';
      btn.textContent   = `${child.component} · ${child.id.split('_').pop()}`;
      btn.onclick = () => {
        state.selectedId = child.id;
        document.querySelectorAll('.component-layer.selected').forEach((x) => x.classList.remove('selected'));
        document.getElementById(`layer_${child.id}`)?.classList.add('selected');
        renderEditor(child);
      };
      grp.body.appendChild(btn);
    });
    scroll.appendChild(grp.el);
  }

  // ── Raw JSON viewer ───────────────────────────────────────────────
  const jsonBtn = document.createElement('button');
  jsonBtn.className   = 'btn-sm';
  jsonBtn.style.cssText = 'width:100%; margin-top:8px;';
  jsonBtn.textContent = '{ } View Full Raw JSON';
  const pre = document.createElement('pre');
  pre.style.cssText =
    'display:none; font-size:9px; font-family:monospace; background:#f5f0ee; ' +
    'border:0.5px solid #d4b8b4; border-radius:3px; padding:6px; max-height:200px; ' +
    'overflow:auto; margin-top:6px; color:#333; white-space:pre-wrap; word-break:break-all;';
  let jsonOpen = false;
  jsonBtn.onclick = () => {
    jsonOpen = !jsonOpen;
    pre.style.display = jsonOpen ? 'block' : 'none';
    jsonBtn.textContent = jsonOpen ? '{ } Hide JSON' : '{ } View Full Raw JSON';
    if (jsonOpen) pre.textContent = JSON.stringify(obj, null, 2);
  };
  scroll.appendChild(jsonBtn);
  scroll.appendChild(pre);

  // ── Delete ────────────────────────────────────────────────────────
  const delBtn = document.createElement('button');
  delBtn.className   = 'btn-sm btn-danger';
  delBtn.style.cssText = 'width:100%; margin-top:6px;';
  delBtn.textContent = '🗑 Delete This Component';
  delBtn.onclick = () => {
    removeById(getLayout().objects, obj.id);
    state.selectedId = null;
    saveHistory();
    render();
    renderEditor(null);
    renderSidebar();
  };
  scroll.appendChild(delBtn);
}

// ── Private DOM builders ──────────────────────────────────────────────────────

function _makeGroupEl(title, startCollapsed = false) {
  const el  = document.createElement('div');
  el.className = 'prop-group';

  const hdr = document.createElement('div');
  hdr.className = 'prop-group-title';

  let collapsed = startCollapsed;
  const body = document.createElement('div');
  body.style.display = collapsed ? 'none' : 'block';

  if (startCollapsed) {
    hdr.style.cssText += '; cursor:pointer; user-select:none;';
    hdr.textContent = `▶ ${title}`;
    hdr.onclick = () => {
      collapsed = !collapsed;
      body.style.display = collapsed ? 'none' : 'block';
      hdr.textContent    = `${collapsed ? '▶' : '▼'} ${title}`;
    };
  } else {
    hdr.textContent = title;
  }

  el.appendChild(hdr);
  el.appendChild(body);
  return { el, body };
}

function _makeRow(label, dotPath = '') {
  const row = document.createElement('div');
  row.className = 'prop-row';
  const lbl = document.createElement('div');
  lbl.className = 'prop-label';
  lbl.textContent = label;
  lbl.title = dotPath;
  row.appendChild(lbl);
  return row;
}

function _makeInput(type, value, dotPath, obj) {
  let inp;

  if (type === 'color') {
    const wrap    = document.createElement('div');
    wrap.style.cssText = 'display:flex; align-items:center; gap:4px; flex:1;';
    const preview = document.createElement('div');
    const safe    = typeof value === 'string' && value.startsWith('#') ? value.substring(0, 7) : '#000000';
    preview.style.cssText = `width:16px; height:16px; border-radius:2px; border:0.5px solid #ccc; flex-shrink:0; background:${safe};`;
    inp = document.createElement('input');
    inp.type  = 'color';
    inp.value = safe;
    inp.style.cssText = 'flex:1; min-width:0; height:22px; border:0.5px solid #ccc; border-radius:3px; cursor:pointer;';
    inp.addEventListener('input', () => { preview.style.background = inp.value; });
    wrap.appendChild(preview);
    wrap.appendChild(inp);
    inp._wrap = wrap;

  } else if (type === 'boolean') {
    inp = document.createElement('select');
    inp.className = 'prop-select';
    ['true', 'false'].forEach((o) => {
      const opt = new Option(o, o);
      if (String(value) === o) opt.selected = true;
      inp.appendChild(opt);
    });

  } else if (type === 'textarea') {
    inp = document.createElement('textarea');
    inp.style.cssText =
      'flex:1; min-width:0; font-size:10px; padding:2px 4px; border:0.5px solid #ccc; border-radius:3px; ' +
      'background:var(--color-background-secondary,#fff); color:var(--color-text-primary,#333); ' +
      'resize:vertical; min-height:40px; font-family:monospace;';
    inp.value = value != null ? (typeof value === 'object' ? JSON.stringify(value, null, 1) : value) : '';

  } else if (type === 'multiline') {
    inp = document.createElement('textarea');
    inp.style.cssText =
      'flex:1; min-width:0; font-size:11px; padding:4px; border:0.5px solid #ccc; border-radius:3px; ' +
      'background:var(--color-background-secondary,#fff); color:var(--color-text-primary,#333); ' +
      'resize:vertical; min-height:50px; font-family:inherit; line-height:1.4; white-space:pre-wrap;';
    inp.value = value ?? '';

  } else {
    inp = document.createElement('input');
    inp.type      = type === 'number' ? 'number' : 'text';
    inp.value     = value ?? '';
    inp.className = 'prop-input';
  }

  inp.dataset.dotpath = dotPath;

  inp.addEventListener('input', function () {
    const finalVal = coerceInputValue(this.value, type);

    // Rekam state lama sebelum melakukan update
    const prevWidth  = obj.transform?.width;
    const prevHeight = obj.transform?.height;
    const prevX      = obj.transform?.x;
    const prevY      = obj.transform?.y;

    setByPath(obj, dotPath, finalVal);

    // Menjaga proporsi raw scale jika width/height diubah
    if (dotPath === 'transform.width' && obj.transform?.raw && typeof prevWidth === 'number' && prevWidth !== 0) {
      const ratio = (typeof finalVal === 'number') ? finalVal / prevWidth : 1;
      obj.transform.raw.width = (obj.transform.raw.width ?? finalVal) * ratio;
    }
    if (dotPath === 'transform.height' && obj.transform?.raw && typeof prevHeight === 'number' && prevHeight !== 0) {
      const ratio = (typeof finalVal === 'number') ? finalVal / prevHeight : 1;
      obj.transform.raw.height = (obj.transform.raw.height ?? finalVal) * ratio;
    }

    // Geser seluruh children otomatis jika input X/Y induk diubah
    if (dotPath === 'transform.x' && typeof prevX === 'number' && typeof finalVal === 'number') {
      const dx = finalVal - prevX;
      if (dx !== 0) _shiftChildren(obj, dx, 0);
    }
    if (dotPath === 'transform.y' && typeof prevY === 'number' && typeof finalVal === 'number') {
      const dy = finalVal - prevY;
      if (dy !== 0) _shiftChildren(obj, 0, dy);
    }

    render();
    if (state.layoutSubTab === 'layers') renderSidebar();
  });

  inp.addEventListener('change', () => saveHistory());
  return inp;
}

function _renderFlatFields(sourceObj, dotPrefix, container, rootObj) {
  Object.keys(sourceObj).forEach((key) => {
    const fullPath = `${dotPrefix}.${key}`;
    const val      = sourceObj[key];

    const row = _makeRow(key, fullPath);

    if (val !== null && typeof val === 'object') {
      const inp = _makeInput('textarea', val, fullPath, rootObj);
      row.appendChild(inp);
    } else {
      const type = detectType(key, val);
      const inp  = _makeInput(type, val, fullPath, rootObj);
      row.appendChild(inp._wrap ?? inp);
    }

    container.appendChild(row);
  });
}

/** 
 * Rekursif menggeser child components sejumlah delta (dx, dy).
 * Berjalan otomatis jika induknya dipindah di dalam property panel.
 */
function _shiftChildren(node, dx, dy) {
  if (!node.objects) return;
  node.objects.forEach(child => {
    if (child.transform) {
      child.transform.x = (child.transform.x ?? 0) + dx;
      child.transform.y = (child.transform.y ?? 0) + dy;
    }
    _shiftChildren(child, dx, dy);
  });
}