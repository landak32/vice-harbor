// Vice Harbor — an original top-down open-world crime game, built for the "Make GTA 6" bounty.
//
// Everything the player sees is generated at runtime: the city grid and its districts, every
// building, palm, car and character is drawn with the 2D canvas API, and every sound is
// synthesised with WebAudio. There are no images, no fonts, no libraries and no network calls —
// game/ is a folder of plain ES modules and one HTML file that a desktop browser opens directly.
//
// The city is Vice Harbor: Kessler Mile's towers, the Harbour Docks, the Sunset Strip beach, a
// park and the residential terraces, joined by a road grid with lanes, crossings and traffic that
// stops at lights. The player steals cars, works a six-mission story from a message run to a
// dockside heist, runs taxi and courier work for cash, and collects stars until the patrol gives
// up or the hospital bill arrives. Progress saves to localStorage.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Add ?shot=chase|foot|drive|mission&seed=7 to stage a scene for a screenshot.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// A last line of bookkeeping: how much the entry actually ships, in files and KiB.
function summariseGameFolder(dir: string): { files: number; bytes: number } {
  let files = 0;
  let bytes = 0;
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else {
        files += 1;
        bytes += statSync(path).size;
      }
    }
  };
  walk(dir);
  return { files, bytes };
}

const shipped = summariseGameFolder(join(here, 'game'));
console.log(`Vice Harbor: game/ ships ${shipped.files} files, ${(shipped.bytes / 1024).toFixed(1)} KiB`);

