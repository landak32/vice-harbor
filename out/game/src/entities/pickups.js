// Weapons, armour, health and money lying around the city. A pickup bobs on its spot, is drawn
// as a small crate or a glowing marker, and vanishes into the player when they walk over it.

import { WEAPONS } from '../config.js';
import { dist } from '../geometry.js';

export function createPickup(kind, x, y, rng, amount = 0) {
  return {
    kind,
    x,
    y,
    amount,
    bob: rng ? rng.range(0, 6.28) : 0,
    taken: false,
    radius: 20,
  };
}

/** The permanent pickups: two guns, armour and a first-aid kit, near named places. */
export function placeWorldPickups(world) {
  const l = world.layout.landmarks;
  world.pickups.push(createPickup('pistol', l.depot.x + 22, l.depot.y + 30, world.rng, 24));
  world.pickups.push(createPickup('smg', l.pier.x + 20, l.pier.y - 18, world.rng, 60));
  world.pickups.push(createPickup('armour', l.police.x - 30, l.police.y + 44, world.rng, 60));
  world.pickups.push(createPickup('health', l.hospital.x + 24, l.hospital.y - 20, world.rng, 50));
  world.pickups.push(createPickup('cash', l.marina.x + 40, l.marina.y - 30, world.rng, 180));
  world.pickups.push(createPickup('cash', l.beach.x - 40, l.beach.y + 60, world.rng, 140));
}

export function updatePickups(world, dt) {
  const player = world.player;
  if (player.mode !== 'foot' || !player.alive) return;
  for (const pickup of world.pickups) {
    if (pickup.taken) continue;
    pickup.bob += dt * 2.4;
    if (dist(player.x, player.y, pickup.x, pickup.y) > pickup.radius) continue;
    applyPickup(world, pickup);
  }
}

function applyPickup(world, pickup) {
  const player = world.player;
  switch (pickup.kind) {
    case 'health':
      if (player.health >= 100) return;
      player.health = Math.min(100, player.health + (pickup.amount || 50));
      world.toast('First aid kit');
      break;
    case 'armour':
      if (player.armour >= 100) return;
      player.armour = Math.min(100, player.armour + (pickup.amount || 50));
      world.toast('Body armour');
      break;
    case 'cash':
      player.money += pickup.amount;
      world.toast(`$${pickup.amount} picked up`);
      break;
    default: {
      const weapon = WEAPONS[pickup.kind];
      if (!weapon) return;
      player.unlocked.add(weapon.id);
      player.ammo[weapon.id] = (player.ammo[weapon.id] ?? 0) + (pickup.amount || 24);
      player.weapon = weapon.id;
      world.toast(`${weapon.name} — ${pickup.amount} rounds`);
      break;
    }
  }
  pickup.taken = true;
  world.audio?.pickup();
  world.effects.ring(pickup.x, pickup.y, '#9ff0d0', 26);
}