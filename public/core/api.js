/**
 * api.js — All fetch/server communication in one place.
 * Returns data; does NOT mutate global state (callers do that).
 */

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
  return res.json();
}

// ── Content Types ────────────────────────────────────────────────────────────

/**
 * Fetch available content type names from the server.
 * @returns {Promise<string[]>}
 */
export async function fetchContentTypes() {
  try {
    const data = await getJSON('/api/content-types');
    if (Array.isArray(data?.types) && data.types.length > 0) return data.types;
  } catch (e) {
    console.warn('fetchContentTypes failed:', e.message);
  }
  return null; // caller falls back to default list
}

// ── Grid Data (API Items) ────────────────────────────────────────────────────

/**
 * Fetch items for a given content type.
 * @param {string} contentType
 * @returns {Promise<Array>}
 */
export async function fetchItems(contentType) {
  try {
    const data = await getJSON(`/api/items/${contentType}`);
    return data?.results?.items ?? [];
  } catch (e) {
    console.error('fetchItems failed:', e.message);
    return [];
  }
}

/**
 * Save items for a given content type.
 * @param {string} contentType
 * @param {Array} items
 * @returns {Promise<boolean>} success
 */
export async function saveItems(contentType, items) {
  try {
    await postJSON(`/api/items/${contentType}`, { items });
    return true;
  } catch (e) {
    console.error('saveItems failed:', e.message);
    return false;
  }
}

// ── Menu ─────────────────────────────────────────────────────────────────────

/**
 * Fetch the menu routing list from the server.
 * Handles both legacy and nested formats.
 * @returns {Promise<Array>}
 */
export async function fetchMenu() {
  try {
    const data = await getJSON('/api/menu');
    // New nested format: { results: { menus: [{ menu: [...] }] } }
    if (Array.isArray(data?.results?.menus) && data.results.menus.length > 0) {
      return data.results.menus[0].menu ?? [];
    }
    // Legacy: { results: { menu: [...] } }
    if (data?.results?.menu) return data.results.menu;
    // Bare array
    if (Array.isArray(data)) return data;
  } catch (e) {
    console.warn('fetchMenu failed:', e.message);
  }
  return [];
}

// ── Layouts ──────────────────────────────────────────────────────────────────

/**
 * Fetch master layouts from the server.
 * @returns {Promise<{ sceneData: object, fileMapping: object }>}
 */
export async function fetchLayouts() {
  const result = { sceneData: {}, fileMapping: {} };
  try {
    const data = await getJSON('/api/master-layouts');

    // New format: { results: { layout: [...], file_mapping: {} } }
    if (data?.results && Array.isArray(data.results.layout)) {
      data.results.layout.forEach((item) => {
        if (item.dm_id) result.sceneData[item.dm_id] = item;
      });
      if (data.results.file_mapping) {
        result.fileMapping = data.results.file_mapping;
      }
    }
    // Legacy: plain dictionary { dm_id: layoutObj, ... }
    else if (typeof data === 'object' && !data.status) {
      result.sceneData = data;
    }
  } catch (e) {
    console.warn('fetchLayouts failed:', e.message);
  }
  return result;
}

// ── Sync / Save Config ────────────────────────────────────────────────────────

/**
 * Build and POST the full config payload to the server.
 * Falls back to downloading a JSON file if the server is unreachable.
 *
 * @param {object} sceneData
 * @param {object} fileMapping
 * @param {Array}  menuList
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function syncConfig(sceneData, fileMapping, menuList) {
  const formattedMenus = {
    status: true,
    results: {
      menus: [{ menu_category: 'All', order: 1, menu: menuList }],
      clear_cache: false,
    },
  };

  const payload = {
    menus: formattedMenus,
    layouts: Object.values(sceneData),
    file_mapping: fileMapping,
  };

  try {
    const result = await postJSON('/api/save-config', payload);
    if (result.status) return { success: true, message: null };
    return { success: false, message: result.message ?? 'Unknown error' };
  } catch (_) {
    // Server unavailable — download as file
    _downloadJSON(payload, 'sdui_config_backup.json');
    return {
      success: false,
      message: 'Server tidak tersedia. Config didownload sebagai sdui_config_backup.json',
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _downloadJSON(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
