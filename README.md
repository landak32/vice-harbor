# Vice Harbor

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/landak32/vice-harbor/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/landak32/vice-harbor/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Vice Harbor is a top-down open-world crime game that runs in a single browser tab. Every frame of it — the road grid, the tower roofs, the cars, the muzzle flashes and the street lights — is drawn with the 2D canvas API, and every sound, from the engine note under the hood to the siren behind you, is synthesised live with WebAudio. There are no image files, no audio files, no third-party libraries and no build step: clone the repository, serve the folder, and the game is already there.

## What's in it

- **Five districts on one map.** Downtown's Kessler Mile towers in the north-east, the Harbour Docks along the south-west water, the Sunset Strip beach on the east shore, a central park, and the low residential terraces filling the rest. They share a single road grid with marked lanes, crossings and traffic lights that actually hold the traffic.
- **Movement on foot and behind the wheel.** Walk and run between cars, or press E next to one to take it; each vehicle carries its own weight, grip and top speed into the handling.
- **Six car classes.** Sports, sedan, van, taxi, police cruiser and a long heavy hauler, each tuned separately so a truck feels slow and planted while the sports car drifts wide through a corner.
- **Living streets.** Traffic that brakes for lights and other cars, plus pedestrians who wander the pavements and would rather not be in your way.
- **A 1–5 star wanted system.** Trouble escalates one star at a time as the patrol responds harder, and cools back down again if you manage to disappear.
- **Six story missions plus side jobs.** A run of jobs that builds from a simple message drop to a dockside score, with taxi and courier work available whenever you need cash in between.
- **Save and continue.** Progress is written to localStorage, so closing the tab is not the same as starting over.
- **A HUD and a minimap.** Cash, health, weapon and wanted level sit on screen while the minimap tracks the streets, your car and whatever is chasing it.

## Run it

Node 22 or newer, standard library only — nothing to install.

```sh
node serve.ts
```

Then open http://localhost:8080 in a browser. Pass `--port 3000` if 8080 is taken.

## Controls

- **WASD or arrow keys** — move on foot, or drive once you are in a car
- **E** — enter or exit a car
- **Space** — sprint
- **Left click or J** — fire
- **Esc** — pause

---

<sub>Entered on [make.fun](https://make.fun/?ref=ab07whaf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
