/**
 * helpers.js — Pure utility functions, no side-effects, no imports.
 */

/** Deep-clone any JSON-serialisable value. */
export function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

/**
 * Walk a nested { objects: [...] } tree and return a flat array of all nodes.
 * @param {Array} objs
 * @returns {Array}
 */
export function flatObjects(objs) {
  let result = [];
  for (const o of objs ?? []) {
    result.push(o);
    if (o.objects) result = result.concat(flatObjects(o.objects));
  }
  return result;
}

/**
 * Find a node by id anywhere in the tree.
 * @param {Array} objs
 * @param {string} id
 * @returns {object|undefined}
 */
export function findById(objs, id) {
  return flatObjects(objs).find((o) => o.id === id);
}

/**
 * Return a shallow-sorted copy of objs by transform.layer_index (ascending).
 * @param {Array} objs
 * @returns {Array}
 */
export function sortByLayer(objs) {
  return [...(objs ?? [])].sort(
    (a, b) => (a.transform?.layer_index ?? 0) - (b.transform?.layer_index ?? 0)
  );
}

/**
 * Remove a node by id anywhere in a nested objects tree (mutates in place).
 * @param {Array} objects
 * @param {string} id
 * @returns {boolean} true if found and removed
 */
export function removeById(objects, id) {
  if (!objects) return false;
  for (let i = 0; i < objects.length; i++) {
    if (objects[i].id === id) {
      objects.splice(i, 1);
      return true;
    }
    if (objects[i].objects && removeById(objects[i].objects, id)) return true;
  }
  return false;
}

/**
 * Set a deeply-nested value on an object using a dot-path string.
 * Creates intermediate objects if they don't exist.
 * @param {object} target
 * @param {string} dotPath  e.g. 'transform.raw.width'
 * @param {*}      value
 */
export function setByPath(target, dotPath, value) {
  const parts = dotPath.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (node[parts[i]] === undefined || node[parts[i]] === null) {
      node[parts[i]] = {};
    }
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

/**
 * Get a deeply-nested value using a dot-path string.
 * @param {object} target
 * @param {string} dotPath
 * @returns {*}
 */
export function getByPath(target, dotPath) {
  return dotPath.split('.').reduce((node, key) => node?.[key], target);
}

/**
 * Coerce a raw string value from an input into the most appropriate JS type.
 * @param {string} rawVal
 * @param {'text'|'number'|'boolean'|'textarea'|'multiline'|'color'|string} inputType
 * @returns {*}
 */
export function coerceInputValue(rawVal, inputType) {
  if (rawVal === 'true') return true;
  if (rawVal === 'false') return false;
  if (rawVal === 'null') return null;
  if (inputType === 'textarea') {
    try { return JSON.parse(rawVal); } catch (_) { return rawVal; }
  }
  if (inputType === 'number') {
    const num = parseFloat(rawVal);
    return !isNaN(num) && rawVal.trim() !== '' ? num : rawVal;
  }
  // 'text', 'multiline', 'color' — keep as string
  return rawVal;
}

/**
 * Slugify a display name into a safe filename (lowercase, underscores, .json).
 * @param {string} name
 * @returns {string}
 */
export function toJsonFilename(name) {
  let slug = name.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
  if (!slug.endsWith('.json')) slug += '.json';
  return slug;
}

/**
 * Count all objects across every scene in sceneData.
 * @param {object} sceneData
 * @returns {number}
 */
export function countAllObjects(sceneData) {
  let total = 0;
  Object.values(sceneData).forEach((layout) => {
    if (layout.objects) total += flatObjects(layout.objects).length;
  });
  return total;
}

/**
 * Detect the best input type for a given key + value pair.
 * @param {string} key
 * @param {*}      value
 * @returns {'color'|'boolean'|'textarea'|'number'|'text'}
 */
export function detectType(key, value) {
  if (value === null || value === undefined) return 'text';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'object') return 'textarea';
  const k = key.toLowerCase();
  if (k.includes('color') || k === 'background_color' || k === 'font_color' || k === 'hover_color') return 'color';
  if (typeof value === 'number') return 'number';
  return 'text';
}
