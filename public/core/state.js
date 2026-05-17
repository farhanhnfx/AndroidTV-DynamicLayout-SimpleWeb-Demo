/**
 * state.js — Central state store (single source of truth)
 * All modules import from here; none owns their own global state.
 */

export const state = {
  // ── App mode ─────────────────────────────────────────────────────
  appMode: 'layout',         // 'layout' | 'menu' | 'data' | 'master'
  layoutSubTab: 'layers',    // 'scene'  | 'layers'

  // ── Layout / Scene data ──────────────────────────────────────────
  sceneData: {},             // { [dm_id]: layoutObject }
  fileMapping: {},           // { [dm_id]: 'filename.json' }
  scenes: [],                // [{ id, name, dm_id }]
  currentScene: null,

  // ── Selection ────────────────────────────────────────────────────
  selectedId: null,
  selectedMenuId: null,
  selectedMasterId: null,
  selectedDataId: null,

  // ── Menu ─────────────────────────────────────────────────────────
  menuList: [],

  // ── Data / API ───────────────────────────────────────────────────
  contentTypesList: ['dining_items', 'info_items'],
  currentContentType: '',
  gridDataItems: [],
  gridDataCache: {},         // { [contentType]: [] | 'loading' }

  // ── Canvas ────────────────────────────────────────────────────────
  zoom: 0.34,

  // ── Drag ─────────────────────────────────────────────────────────
  drag: {
    isMouseDown: false,
    isDragging: false,
    obj: null,
    startX: 0,
    startY: 0,
    lastMouseX: 0,
    lastMouseY: 0,
  },
};

/** Convenience: get the current layout object */
export function getLayout() {
  return state.sceneData[state.currentScene];
}
