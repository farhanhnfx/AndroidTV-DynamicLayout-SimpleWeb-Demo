/**
 * state.device.js — State slice for the Device Manager module.
 *
 * Keeps device state completely isolated from the layout/menu/data state
 * so neither interferes with the other.
 *
 * Import and mutate `deviceState` directly — same pattern as the main state.js.
 */

export const deviceState = {
  /** @type {import('../core/api.device.js').RoomEntry[]} */
  roomList: [],

  /** device id of the currently selected row, or null */
  selectedDevice: null,

  /** 'idle' | 'loading' | 'saving' | 'error' */
  status: 'idle',

  /** Last error message, or null */
  lastError: null,

  /** Current text in the search/filter box */
  filterQuery: '',
};

/**
 * Convenience: return rows matching the current filterQuery
 * (case-insensitive match on device, room_number, or guest_name).
 * @returns {import('../core/api.device.js').RoomEntry[]}
 */
export function filteredRoomList() {
  const q = deviceState.filterQuery.trim().toLowerCase();
  if (!q) return deviceState.roomList;
  return deviceState.roomList.filter(
    (r) =>
      r.device.toLowerCase().includes(q) ||
      r.room_number.toLowerCase().includes(q) ||
      r.guest_name.toLowerCase().includes(q)
  );
}
