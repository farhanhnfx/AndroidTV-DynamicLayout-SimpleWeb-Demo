/**
 * history.js — Undo / Redo stack
 * Depends on: state, layout-utils (for render triggers passed as callbacks)
 */

import { state, getLayout } from './state.js';
import { deepClone } from '../utils/helpers.js';

const MAX_HISTORY = 30;

let stack = [];
let index = -1;

/** Save a snapshot of the current scene into the stack. */
export function saveHistory() {
  if (state.appMode !== 'layout' || !state.currentScene) return;
  const layout = getLayout();
  if (!layout) return;

  // Discard any redo-branch if we branch off mid-stack
  if (index < stack.length - 1) stack = stack.slice(0, index + 1);

  stack.push(deepClone(layout));
  if (stack.length > MAX_HISTORY) stack.shift();
  else index++;
}

/** Reset the stack entirely (e.g. when switching scenes). */
export function resetHistory() {
  stack = [];
  index = -1;
}

/** Returns true if an undo step is available. */
export function canUndo() {
  return index > 0;
}

/** Returns true if a redo step is available. */
export function canRedo() {
  return index < stack.length - 1;
}

/**
 * Undo one step.
 * @param {Function} onRestore - called after state is restored so callers can re-render
 */
export function undo(onRestore) {
  if (state.appMode !== 'layout' || !canUndo()) return;
  index--;
  state.sceneData[state.currentScene] = deepClone(stack[index]);
  onRestore?.();
}

/**
 * Redo one step.
 * @param {Function} onRestore - called after state is restored so callers can re-render
 */
export function redo(onRestore) {
  if (state.appMode !== 'layout' || !canRedo()) return;
  index++;
  state.sceneData[state.currentScene] = deepClone(stack[index]);
  onRestore?.();
}
