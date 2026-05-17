/**
 * importer.js — Handles global JSON file import (single + bundle formats).
 */

import { state }            from '../core/state.js';
import { saveHistory, resetHistory } from '../core/history.js';
import { render }            from './canvas.js';
import { renderSidebar, buildSceneTabs, extractScenes } from './sidebar.js';

/**
 * Called from the file <input> onChange handler.
 * Accepts one or more .json files and merges them into sceneData.
 * @param {Event} event
 */
export function importJsonFile(event) {
  const files = event.target.files;
  if (!files?.length) return;

  let loaded = 0;
  const total = files.length;

  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        loaded += _ingestParsed(parsed, file.name);
      } catch (err) {
        alert(`Failed to load ${file.name}: ${err.message}`);
      }

      if (loaded >= total || /* at least one file done */ true) {
        _finaliseImport(loaded);
      }
    };
    reader.readAsText(file);
  });

  event.target.value = ''; // Reset so same file can be re-imported
}

// ── Internals ─────────────────────────────────────────────────────────────────

/**
 * Merge parsed JSON into state.sceneData.
 * Returns number of layouts ingested.
 */
function _ingestParsed(parsed, filename) {
  let count = 0;

  // New bundle: { results: { layout: [...], file_mapping: {} } }
  if (parsed?.results && Array.isArray(parsed.results.layout)) {
    parsed.results.layout.forEach((item) => {
      if (item.dm_id) { state.sceneData[item.dm_id] = item; count++; }
    });
    if (parsed.results.file_mapping) {
      Object.assign(state.fileMapping, parsed.results.file_mapping);
    }
    return count;
  }

  // Bare array of layout objects
  if (Array.isArray(parsed)) {
    parsed.forEach((item) => {
      if (item.dm_id) { state.sceneData[item.dm_id] = item; count++; }
    });
    return count;
  }

  // Legacy bundle: plain dictionary { dm_id: layoutObj, ... }
  if (!parsed.objects && !parsed.dm_id) {
    Object.assign(state.sceneData, parsed);
    return Object.keys(parsed).length;
  }

  // Single layout object
  if (!parsed.base_layout) throw new Error('Missing base_layout');
  const key = parsed.dm_id ?? filename.replace('.json', '');
  state.sceneData[key] = parsed;
  state.fileMapping[key] = filename;
  return 1;
}

function _finaliseImport(count) {
  extractScenes();
  state.currentScene = state.scenes[0]?.id ?? null;
  state.selectedId   = null;
  resetHistory();
  saveHistory();
  buildSceneTabs();
  renderSidebar();
  render();
  alert(`${count} layout(s) loaded. All fields preserved.`);
}
