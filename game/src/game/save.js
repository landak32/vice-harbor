// Saving and continuing. Only the things a player would be upset to lose are written: money,
// weapons, which jobs are done and the running statistics. It lives in localStorage, so the
// whole game stays a static folder.

import { SAVE_KEY } from '../config.js';

export function saveGame(world) {
  try {
    const player = world.player;
    const payload = {
      version: 1,
      savedAt: Date.now(),
      money: player.money,
      weapon: player.weapon,
      ammo: { pistol: player.ammo.pistol ?? 0, smg: player.ammo.smg ?? 0 },
      unlocked: [...player.unlocked],
      completed: [...world.completedMissions],
      stats: world.stats,
      seed: world.seed,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    return data;
  } catch (error) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (error) {
    /* storage can be blocked; a missing save is not fatal */
  }
}

/** Push a loaded save back into a freshly built world. */
export function applySave(world, data) {
  if (!data) return;
  const player = world.player;
  player.money = data.money ?? player.money;
  player.weapon = data.weapon ?? player.weapon;
  player.ammo = { pistol: data.ammo?.pistol ?? 0, smg: data.ammo?.smg ?? 0 };
  for (const id of data.unlocked ?? ['fists']) player.unlocked.add(id);
  for (const id of data.completed ?? []) world.completedMissions.add(id);
  if (data.stats) world.stats = { ...world.stats, ...data.stats };
}