/**
 * keyboard.js — Global keyboard shortcut handler.
 * Registers listeners once; delegates to history and editor modules.
 */

import { state, getLayout } from '../core/state.js';
import { undo, redo }        from '../core/history.js';
import { render }             from './canvas.js';
import { renderEditor }       from './editor.js';
import { renderSidebar }      from './sidebar.js';
import { findById, removeById } from '../utils/helpers.js';
import { saveHistory }         from '../core/history.js';

export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (state.appMode !== 'layout') return;
    // Don't hijack input fields
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
      undo(_afterHistoryRestore);
      e.preventDefault();
      return;
    }

    if ((ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) ||
        (ctrl && (e.key === 'y' || e.key === 'Y'))) {
      redo(_afterHistoryRestore);
      e.preventDefault();
      return;
    }

    if (e.key === 'Delete' && state.selectedId) {
      const layout = getLayout();
      if (layout) {
        removeById(layout.objects, state.selectedId);
        state.selectedId = null;
        saveHistory();
        render();
        renderEditor(null);
        renderSidebar();
      }
    }
  });
}

function _afterHistoryRestore() {
  render();
  const obj = findById(getLayout()?.objects ?? [], state.selectedId);
  renderEditor(obj ?? null);
  if (state.layoutSubTab === 'layers') renderSidebar();
}
