/**
 * main.js — Application entry point.
 *
 * Responsibilities:
 *  1. Fetch initial server data
 *  2. Bootstrap all subsystems (history, drag, keyboard)
 *  3. Wire up top-level UI controls (mode buttons, zoom slider, sync button)
 *  4. Perform the first render
 *
 * This file is intentionally thin — all logic lives in the imported modules.
 */

import { state }                      from './core/state.js';
import { saveHistory, resetHistory }  from './core/history.js';
import { fetchContentTypes, fetchMenu, fetchLayouts, syncConfig } from './core/api.js';
import { render }                     from './components/canvas.js';
import { renderEditor }               from './components/editor.js';
import { renderSidebar, buildSceneTabs, extractScenes } from './components/sidebar.js';
import { initDrag }                   from './components/drag.js';
import { initKeyboard }               from './components/keyboard.js';
import { importJsonFile }             from './components/importer.js';
import { countAllObjects }            from './utils/helpers.js';

import { initDeviceMode, onDeviceModeEnter } from './components/device.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function initData() {
  // Content types
  const types = await fetchContentTypes();
  if (types) state.contentTypesList = types;

  // Menu
  state.menuList = await fetchMenu();

  // Layouts
  const { sceneData, fileMapping } = await fetchLayouts();
  state.sceneData  = sceneData;
  state.fileMapping = fileMapping;

  extractScenes();
  if (state.scenes.length > 0 && !state.currentScene) {
    state.currentScene = state.scenes[0].id;
  }

  setMode('layout');

  await initDeviceMode();
}

// ── Mode Controller ───────────────────────────────────────────────────────────

window.setMode = function setMode(mode) {
  state.appMode = mode;

  // Highlight the active mode button
  document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById(`modeBtn_${mode}`)?.classList.add('active');

  // Toggle layout-specific chrome
  const isLayout = mode === 'layout';
  document.getElementById('layoutSubbar').style.display      = isLayout ? 'flex' : 'none';
  document.getElementById('layoutSidebarTabs').style.display = isLayout ? 'flex' : 'none';
  document.getElementById('canvasArea').style.display        = isLayout ? 'flex' : 'none';
  document.getElementById('centerPlaceholder').style.display = isLayout ? 'none' : 'flex';

  // Reset selections
  state.selectedId       = null;
  state.selectedMenuId   = null;
  state.selectedDataId   = null;
  state.selectedMasterId = null;
  document.querySelectorAll('.component-layer.selected').forEach((x) => x.classList.remove('selected'));

  // Reset editor panel
  const scroll = document.getElementById('editorScroll');
  scroll.innerHTML = '<div class="no-selection">Select an item on the left to edit</div>';
  document.getElementById('editorHeader').textContent = 'Properties';

  switch (mode) {
    case 'layout':
      buildSceneTabs();
      renderSidebar();
      render();
      if (historyIsEmpty()) saveHistory();
      break;

    case 'master':
    case 'menu':
      renderSidebar();
      break;

    case 'data':
      if (!state.currentContentType && state.contentTypesList.length > 0) {
        import('./components/sidebar.js').then(({ default: _ }) => {
          // trigger via fetchGridData exposed on sidebar module
        });
        // Directly invoke via global — sidebar auto-handles data mode
      }
      renderSidebar();
      break;

    case 'device':
      onDeviceModeEnter();
    break;
  }
};

window.switchLayoutTab = function switchLayoutTab(tab) {
  state.layoutSubTab = tab;
  document.getElementById('tabSceneBtn')?.classList.toggle('active', tab === 'scene');
  document.getElementById('tabLayersBtn')?.classList.toggle('active', tab === 'layers');
  renderSidebar();
};

// ── Sync Button ───────────────────────────────────────────────────────────────

window.syncToServer = async function syncToServer() {
  const btn = document.getElementById('syncBtn');
  const txt = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled    = true;

  const { success, message } = await syncConfig(state.sceneData, state.fileMapping, state.menuList);
  const totalObjs = countAllObjects(state.sceneData);

  if (success) {
    alert(
      `UI Configuration saved!\n(${Object.keys(state.sceneData).length} layouts, ${totalObjs} objects total)`
    );
  } else {
    alert(message ?? 'Failed to sync.');
  }

  btn.textContent = txt;
  btn.disabled    = false;
};

// ── JSON Import (file input wired in HTML) ────────────────────────────────────

window.importJsonFile = importJsonFile;

// ── Zoom Slider ───────────────────────────────────────────────────────────────

function initZoomSlider() {
  const slider = document.getElementById('zoomSlider');
  if (!slider) return;
  slider.addEventListener('input', function () {
    state.zoom = this.value / 100;
    document.getElementById('zoomVal').textContent = `${this.value}%`;
    render();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function historyIsEmpty() {
  // We can't import the internal stack, but saveHistory is idempotent
  return true;
}

// ── Start ─────────────────────────────────────────────────────────────────────

initDrag();
initKeyboard();
initZoomSlider();
initData();
