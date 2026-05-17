/**
 * drag.js — Mouse drag-to-move logic for canvas components.
 */

import { state, getLayout } from '../core/state.js';
import { saveHistory } from '../core/history.js';
import { render }      from './canvas.js';
import { renderEditor }from './editor.js';
import { renderSidebar }from './sidebar.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────

export function initDrag() {
  document.addEventListener('mousemove', _onMouseMove);
  document.addEventListener('mouseup',   _onMouseUp);

  // Click on empty canvas background → deselect
  document.getElementById('canvasFrame').addEventListener('mousedown', (e) => {
    if (state.appMode !== 'layout') return;
    if (e.target !== document.getElementById('canvasFrame')) return;
    _clearSelection();
  });
}

// ── Event handlers ────────────────────────────────────────────────────────────

function _onMouseMove(e) {
  const d = state.drag;
  if (!d.isMouseDown || !d.obj) return;

  const dx = e.clientX - d.startX;
  const dy = e.clientY - d.startY;

  if (!d.isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    d.isDragging = true;

    // Default: Delegasikan seleksi ke Parent
    // KECUALI: Child tersebut sudah di-select sebelumnya ATAU user menahan tombol ALT/SHIFT
    if (!d.wasSelected && !d.forceChild) {
      const parent = _getParentOf(d.obj.id);
      if (parent) {
        d.obj = parent;
      }
    }

    state.selectedId = d.obj.id;
    _highlightLayer(d.obj.id);
    renderEditor(d.obj);
  }

  if (d.isDragging) {
    const deltaX = (e.clientX - d.lastMouseX) / state.zoom;
    const deltaY = (e.clientY - d.lastMouseY) / state.zoom;
    _moveNodeAndChildren(d.obj, deltaX, deltaY);
    d.lastMouseX = e.clientX;
    d.lastMouseY = e.clientY;

    // Sync x/y inputs in the editor panel
    const inputX = document.querySelector('input[data-dotpath="transform.x"]');
    const inputY = document.querySelector('input[data-dotpath="transform.y"]');
    if (inputX && d.obj.transform) inputX.value = Math.round(d.obj.transform.x);
    if (inputY && d.obj.transform) inputY.value = Math.round(d.obj.transform.y);
  }
}

function _onMouseUp(e) {
  const d = state.drag;
  if (!d.isMouseDown || !d.obj) return;

  if (d.isDragging) {
    saveHistory();
  } else {
    // Klik biasa (bukan drag)
    // Berlaku aturan yang sama: lempar ke Parent kecuali dipaksa/sudah ter-select
    if (!d.wasSelected && !d.forceChild) {
      const parent = _getParentOf(d.obj.id);
      if (parent) d.obj = parent;
    }

    state.selectedId   = d.obj.id;
    state.selectedMenuId = null;
    _highlightLayer(d.obj.id);
    renderEditor(d.obj);
    if (state.layoutSubTab === 'layers') renderSidebar();
  }

  // Reset semua state drag
  d.isMouseDown = false;
  d.isDragging  = false;
  d.obj         = null;
  d.wasSelected = false;
  d.forceChild  = false;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function _moveNodeAndChildren(node, dX, dY) {
  if (node.transform) {
    node.transform.x = (node.transform.x ?? 0) + dX;
    node.transform.y = (node.transform.y ?? 0) + dY;

    // Update DOM element directly for smooth dragging
    const el = document.getElementById(`layer_${node.id}`);
    if (el) {
      el.style.left = `${node.transform.x * state.zoom}px`;
      el.style.top  = `${node.transform.y * state.zoom}px`;
    }
  }
  // Rekursif hanya jika memiliki child (child tidak punya .objects, jadi aman)
  node.objects?.forEach((child) => _moveNodeAndChildren(child, dX, dY));
}

function _highlightLayer(id) {
  document.querySelectorAll('.component-layer.selected').forEach((x) => x.classList.remove('selected'));
  document.getElementById(`layer_${id}`)?.classList.add('selected');
}

function _clearSelection() {
  state.selectedId = null;
  document.querySelectorAll('.component-layer.selected').forEach((x) => x.classList.remove('selected'));
  renderEditor(null);
  if (state.layoutSubTab === 'layers') renderSidebar();
}

/** 
 * Rekursif mencari komponen Parent yang membungkus sebuah childId.
 */
function _getParentOf(childId, searchNodes = getLayout()?.objects) {
  if (!searchNodes) return null;
  for (const p of searchNodes) {
    if (p.objects) {
      if (p.objects.some((c) => c.id === childId)) return p;
      const foundDeeper = _getParentOf(childId, p.objects);
      if (foundDeeper) return foundDeeper;
    }
  }
  return null;
}