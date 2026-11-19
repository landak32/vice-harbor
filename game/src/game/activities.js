// The two repeatable jobs that keep the lights on between story missions: driving the cab for
// Nadine and running parcels for Lulu's courier desk. Both are small state machines with a
// marker, a clock and a payout, and both can be started again as soon as they finish.

import { dist } from '../geometry.js';
import { ACTIVITIES } from './story.js';
import { say } from './dialogue.js';

export function createActivityState() {
  return {
    kind: null,
    phase: 'idle',
    marker: null,
    timer: 0,
    objective: '',
    fares: 0,
    parcels: 0,
    totalParcels: 0,
    payout: 0,
    stopClock: 0,
    cooldown: 0,
  };
}

function landmarkList(world) {
  return Object.entries(world.layout.landmarks).map(([key, point]) => ({ key, ...point }));
}

/** A landmark far enough away to be worth driving to. */
function pickDestination(world, fromX, fromY, minDistance = 420, maxDistance = 2200) {
  const options = landmarkList(world).filter((point) => {
    const d = dist(fromX, fromY, point.x, point.y);
    return d > minDistance && d < maxDistance;
  });
  if (options.length === 0) return landmarkList(world)[0];
  return world.rng.pick(options);
}

export function startTaxiJob(world) {
  const activity = world.activity;
  const point = pickDestination(world, world.player.x, world.player.y, 260, 1400);
  activity.kind = 'taxi';
  activity.phase = 'pickup';
  activity.marker = { x: point.x, y: point.y, label: 'Fare', kind: 'activity' };
  activity.timer = 80;
  activity.objective = 'Cab fare — pick up the passenger';
  activity.stopClock = 0;
  world.toast('Fare dispatched — follow the yellow marker', 3.2);
  say(world, ACTIVITIES.taxi.intro);
  world.audio?.objective();
}

export function startCourierJob(world) {
  const activity = world.activity;
  const point = pickDestination(world, world.player.x, world.player.y, 220, 1500);
  activity.kind = 'courier';
  activity.phase = 'delivery';
  activity.totalParcels = 3;
  activity.parcels = 0;
  activity.marker = { x: point.x, y: point.y, label: 'Parcel', kind: 'activity' };
  activity.timer = 75;
  activity.objective = 'Courier — deliver parcel 1 of 3';
  activity.stopClock = 0;
  world.toast('Three parcels, three doors', 3);
  say(world, ACTIVITIES.courier.intro);
  world.audio?.objective();
}

/** Pressing F: cab if you are sitting in one, courier if you are at the depot. */
export function tryStartActivity(world) {
  const activity = world.activity;
  if (world.mission.state === 'running') return false;
  if (activity.kind) {
    world.toast('Finish the job you are on first');
    return false;
  }
  if (activity.cooldown > 0) return false;
  const player = world.player;
  if (player.mode === 'car' && player.car && player.car.type === 'taxi') {
    startTaxiJob(world);
    return true;
  }
  const depot = world.layout.landmarks.depot;
  if (dist(player.x, player.y, depot.x, depot.y) < 110) {
    startCourierJob(world);
    return true;
  }
  return false;
}

function finishActivity(world, reason) {
  const activity = world.activity;
  activity.kind = null;
  activity.phase = 'idle';
  activity.marker = null;
  activity.objective = '';
  activity.cooldown = 3;
  if (reason) world.toast(reason, 3);
}

function payOut(world, amount, label) {
  world.player.money += amount;
  world.stats.sideJobs += 1;
  world.audio?.payday();
  world.toast(`${label} +$${amount}`, 3);
  world.effects.ring(world.player.x, world.player.y, '#ffe08a', 30);
}

export function updateActivity(world, dt) {
  const activity = world.activity;
  activity.cooldown = Math.max(0, activity.cooldown - dt);
  if (!activity.kind) return;
  const player = world.player;
  if (world.dialogue.open) return;

  activity.timer -= dt;
  if (activity.timer <= 0) {
    if (activity.kind === 'taxi') {
      finishActivity(world, 'The fare gave up and walked');
    } else {
      finishActivity(world, 'The parcels are late — job lost');
    }
    return;
  }

  const marker = activity.marker;
  if (!marker) return;
  const inCar = player.mode === 'car' && player.car;
  const position = inCar ? player.car : player;
  const speed = inCar ? Math.hypot(player.car.vx, player.car.vy) : Math.hypot(player.vx, player.vy);
  const arrived = dist(position.x, position.y, marker.x, marker.y) < 44;
  const stopped = arrived && speed < 55;

  if (activity.kind === 'taxi') {
    if (player.mode !== 'car') {
      finishActivity(world, 'You left the cab — fare cancelled');
      return;
    }
    activity.stopClock = stopped ? activity.stopClock + dt : Math.max(0, activity.stopClock - dt * 2);
    if (activity.stopClock > 0.7) {
      activity.stopClock = 0;
      if (activity.phase === 'pickup') {
        activity.phase = 'dropoff';
        const point = pickDestination(world, player.x, player.y, 420, 2000);
        activity.marker = { x: point.x, y: point.y, label: 'Drop off', kind: 'activity' };
        activity.timer = 100;
        activity.objective = 'Cab fare — take the passenger to the drop-off';
        world.toast('Passenger aboard', 2.4);
        world.audio?.checkpoint();
      } else {
        const pay = world.rng.int(ACTIVITIES.taxi.payPerFare[0], ACTIVITIES.taxi.payPerFare[1]);
        activity.fares += 1;
        payOut(world, pay, 'Fare paid');
        startTaxiJob(world);
        activity.cooldown = 0;
      }
    }
  } else if (activity.kind === 'courier') {
    if (arrived) {
      const pay = world.rng.int(ACTIVITIES.courier.payPerDelivery[0], ACTIVITIES.courier.payPerDelivery[1]);
      activity.parcels += 1;
      payOut(world, pay, `Parcel ${activity.parcels} delivered`);
      if (activity.parcels >= activity.totalParcels) {
        const bonus = 120;
        payOut(world, bonus, 'Courier bonus');
        world.completedActivities = (world.completedActivities ?? 0) + 1;
        finishActivity(world, 'Courier run complete');
      } else {
        const point = pickDestination(world, player.x, player.y, 240, 1500);
        activity.marker = { x: point.x, y: point.y, label: 'Parcel', kind: 'activity' };
        activity.timer = 75;
        activity.objective = `Courier — deliver parcel ${activity.parcels + 1} of ${activity.totalParcels}`;
        world.audio?.checkpoint();
      }
    }
  }
}

/** The marker the minimap draws for whichever job is running. */
export function activityMarker(world) {
  return world.activity.kind ? world.activity.marker : null;
}