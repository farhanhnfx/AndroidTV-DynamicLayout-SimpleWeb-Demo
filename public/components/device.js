/**
 * device.js — Device Manager UI module.
 *
 * Renders:
 *   • Left panel  → searchable room list + Add button
 *   • Right panel → form editor for the selected device entry
 *
 * Wires into the existing app shell by:
 *   1. Registering 'device' as a valid appMode via setMode()
 *   2. Rendering into #sidebarContent / #editorScroll / #editorHeader
 *      (same DOM slots used by all other modes)
 *
 * Usage in main.js:
 *   import { initDeviceMode } from './components/device.js';
 *   initDeviceMode();
 *
 * Usage in HTML (mode button):
 *   <button class="mode-btn" id="modeBtn_device" onclick="setMode('device')">Devices</button>
 */

import { deviceState, filteredRoomList } from '../core/state.device.js';
import {
  fetchRoomList,
  saveRoomList,
  updateDevice,
  deleteDevice,
} from '../core/api.device.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Call once from main.js after DOM is ready.
 * Loads initial data and patches the global setMode dispatcher.
 */
export async function initDeviceMode() {
  await _loadRoomList();
}

/** Called by the app's mode controller whenever mode === 'device'. */
export function onDeviceModeEnter() {
  deviceState.selectedDevice = null;
  renderDeviceSidebar();
  _renderDeviceEditorEmpty();
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function renderDeviceSidebar() {
  const c = document.getElementById('sidebarContent');
  if (!c) return;
  c.innerHTML = '';
  c.appendChild(_buildSidebar());
}

function _buildSidebar() {
  const wrap = document.createElement('div');
  wrap.style.padding = '4px 0';

  // ── Header row: title + Save All button ──────────────────────────
  const headerRow = document.createElement('div');
  headerRow.style.cssText =
    'display:flex; align-items:center; justify-content:space-between; padding:0 4px 8px;';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:10px; font-weight:600; color:var(--color-text-secondary,#888);';
  title.textContent = `DEVICES (${deviceState.roomList.length})`;

  const saveAllBtn = _btn('💾 Save All', 'btn-sm', _handleSaveAll);
  saveAllBtn.style.cssText = 'font-size:9px; padding:2px 6px;';
  saveAllBtn.title = 'POST full list to /api/room-list';

  headerRow.appendChild(title);
  headerRow.appendChild(saveAllBtn);
  wrap.appendChild(headerRow);

  // ── Search / filter ───────────────────────────────────────────────
  const searchWrap = document.createElement('div');
  searchWrap.style.cssText = 'position:relative; margin-bottom:6px; padding:0 4px;';

  const searchIcon = document.createElement('span');
  searchIcon.textContent = '⌕';
  searchIcon.style.cssText =
    'position:absolute; left:10px; top:50%; transform:translateY(-50%); ' +
    'font-size:12px; color:#aaa; pointer-events:none;';

  const searchInp = document.createElement('input');
  searchInp.type        = 'text';
  searchInp.placeholder = 'Search device / room / guest…';
  searchInp.value       = deviceState.filterQuery;
  searchInp.style.cssText =
    'width:100%; box-sizing:border-box; padding:5px 8px 5px 24px; ' +
    'font-size:10px; border:0.5px solid #ccc; border-radius:4px; ' +
    'background:var(--color-background-secondary,#fff); color:var(--color-text-primary,#333);';
  searchInp.addEventListener('input', (e) => {
    deviceState.filterQuery = e.target.value;
    _refreshList(wrap);
  });

  searchWrap.appendChild(searchIcon);
  searchWrap.appendChild(searchInp);
  wrap.appendChild(searchWrap);

  // ── Add new row button ────────────────────────────────────────────
  const addBtn = _btn('+ Add Device', 'btn-sm', () => {
    const newEntry = { device: '', room_number: '', guest_name: '' };
    deviceState.roomList.unshift(newEntry);
    deviceState.selectedDevice = ''; // blank device id = unsaved new row
    renderDeviceSidebar();
    _renderDeviceEditor(newEntry, true);
  });
  addBtn.style.cssText = 'width:calc(100% - 8px); margin:0 4px 8px; display:block;';
  wrap.appendChild(addBtn);

  // ── Status banner ─────────────────────────────────────────────────
  if (deviceState.status === 'loading') {
    wrap.appendChild(_banner('⏳ Loading…', '#555'));
  } else if (deviceState.status === 'error') {
    wrap.appendChild(_banner(`⚠ ${deviceState.lastError}`, '#c0392b'));
  }

  // ── List ──────────────────────────────────────────────────────────
  const listEl = document.createElement('div');
  listEl.id = 'deviceList';
  _renderList(listEl);
  wrap.appendChild(listEl);

  return wrap;
}

function _refreshList(sidebarWrap) {
  const listEl = sidebarWrap.querySelector('#deviceList') ??
                 document.getElementById('deviceList');
  if (listEl) _renderList(listEl);
}

function _renderList(listEl) {
  listEl.innerHTML = '';
  const rows = filteredRoomList();

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:10px; text-align:center; color:#888; padding:16px 0;';
    empty.textContent = deviceState.filterQuery ? 'No results.' : 'No devices yet.';
    listEl.appendChild(empty);
    return;
  }

  rows.forEach((entry) => {
    const div = document.createElement('div');
    div.className = 'menu-item' + (deviceState.selectedDevice === entry.device ? ' active' : '');
    div.style.cssText += 'cursor:pointer;';

    // Online indicator dot (purely cosmetic placeholder)
    const dot = _statusDot(entry.device);

    const info = document.createElement('div');
    info.style.flex = '1';
    info.innerHTML =
      `<div class="menu-item-name" style="display:flex;align-items:center;gap:5px;">` +
        `${dot.outerHTML}<span>${_esc(entry.guest_name || '—')}</span>` +
      `</div>` +
      `<div class="menu-item-meta">` +
        `<span style="font-weight:600;">${_esc(entry.room_number || 'No room')}</span>` +
        ` · ${_esc(entry.device || 'No device ID')}` +
      `</div>`;

    div.appendChild(info);
    div.onclick = () => {
      deviceState.selectedDevice = entry.device;
      renderDeviceSidebar();
      _renderDeviceEditor(entry, false);
    };
    listEl.appendChild(div);
  });
}

// ── Editor panel ──────────────────────────────────────────────────────────────

function _renderDeviceEditorEmpty() {
  document.getElementById('editorScroll').innerHTML =
    '<div class="no-selection"><span>Select a device<br>to edit its properties</span></div>';
  document.getElementById('editorHeader').textContent = 'Device Properties';
}

/**
 * @param {import('../core/api.device.js').RoomEntry} entry
 * @param {boolean} isNew — true when this is a newly inserted (unsaved) row
 */
function _renderDeviceEditor(entry, isNew) {
  const scroll = document.getElementById('editorScroll');
  const header = document.getElementById('editorHeader');
  scroll.innerHTML = '';
  header.textContent = isNew ? 'New Device' : `Device: ${entry.device || '—'}`;

  // ── Form card ─────────────────────────────────────────────────────
  const grp = document.createElement('div');
  grp.className = 'prop-group';

  const grpTitle = document.createElement('div');
  grpTitle.className   = 'prop-group-title';
  grpTitle.textContent = 'Device Info';
  grp.appendChild(grpTitle);

  // Working copy so we don't mutate roomList until Save is clicked
  const draft = { ...entry };

  // Simpan device ID asli untuk deteksi rename
  const originalDevice = entry.device;

  const fields = [
    { key: 'device',      label: 'Device ID',   placeholder: 'e.g. lenovo4977a' },
    { key: 'room_number', label: 'Room Number',  placeholder: 'e.g. Room 5B' },
    { key: 'guest_name',  label: 'Guest Name',   placeholder: 'e.g. Mr. John Doe' },
  ];

  const inputs = {};

  fields.forEach(({ key, label, placeholder }) => {
    const row = document.createElement('div');
    row.className = 'prop-row';

    const lbl = document.createElement('div');
    lbl.className   = 'prop-label';
    lbl.textContent = label;
    row.appendChild(lbl);

    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.className   = 'prop-input';
    inp.value       = draft[key] ?? '';
    inp.placeholder = placeholder;

    inp.addEventListener('input', () => {
      draft[key] = inp.value;
      if (key === 'device') header.textContent = `Device: ${inp.value || '\u2014'}`;
    });
    inputs[key] = inp;
    row.appendChild(inp);
    grp.appendChild(row);
  });

  scroll.appendChild(grp);

  // ── Info box ──────────────────────────────────────────────────────
  if (!isNew) {
    const info = document.createElement('div');
    info.className = 'info-box';
    info.innerHTML =
      '<strong>Tip:</strong> "Save Entry" updates only this row via <code>POST /api/room-list/:device</code>. ' +
      'Use <strong>💾 Save All</strong> in the sidebar to push the complete list in one call.';
    scroll.appendChild(info);
  }

  // ── Action buttons ────────────────────────────────────────────────
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; flex-direction:column; gap:6px; margin-top:10px;';

  // Save / Create
  const saveLabel = isNew ? '✓ Create Device' : '✓ Save Entry';
  const saveBtn = _btn(saveLabel, 'btn-apply', async () => {
    const device      = inputs.device.value.trim();
    const room_number = inputs.room_number.value.trim();
    const guest_name  = inputs.guest_name.value.trim();

    if (!device) { _flashError(inputs.device, 'Device ID is required'); return; }

    const updatedEntry = { device, room_number, guest_name };

    // Update in-memory list
    if (isNew) {
      const idx = deviceState.roomList.findIndex((r) => r.device === '');
      if (idx !== -1) deviceState.roomList[idx] = updatedEntry;
      else deviceState.roomList.unshift(updatedEntry);
      deviceState.selectedDevice = device;
    } else {
      const idx = deviceState.roomList.findIndex((r) => r.device === originalDevice);
      if (idx !== -1) deviceState.roomList[idx] = updatedEntry;
    }

    _setStatus(saveBtn, '⏳ Saving…', true);

    let success, message;

    if (isNew) {
      // Device baru — bulk save karena belum ada :device di server
      ({ success, message } = await saveRoomList(deviceState.roomList));
    } else if (device !== originalDevice) {
      // Device ID diganti — hapus yang lama, simpan list baru sekaligus
      ({ success, message } = await saveRoomList(deviceState.roomList));
    } else {
      // Edit biasa tanpa ganti ID
      ({ success, message } = await updateDevice(originalDevice, updatedEntry));
    }

    _setStatus(saveBtn, saveLabel, false);

    if (success) {
      const label = device !== originalDevice
        ? `Device ID diubah: ${originalDevice} → ${device}`
        : 'Saved!';
      _toast(label);
      deviceState.selectedDevice = device;
      renderDeviceSidebar();
      _renderDeviceEditor(updatedEntry, false);
    } else {
      // Rollback in-memory jika server gagal
      const idx = deviceState.roomList.findIndex((r) => r.device === device);
      if (idx !== -1) deviceState.roomList[idx] = entry;
      _toast(message ?? 'Server error', true);
    }
  });
  btnRow.appendChild(saveBtn);

  // Delete (only for existing entries)
  if (!isNew) {
    const delBtn = _btn('🗑 Delete Device', 'btn-sm btn-danger', async () => {
      if (!confirm(`Delete device "${entry.device}"?\nThis cannot be undone.`)) return;

      deviceState.roomList = deviceState.roomList.filter((r) => r.device !== entry.device);
      deviceState.selectedDevice = null;

      _setStatus(delBtn, '⏳ Deleting…', true);
      const { success, message } = await deleteDevice(entry.device);
      _setStatus(delBtn, '🗑 Delete Device', false);

      if (!success) _toast(message ?? 'Delete failed — local list updated only', true);
      else _toast('Deleted.');

      renderDeviceSidebar();
      _renderDeviceEditorEmpty();
    });
    delBtn.style.cssText = 'width:100%; margin-top:2px;';
    btnRow.appendChild(delBtn);
  }

  scroll.appendChild(btnRow);

  // Raw JSON preview
  const jsonToggle = _btn('{ } Raw JSON', 'btn-sm', () => {});
  jsonToggle.style.cssText = 'width:100%; margin-top:8px;';
  const pre = document.createElement('pre');
  pre.style.cssText =
    'display:none; font-size:9px; font-family:monospace; background:#f5f0ee; ' +
    'border:0.5px solid #d4b8b4; border-radius:3px; padding:6px; max-height:120px; ' +
    'overflow:auto; margin-top:6px; color:#333; white-space:pre-wrap;';
  let jsonOpen = false;
  jsonToggle.onclick = () => {
    jsonOpen = !jsonOpen;
    pre.style.display   = jsonOpen ? 'block' : 'none';
    jsonToggle.textContent = jsonOpen ? '{ } Hide JSON' : '{ } Raw JSON';
    if (jsonOpen) pre.textContent = JSON.stringify(entry, null, 2);
  };
  scroll.appendChild(jsonToggle);
  scroll.appendChild(pre);
}

// ── Save All ──────────────────────────────────────────────────────────────────

async function _handleSaveAll() {
  const btn = document.querySelector('[data-device-save-all]');
  const { success, message } = await saveRoomList(deviceState.roomList);
  if (success) {
    _toast(`All ${deviceState.roomList.length} devices saved!`);
    // Invalidate & reload to confirm server state
    await _loadRoomList();
    renderDeviceSidebar();
  } else {
    _toast(message ?? 'Save All failed', true);
  }
}

// ── Data loading ──────────────────────────────────────────────────────────────

async function _loadRoomList() {
  deviceState.status = 'loading';
  try {
    deviceState.roomList = await fetchRoomList();
    deviceState.status   = 'idle';
    deviceState.lastError = null;
  } catch (e) {
    deviceState.status    = 'error';
    deviceState.lastError = e.message;
  }
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function _btn(text, cls, onClick) {
  const b = document.createElement('button');
  b.className   = cls;
  b.textContent = text;
  b.onclick     = onClick;
  b.style.width = b.style.width || '100%';
  return b;
}

function _banner(text, color) {
  const d = document.createElement('div');
  d.style.cssText =
    `font-size:10px; color:${color}; padding:4px 8px; margin-bottom:6px; ` +
    `background:${color}18; border-radius:3px; border-left:2px solid ${color};`;
  d.textContent = text;
  return d;
}

function _statusDot(deviceId) {
  // Cosmetic placeholder — replace with real online-status logic if available
  const dot = document.createElement('span');
  dot.style.cssText =
    'display:inline-block; width:6px; height:6px; border-radius:50%; flex-shrink:0; ' +
    'background:' + (deviceId ? '#2ecc71' : '#e74c3c') + ';';
  return dot;
}

function _setStatus(btn, label, disabled) {
  btn.textContent = label;
  btn.disabled    = disabled;
}

function _flashError(inp, msg) {
  inp.style.border = '1px solid #e74c3c';
  inp.focus();
  inp.title = msg;
  setTimeout(() => { inp.style.border = ''; inp.title = ''; }, 2000);
}

function _toast(msg, isError = false) {
  const existing = document.getElementById('device-toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.id = 'device-toast';
  t.textContent = msg;
  t.style.cssText =
    'position:fixed; bottom:24px; left:50%; transform:translateX(-50%); ' +
    `background:${isError ? '#c0392b' : '#1e9650'}; color:#fff; ` +
    'padding:8px 18px; border-radius:6px; font-size:12px; font-weight:600; ' +
    'z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.25); ' +
    'animation: fadeInUp 0.2s ease;';

  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}