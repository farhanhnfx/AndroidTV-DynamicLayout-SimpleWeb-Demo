/**
 * sidebar.js — Left-panel renderer for all app modes.
 * Dispatches to the correct sub-renderer based on state.appMode / state.layoutSubTab.
 */

import { state, getLayout }      from '../core/state.js';
import { saveHistory }            from '../core/history.js';
import { render }                 from './canvas.js';
import { renderEditor }           from './editor.js';
import { flatObjects, sortByLayer, toJsonFilename } from '../utils/helpers.js';
import { COMPONENT_TYPES, createTemplate } from '../utils/templates.js';
import { fetchItems, saveItems }  from '../core/api.js';

// ── Public ────────────────────────────────────────────────────────────────────

export function renderSidebar() {
  const c = document.getElementById('sidebarContent');
  c.innerHTML = '';
  switch (state.appMode) {
    case 'layout': state.layoutSubTab === 'scene' ? _renderSceneInfo(c) : _renderLayersTree(c); break;
    case 'master': _renderMasterList(c);      break;
    case 'menu':   _renderMenuList(c);         break;
    case 'data':   _renderDataManagement(c);   break;
  }
}

// ── Layout › Scene Info ───────────────────────────────────────────────────────

function _renderSceneInfo(c) {
  const layout = getLayout();
  if (!layout) {
    c.innerHTML = '<div class="no-selection" style="height:80px">Select a scene first</div>';
    return;
  }

  const sec = document.createElement('div');
  sec.className = 'scene-editor-section';

  // Metadata fields
  const fields = [
    ['scene_dm_id',   'Layout DM ID',      layout.dm_id,                        'dm_id'],
    ['scene_name',    'Scene Name',         layout.scene ?? '',                  'scene'],
    ['layout_name',   'Layout Name',        layout.layout_name ?? '',            'layout_name'],
    ['file_name',     'File Name (.json)',  state.fileMapping[layout.dm_id] ?? '', 'file_name'],
    ['base_w',        'Canvas Width',       layout.base_layout?.width  ?? '1920', 'base_width'],
    ['base_h',        'Canvas Height',      layout.base_layout?.height ?? '1080', 'base_height'],
  ];

  fields.forEach(([fid, label, val]) => {
    const d   = document.createElement('div');
    d.className = 'scene-field';
    d.innerHTML = `<label for="${fid}">${label}</label>`;
    const inp   = document.createElement('input');
    inp.id    = fid;
    inp.value = val;
    if (fid === 'file_name') inp.placeholder = 'e.g. start.json';
    d.appendChild(inp);
    sec.appendChild(d);
  });

  const saveBtn = document.createElement('button');
  saveBtn.className   = 'btn-apply';
  saveBtn.textContent = 'Save Metadata Info';
  saveBtn.onclick = () => {
    const oldId  = state.currentScene;
    const newId  = document.getElementById('scene_dm_id').value;
    layout.scene       = document.getElementById('scene_name').value;
    layout.layout_name = document.getElementById('layout_name').value;

    let fName = document.getElementById('file_name').value;
    if (fName) {
      fName = fName.replace(/[^a-z0-9_.-]/gi, '').toLowerCase();
      if (!fName.endsWith('.json')) fName += '.json';
    }
    state.fileMapping[newId] = fName;

    if (!layout.base_layout) layout.base_layout = {};
    layout.base_layout.width  = document.getElementById('base_w').value;
    layout.base_layout.height = document.getElementById('base_h').value;
    layout.dm_id = newId;

    if (oldId !== newId) {
      state.sceneData[newId] = state.sceneData[oldId];
      delete state.sceneData[oldId];
      delete state.fileMapping[oldId];
      state.currentScene = newId;
    }

    saveHistory();
    _extractScenes();
    buildSceneTabs();
    renderSidebar();
    render();
  };
  sec.appendChild(saveBtn);

  // Import / Export row
  const ioRow = document.createElement('div');
  ioRow.style.cssText = 'display:flex; gap:6px; margin-top:8px;';

  const exportBtn = _makeBtn('⬇ Export JSON', 'btn-sm', () => {
    const json = JSON.stringify(state.sceneData[state.currentScene], null, 2);
    _download(json, state.fileMapping[state.currentScene] ?? toJsonFilename(layout.layout_name ?? state.currentScene));
  });
  exportBtn.style.flex = '1';

  const importBtn = _makeBtn('⬆ Import JSON', 'btn-sm', () => {
    const inp = document.createElement('input');
    inp.type    = 'file';
    inp.accept  = '.json';
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          if (!parsed.objects || !parsed.base_layout) {
            alert('Invalid JSON: must have "objects" and "base_layout"');
            return;
          }
          const key = parsed.dm_id ?? state.currentScene;
          state.sceneData[key]    = parsed;
          state.fileMapping[key]  = file.name;
          state.currentScene      = key;
          saveHistory();
          _extractScenes();
          buildSceneTabs();
          renderSidebar();
          render();
          alert(`Layout imported: ${parsed.layout_name ?? key}`);
        } catch (err) {
          alert('Parse error: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  });
  importBtn.style.flex = '1';

  ioRow.appendChild(exportBtn);
  ioRow.appendChild(importBtn);
  sec.appendChild(ioRow);

  const exportAllBtn = _makeBtn('⬇ Export ALL Layouts (bundle)', 'btn-sm', () => {
    const bundle = {
      status: true,
      results: { layout: Object.values(state.sceneData), file_mapping: state.fileMapping },
    };
    _download(JSON.stringify(bundle, null, 2), 'all_layouts_bundle.json');
  });
  exportAllBtn.style.cssText = 'width:100%; margin-top:6px;';
  sec.appendChild(exportAllBtn);

  sec.appendChild(_makeDivider());

  // Add Component
  const compTitle = document.createElement('div');
  compTitle.style.cssText = 'font-size:11px; font-weight:600; margin-bottom:6px;';
  compTitle.textContent = 'Add Component';
  sec.appendChild(compTitle);

  const selComp = document.createElement('select');
  selComp.className = 'scene-field select';
  selComp.style.cssText = 'width:100%; margin-bottom:6px;';
  COMPONENT_TYPES.forEach((t) => selComp.add(new Option(t, t)));
  sec.appendChild(selComp);

  const addCompBtn = _makeBtn('+ Insert Object', 'btn-sm', () => {
    const layerIndex = flatObjects(layout.objects ?? []).length;
    const newObj     = createTemplate(selComp.value, layerIndex);
    if (!layout.objects) layout.objects = [];
    layout.objects.push(newObj);
    saveHistory();
    _renderSceneInfo(document.getElementById('sidebarContent'));
    render();
  });
  addCompBtn.style.width = '100%';
  sec.appendChild(addCompBtn);

  sec.appendChild(_makeDivider());

  const delBtn = _makeBtn('🗑 Delete This Master Layout', 'btn-apply btn-danger', () => {
    if (confirm(`Delete layout "${layout.layout_name}"?`)) {
      delete state.sceneData[state.currentScene];
      delete state.fileMapping[state.currentScene];
      _extractScenes();
      state.currentScene = state.scenes[0]?.id ?? null;
      state.selectedId   = null;
      buildSceneTabs();
      renderSidebar();
      renderEditor(null);
      render();
    }
  });
  sec.appendChild(delBtn);
  c.appendChild(sec);
}

// ── Layout › Layers Tree ──────────────────────────────────────────────────────

function _renderLayersTree(c) {
  const layout = getLayout();
  if (!layout?.objects?.length) {
    c.innerHTML = '<div class="no-selection" style="height:80px">Layout is empty</div>';
    return;
  }

  const sec = document.createElement('div');
  sec.style.padding = '4px 0';

  const buildNode = (objs, depth, parent) => {
    sortByLayer(objs).forEach((obj) => {
      const item = document.createElement('div');
      item.className     = 'tree-item' + (state.selectedId === obj.id ? ' active' : '');
      item.style.paddingLeft = `${depth * 14 + 6}px`;

      const icon = _componentIcon(obj.component);
      const shortId = obj.id.split('_').pop();
      item.innerHTML =
        `<span class="tree-icon">${icon}</span>` +
        `<span class="tree-label">${obj.component}<span class="tree-id">#${shortId}</span></span>`;

      item.onclick = (e) => {
        e.stopPropagation();
        state.selectedId = obj.id;
        document.querySelectorAll('.component-layer.selected').forEach((x) => x.classList.remove('selected'));
        document.getElementById(`layer_${obj.id}`)?.classList.add('selected');
        renderEditor(obj);
        renderSidebar();
      };
      parent.appendChild(item);
      if (obj.objects?.length) buildNode(obj.objects, depth + 1, parent);
    });
  };

  buildNode(layout.objects, 0, sec);
  c.appendChild(sec);
}

// ── Master Mapping ────────────────────────────────────────────────────────────

function _renderMasterList(c) {
  const sec = document.createElement('div');
  sec.style.padding = '4px 0';

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:10px; font-weight:600; margin-bottom:8px; color:var(--color-text-secondary); padding:0 8px;';
  lbl.textContent = 'File Mapping (.json)';
  sec.appendChild(lbl);

  const layouts = Object.values(state.sceneData);
  if (!layouts.length) {
    sec.innerHTML += '<div style="text-align:center;color:#888;font-size:10px;padding:10px;">No layouts.</div>';
  }

  layouts.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'menu-item' + (state.selectedMasterId === m.dm_id ? ' active' : '');
    div.innerHTML =
      `<div class="menu-item-name">${m.layout_name ?? 'Unnamed Layout'}</div>` +
      `<div class="menu-item-meta">ID: ${m.dm_id} · File: ${state.fileMapping[m.dm_id] ?? '(auto)'}</div>`;
    div.onclick = () => {
      state.selectedMasterId = m.dm_id;
      renderSidebar();
      _renderMasterEditor(m);
    };
    sec.appendChild(div);
  });
  c.appendChild(sec);
}

function _renderMasterEditor(m) {
  const scroll = document.getElementById('editorScroll');
  const header = document.getElementById('editorHeader');
  if (!m) {
    scroll.innerHTML = '<div class="no-selection">Pick a layout on the left</div>';
    header.textContent = 'Master Mapping Config';
    return;
  }
  scroll.innerHTML = '';
  header.textContent = `Mapping: ${m.layout_name ?? m.dm_id}`;

  const fields = [
    ['dm_id',        'Layout DM ID',   m.dm_id],
    ['layout_name',  'Layout Name',    m.layout_name ?? ''],
    ['scene',        'Scene Name',     m.scene ?? ''],
    ['file_name',    'File Name (.json)', state.fileMapping[m.dm_id] ?? ''],
  ];

  const grp = document.createElement('div'); grp.className = 'prop-group';
  const hdr = document.createElement('div'); hdr.className = 'prop-group-title'; hdr.textContent = 'Metadata & File';
  grp.appendChild(hdr);

  fields.forEach(([key, label, val]) => {
    const row = document.createElement('div'); row.className = 'prop-row';
    const lbl = document.createElement('div'); lbl.className = 'prop-label'; lbl.textContent = label;
    row.appendChild(lbl);
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'prop-input'; inp.value = val ?? '';
    if (key === 'file_name') inp.placeholder = 'e.g. start.json';

    inp.addEventListener('change', function () {
      let v = this.value;
      if (key === 'dm_id' && v !== m.dm_id) {
        if (state.sceneData[v]) { alert('DM ID already in use!'); this.value = m.dm_id; return; }
        state.sceneData[v] = state.sceneData[m.dm_id];
        delete state.sceneData[m.dm_id];
        state.sceneData[v].dm_id = v;
        state.fileMapping[v] = state.fileMapping[m.dm_id];
        delete state.fileMapping[m.dm_id];
        state.selectedMasterId = v;
        _extractScenes();
      } else if (key === 'file_name') {
        v = v.replace(/[^a-z0-9_.-]/gi, '').toLowerCase();
        if (v && !v.endsWith('.json')) v += '.json';
        this.value = v;
        state.fileMapping[m.dm_id] = v;
      } else {
        m[key] = v;
      }
      renderSidebar();
    });

    row.appendChild(inp); grp.appendChild(row);
  });
  scroll.appendChild(grp);

  const info = document.createElement('div');
  info.className = 'info-box';
  info.innerHTML =
    '<strong>Note:</strong> If file name is empty, the server will auto-generate one from <em>Layout Name</em> during Sync.';
  scroll.appendChild(info);
}

// ── Menu Routing ──────────────────────────────────────────────────────────────

function _renderMenuList(c) {
  const sec = document.createElement('div');
  sec.style.padding = '4px 0';

  const addBtn = _makeBtn('+ Add Menu Route', 'btn-sm', () => {
    const id = prompt('Enter a unique DM ID (e.g. 20):');
    if (!id) return;
    if (state.menuList.find((m) => m.dm_id === id)) { alert('ID already exists!'); return; }
    const newMenu = {
      dm_id: id, name: 'New Menu', package_name_tv: '', apk_tv: null, apk_hash: '',
      persistent: false, auto_update: true, update_interval: '1',
      allow_back: '0', dm_type: 'dynamic',
    };
    state.menuList.push(newMenu);
    state.selectedMenuId = id;
    renderSidebar();
    _renderMenuEditor(newMenu);
  });
  addBtn.style.cssText = 'width:100%; margin-bottom:8px;';
  sec.appendChild(addBtn);

  if (!state.menuList.length) {
    sec.innerHTML += '<div style="text-align:center;color:#888;font-size:10px;padding:10px;">Menu is empty.</div>';
  }

  state.menuList.forEach((m) => {
    const div = document.createElement('div');
    div.className = 'menu-item' + (state.selectedMenuId === m.dm_id ? ' active' : '');
    const badgeClass = m.dm_type === 'static' ? 'badge-static' : m.dm_type === 'apps' ? 'badge-apps' : 'badge-dynamic';
    div.innerHTML =
      `<div class="menu-item-name">${m.name} <span class="badge ${badgeClass}">${m.dm_type}</span></div>` +
      `<div class="menu-item-meta">ID: ${m.dm_id} · back: ${m.allow_back === '1' ? 'yes' : 'no'}</div>`;
    div.onclick = () => { state.selectedMenuId = m.dm_id; renderSidebar(); _renderMenuEditor(m); };
    sec.appendChild(div);
  });
  c.appendChild(sec);
}

function _renderMenuEditor(m) {
  const scroll = document.getElementById('editorScroll');
  const header = document.getElementById('editorHeader');
  if (!m) {
    scroll.innerHTML = '<div class="no-selection">Pick a menu on the left</div>';
    header.textContent = 'Menu Properties';
    return;
  }
  scroll.innerHTML = '';
  header.textContent = `Route: ${m.name}`;

  const fields = [
    ['dm_id',           'Route ID',           'text',   m.dm_id],
    ['name',            'Display Name',        'text',   m.name],
    ['dm_type',         'App Type',            'select', m.dm_type,            ['static','dynamic','apps']],
    ['allow_back',      'Allow Back',          'select', m.allow_back,          ['0','1']],
    ['auto_update',     'Auto Update',         'select', String(m.auto_update), ['true','false']],
    ['update_interval', 'Update Interval (min)','number',m.update_interval],
    ['persistent',      'Persistent',          'select', String(m.persistent ?? false), ['true','false']],
    ['package_name_tv', 'Package Name (Apps)', 'text',   m.package_name_tv ?? ''],
    ['apk_tv',          'APK URL/Path',        'text',   m.apk_tv ?? ''],
    ['apk_hash',        'APK Hash',            'text',   m.apk_hash ?? ''],
  ];

  const grp = document.createElement('div'); grp.className = 'prop-group';
  const hdr = document.createElement('div'); hdr.className = 'prop-group-title'; hdr.textContent = 'Routing Config';
  grp.appendChild(hdr);

  fields.forEach(([key, label, type, val, opts]) => {
    const row = document.createElement('div'); row.className = 'prop-row';
    const lbl = document.createElement('div'); lbl.className = 'prop-label'; lbl.textContent = label;
    row.appendChild(lbl);

    let inp;
    if (type === 'select') {
      inp = document.createElement('select'); inp.className = 'prop-select';
      (opts ?? []).forEach((o) => {
        const opt = new Option(o, o); if (String(val) === o) opt.selected = true; inp.appendChild(opt);
      });
    } else {
      inp = document.createElement('input'); inp.type = type === 'number' ? 'number' : 'text';
      inp.className = 'prop-input'; inp.value = val ?? '';
    }

    inp.addEventListener('input', function () {
      const v = this.value;
      if (key === 'auto_update' || key === 'persistent') m[key] = v === 'true';
      else m[key] = v;
      if (key === 'dm_id') state.selectedMenuId = v;
      renderSidebar();
    });

    row.appendChild(inp); grp.appendChild(row);
  });
  scroll.appendChild(grp);

  const delBtn = _makeBtn('🗑 Delete Route', 'btn-sm btn-danger', () => {
    state.menuList = state.menuList.filter((x) => x.dm_id !== m.dm_id);
    state.selectedMenuId = null;
    renderSidebar();
    _renderMenuEditor(null);
  });
  delBtn.style.cssText = 'margin-top:8px; width:100%;';
  scroll.appendChild(delBtn);
}

// ── Data Management ───────────────────────────────────────────────────────────

function _renderDataManagement(c) {
  const sec = document.createElement('div'); sec.style.padding = '4px 0';

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:10px; font-weight:600; margin-bottom:4px; color:var(--color-text-secondary);';
  lbl.textContent = 'Collection / File:';
  sec.appendChild(lbl);

  const sel = document.createElement('select');
  sel.className = 'scene-field select'; sel.style.cssText = 'width:100%; margin-bottom:6px;';
  state.contentTypesList.forEach((t) => {
    const opt = new Option(t, t); if (t === state.currentContentType) opt.selected = true; sel.add(opt);
  });
  sel.onchange = (e) => _fetchGridData(e.target.value);
  sec.appendChild(sel);

  const newTypeBtn = _makeBtn('+ New API Collection', 'btn-sm', () => {
    const nt = prompt('Collection name (no spaces, e.g. promo_items):');
    if (nt && !state.contentTypesList.includes(nt)) {
      state.contentTypesList.push(nt);
      _fetchGridData(nt);
    }
  });
  newTypeBtn.style.cssText = 'width:100%; margin-bottom:8px;';
  sec.appendChild(newTypeBtn);

  sec.appendChild(_makeDivider());

  const saveBtn = _makeBtn(`💾 Save '${state.currentContentType}'`, 'btn-apply', async () => {
    saveBtn.disabled = true;
    const ok = await saveItems(state.currentContentType, state.gridDataItems);
    if (ok) {
      alert(`Saved '${state.currentContentType}'!`);
      state.gridDataCache[state.currentContentType] = null;
    } else {
      alert('Failed to save.');
    }
    saveBtn.disabled = false;
  });
  saveBtn.style.background = '#1e9650';
  sec.appendChild(saveBtn);

  sec.appendChild(_makeDivider());

  const addBtn = _makeBtn('+ Add Row/Item', 'btn-sm', () => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 5),
      name_text: 'New Item', desc_text: '', price_text: 0, qty_text: 0,
      image: '', text_1: '', text_2: '', text_3: '',
    };
    state.gridDataItems.push(newItem);
    state.selectedDataId = newItem.id;
    renderSidebar();
    _renderDataEditor(newItem);
  });
  addBtn.style.cssText = 'width:100%; margin-bottom:6px;';
  sec.appendChild(addBtn);

  if (!state.gridDataItems.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:10px; text-align:center; color:#888; padding:10px 0;';
    empty.textContent = 'Collection is empty.';
    sec.appendChild(empty);
  } else {
    state.gridDataItems.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'menu-item' + (state.selectedDataId === item.id ? ' active' : '');
      div.innerHTML =
        `<div class="menu-item-name">${item.name_text ?? 'Unnamed'}</div>` +
        `<div class="menu-item-meta">ID: ${item.id}</div>`;
      div.onclick = () => { state.selectedDataId = item.id; renderSidebar(); _renderDataEditor(item); };
      sec.appendChild(div);
    });
  }
  c.appendChild(sec);
}

async function _fetchGridData(type) {
  state.currentContentType = type;
  state.gridDataItems      = await fetchItems(type);
  state.selectedDataId     = null;
  renderSidebar();
  _renderDataEditor(null);
}

function _renderDataEditor(item) {
  const scroll = document.getElementById('editorScroll');
  const header = document.getElementById('editorHeader');
  if (!item) {
    scroll.innerHTML = '<div class="no-selection">Pick a Data item on the left</div>';
    header.textContent = 'API Data Properties';
    return;
  }
  scroll.innerHTML = '';
  header.textContent = 'Editing Data Node';

  const grp = document.createElement('div'); grp.className = 'prop-group';
  const hdr = document.createElement('div'); hdr.className = 'prop-group-title'; hdr.textContent = 'JSON Fields';
  grp.appendChild(hdr);

  const rows = [
    ['ID',          'text',     item.id,          'id'],
    ['Name',        'text',     item.name_text,    'name_text'],
    ['Price',       'number',   item.price_text,   'price_text'],
    ['Qty',         'number',   item.qty_text,     'qty_text'],
    ['Description', 'textarea', item.desc_text,    'desc_text'],
    ['Image URL',   'textarea', item.image,        'image'],
    ['Text 1',      'text',     item.text_1,       'text_1'],
    ['Text 2',      'text',     item.text_2,       'text_2'],
    ['Text 3',      'text',     item.text_3,       'text_3'],
  ];

  rows.forEach(([label, type, value, key]) => {
    const row = document.createElement('div'); row.className = 'prop-row';
    const lbl = document.createElement('div'); lbl.className = 'prop-label'; lbl.textContent = label;
    row.appendChild(lbl);

    let inp;
    if (type === 'textarea') {
      inp = document.createElement('textarea');
      inp.className = 'prop-input'; inp.style.height = '48px'; inp.style.resize = 'vertical';
      inp.value = value ?? '';
    } else {
      inp = document.createElement('input');
      inp.type  = type === 'number' ? 'number' : 'text';
      inp.value = value ?? '';
      inp.className = 'prop-input';
    }

    inp.addEventListener('input', function () {
      item[key] = type === 'number' ? (parseFloat(this.value) || 0) : this.value;
      if (key === 'id') state.selectedDataId = this.value;
      renderSidebar();
    });
    row.appendChild(inp); grp.appendChild(row);
  });
  scroll.appendChild(grp);

  const delBtn = _makeBtn('🗑 Delete Item', 'btn-sm btn-danger', () => {
    state.gridDataItems    = state.gridDataItems.filter((x) => x.id !== item.id);
    state.selectedDataId   = null;
    renderSidebar();
    _renderDataEditor(null);
  });
  delBtn.style.cssText = 'width:100%; margin-top:8px;';
  scroll.appendChild(delBtn);
}

// ── Scene Tabs (used by multiple callers) ─────────────────────────────────────

export function buildSceneTabs() {
  const c = document.getElementById('sceneTabs');
  c.innerHTML = '';

  state.scenes.forEach((s) => {
    const btn = document.createElement('button');
    btn.className   = 'scene-tab' + (s.id === state.currentScene ? ' active' : '');
    btn.textContent = s.name;
    btn.onclick = () => {
      state.currentScene = s.id;
      state.selectedId   = null;
      render();
      buildSceneTabs();
      renderSidebar();
      // Reset history for new scene
      import('../core/history.js').then(({ resetHistory, saveHistory: sh }) => { resetHistory(); sh(); });
    };
    c.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className   = 'scene-tab add-btn';
  addBtn.textContent = '+ New Layout';
  addBtn.onclick     = _addNewScene;
  c.appendChild(addBtn);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _addNewScene() {
  const id   = prompt('Enter a unique ID for the new layout:');
  if (!id) return;
  if (state.sceneData[id]) { alert('ID already exists!'); return; }
  const name = prompt('Scene name:', 'Custom Layout');
  if (!name) return;

  state.sceneData[id] = {
    dm_id: id, layout_name: name, scene: name,
    base_layout: { width: '1920', height: '1080' },
    objects: [],
  };
  state.fileMapping[id] = toJsonFilename(name);
  _extractScenes();
  state.currentScene = id;
  buildSceneTabs();
  renderSidebar();
  render();
  import('../core/history.js').then(({ resetHistory, saveHistory: sh }) => { resetHistory(); sh(); });
}

export function extractScenes() { _extractScenes(); }

function _extractScenes() {
  state.scenes = Object.keys(state.sceneData).map((key) => ({
    id:     key,
    name:   state.sceneData[key].scene ?? state.sceneData[key].layout_name ?? `Layout ${key}`,
    dm_id:  state.sceneData[key].dm_id,
  }));
}

function _componentIcon(component) {
  if (component === 'Rectangle' || component === 'Button_Rectangle') return '▭';
  if (component === 'Image'     || component === 'Button_Image')     return '🖼';
  if (component.includes('Text') || component === 'Clock')           return 'T';
  if (component === 'Button')                                         return '👆';
  if (component === 'ButtonGrid')                                     return '⊞';
  if (component === 'Video')                                          return '▶';
  return '⚬';
}

function _makeBtn(text, cls, onClick) {
  const btn = document.createElement('button');
  btn.className   = cls;
  btn.textContent = text;
  btn.onclick     = onClick;
  return btn;
}

function _makeDivider() {
  const d = document.createElement('div'); d.className = 'divider'; return d;
}

function _download(content, filename) {
  const blob = new Blob([content], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
