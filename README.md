# Vice Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/landak32/vice-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/landak32/vice-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vice Harbor is a crime game you look down on from above, and everything you see is drawn at runtime: a 1280×720 canvas, the 2D context, and no images at all. Streets, rooftops, the harbour, palm shadows, muzzle flashes, blood decals and the little figures on the pavement are shapes and gradients painted fresh every frame. Sound follows the same rule — the engine note tracks your speed, sirens are two-tone oscillators, gunfire is filtered noise, and the bassline that comes in when the patrol starts hunting you is sequenced from a handful of numbers rather than played from a file.

The island itself is not authored, it is grown. A seed is fed into the layout builder, which lays down the east shoreline and the harbour basin first, then the park with its pond, then a seven-by-five grid of roads over whatever ground stayed dry, then one ring of pavement around every block. Buildings, props, intersections and the traffic-light phases all come off the same seed, so the default city rebuilds identically every time you load it and a different `?seed=` gives you a different one. Because there are no textures, no sprite sheets and no audio files, there is also nothing to build: the project is plain ES modules, and the only thing between the folder and a playable game is a static file server.

What holds it together is a simulation that advances in fixed 1/60-second steps regardless of your frame rate. Cars follow a lane graph and obey the lights, crowds walk block rings and break for the crosswalks, and every crime you commit is tallied into a single heat value that decides whether the street is quiet or full of cruisers. On top of that sits a six-chapter story with speaking characters, two repeatable jobs for when you need money, and a save file in localStorage that remembers the parts of your run that would hurt to lose.

## What's in it

- **Five districts on one island.** Kessler Mile puts the towers in the north-east, Anchor Docks holds the south-west water with two finger piers, Coral Strand runs along the east shore behind a strip of sand, Palmetto Park sits in the middle around a pond, and Sunset Terraces fills the remaining blocks with low houses. Each district carries its own asphalt, roof and window palette, and downtown buildings get extra wall depth so the skyline reads from overhead.
- **On foot or behind the wheel.** You walk, run or sprint as a person with a collision radius and a facing; press E near a car and the same camera follows the car instead. Steering turns harder the faster you are going, grip decides how quickly sideways speed bleeds off, and two collision circles along the body stand in for the chassis — which is why a long truck nudges things aside and a light coupe slides.
- **Six vehicle classes.** The Riptide GT is the fast, loose one; the Meridian is the neutral all-rounder; the Boxer Van and Sunline Cab are the working cars; the Harbor Patrol Cruiser is quick and heavy enough to end a chase; and the Ironhorse Hauler weighs three times a coupe and turns like it.
- **Traffic that behaves, crowds that don't.** Civilian cars hold a lane, steer for the next waypoint, brake for a red light or the bumper ahead, and lean on the horn when stuck. Pedestrians walk the pavement ring of a block, cross where the paint is, get knocked flat by a bumper, and scatter when a shot goes off nearby — as do the cars, which will run the lights for a few seconds in panic.
- **A 1–5 star wanted system.** Carjacking, gunfire, hitting a pedestrian, shooting an officer and blowing something up each add a different amount of heat. Heat crosses thresholds into stars, stars decide how many cruisers and officers the patrol puts on the street, and nothing cools down until no officer or cruiser has had eyes on you for several seconds. Get grabbed on foot at a high star count and you are arrested rather than killed.
- **Six story missions and two side jobs.** Cold Cargo, Tail Light, Payday at the Palms, Night Shift, Harbor Lights and High Tide run from a crate on the pier to a showdown at midnight, with dialogue between Cass Rourke, Odell Moss, Cyrus Pike, Sgt. Hale, Nadine and Lulu. Between chapters you can drive the cab for Nadine or run three parcels for Lulu's courier desk, both repeatable and both paid per stop.
- **Save and continue.** Money, the equipped weapon, pistol and SMG ammo, unlocked guns, completed missions and your running statistics are written to `localStorage` under a versioned key, and the title screen grows a CONTINUE entry once a save exists.
- **A HUD drawn over the world.** A rotating minimap with the job marker, health and armour bars, your cash, the wanted stars, the current weapon or a speedometer with engine wear while driving, the live objective line, the district name and clock, toast messages, and a dialogue box with a generated portrait of whoever is talking.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. It is Node 22 with the standard library only — no install step, no bundler.

## Controls

- **WASD or arrow keys** — move on foot, or steer once you are in a car
- **E** — enter or leave a vehicle
- **Space** — sprint
- **Left click or J** — fire
- **Esc** — pause

---

Entered on [make.fun](https://make.fun/?ref=ab07whaf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01).
