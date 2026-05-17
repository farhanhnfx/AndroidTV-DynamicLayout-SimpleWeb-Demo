/**
 * api.device.js — Server communication for the Device Manager module.
 *
 * Expected API contract:
 *   GET  /api/room-list          → { status, results: { room_list: RoomEntry[] } }
 *   POST /api/room-list          → { status, message? }  (save full list)
 *   POST /api/room-list/:device  → { status, message? }  (update single entry)
 *   DELETE /api/room-list/:device → { status, message? }
 *
 * All functions return plain data — they never mutate state directly.
 */

// ── Types (JSDoc) ─────────────────────────────────────────────────────────────
/**
 * @typedef {Object} RoomEntry
 * @property {string} device       — device identifier / hostname
 * @property {string} room_number  — human-readable room label
 * @property {string} guest_name   — current guest's name
 */

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

async function _post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} → ${res.status}`);
  return res.json();
}

async function _delete(url) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${url} → ${res.status}`);
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch the full room list from the server.
 * @returns {Promise<RoomEntry[]>}
 */
export async function fetchRoomList() {
  try {
    const data = await _get('/api/room-list');
    return data?.results?.room_list ?? [];
  } catch (e) {
    console.warn('fetchRoomList failed:', e.message);
    return [];
  }
}

/**
 * Save (overwrite) the full room list on the server.
 * @param {RoomEntry[]} roomList
 * @returns {Promise<{ success: boolean, message: string|null }>}
 */
export async function saveRoomList(roomList) {
  try {
    const data = await _post('/api/room-list', {
      status: true,
      results: { room_list: roomList },
    });
    return { success: !!data.status, message: data.message ?? null };
  } catch (e) {
    console.error('saveRoomList failed:', e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Update a single device entry by device id.
 * @param {string}     deviceId
 * @param {RoomEntry}  entry
 * @returns {Promise<{ success: boolean, message: string|null }>}
 */
export async function updateDevice(deviceId, entry) {
  try {
    const data = await _post(`/api/room-list/${encodeURIComponent(deviceId)}`, entry);
    return { success: !!data.status, message: data.message ?? null };
  } catch (e) {
    console.error('updateDevice failed:', e.message);
    return { success: false, message: e.message };
  }
}

/**
 * Delete a device entry by device id.
 * @param {string} deviceId
 * @returns {Promise<{ success: boolean, message: string|null }>}
 */
export async function deleteDevice(deviceId) {
  try {
    const data = await _delete(`/api/room-list/${encodeURIComponent(deviceId)}`);
    return { success: !!data.status, message: data.message ?? null };
  } catch (e) {
    console.error('deleteDevice failed:', e.message);
    return { success: false, message: e.message };
  }
}
