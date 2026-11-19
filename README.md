# Vice Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/landak32/vice-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/landak32/vice-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vice Harbor is an open-world crime game seen from directly overhead, and it exists entirely inside one browser tab. The streets, blocks, rooftops, cars, crowds and muzzle flashes are all painted onto a single 1280×720 canvas with the 2D drawing API, while the engine drone, the sirens and the gunfire are built on the fly with WebAudio oscillators and filtered noise.

The city is not a hand-drawn map. It is generated from a seed: the road grid, the shoreline, the harbour basin, the park pond and the placement of buildings all fall out of deterministic functions, so a given seed always rebuilds the same Vice Harbor. There are no textures, no sprite sheets, no audio files and nothing to compile — just plain ES modules loaded straight off disk, which means the whole project is a folder you can serve and play.

Underneath the scenery sits a small simulation running at a fixed 60 updates a second. Cars follow lane waypoints and respect the lights, pedestrians walk the pavement rings and scatter when shots ring out, and every crime feeds a heat meter that decides how hard the patrol comes after you. Story jobs and repeatable side work give the money a purpose, and the important parts of your progress are kept in localStorage so a reload does not wipe the run.

## What's in it

- **Five districts on one island.** Kessler Mile's downtown towers in the north-east, the Anchor Docks and its piers on the south-west water, Coral Strand's beach along the east shore, Palmetto Park in the middle, and the Sunset Terraces houses filling the rest.
- **Two ways to get around.** Walk, jog or sprint on foot, or step into any car you find and drive it; each vehicle's mass, grip and steering carry straight into how it handles.
- **Six vehicle classes.** The Riptide GT sports car, the Meridian sedan, the Boxer Van, the Sunline Cab taxi, the Harbor Patrol cruiser and the Ironhorse Hauler truck — from a drifty coupe to a slow, planted three-tonne rig.
- **Traffic with manners.** Civilian cars follow the lane graph, brake for red lights and for the car ahead, and panic — swerving and running the lights — when a shot goes off nearby.
- **Crowds that react.** Pedestrians stroll the pavements, cross at the painted corners, flee from trouble and can be knocked flat by a bumper.
- **A 1–5 star wanted system.** Crimes add heat, heat turns into stars, the patrol sends more cruisers and officers as it climbs, and the stars only fade once you have stayed out of sight.
- **Six story missions plus side jobs.** A campaign that runs from a first errand to a dockside score, with taxi fares for Nadine and courier parcels for Lulu available whenever you need cash between chapters.
- **Save and continue.** Money, weapons, ammo, unlocked jobs, finished missions and statistics go to localStorage, so closing the tab is not the same as starting over.
- **A full HUD.** A rotating minimap, health and armour bars, your cash, the current weapon, the wanted stars and the live objective, all drawn over the world.

## Run it

```sh
node serve.ts
```

The game is then at http://localhost:8080. It uses only the Node standard library, so there is nothing to install.

## Controls

- **WASD or arrow keys** — move on foot, or steer once you are behind the wheel
- **E** — enter or leave a vehicle
- **Space** — sprint
- **Left click or J** — fire
- **Esc** — pause

---

Entered on [make.fun](https://make.fun/?ref=ab07whaf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01).
