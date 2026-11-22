// main.ts — the handover program for VAULTBREAK.
//
// VAULTBREAK is a top-down heist game that lives entirely in static files:
// everything the browser needs sits under game/ (plain HTML, scripts and
// canvas art, no build step, no network), and screenshots/ holds a few real
// renders of it in play. This program is the courier between that repository
// and the bounty: it stages game/ and screenshots/ into the output
// directory and seals the delivery with a dossier written by the vendored
// make.fun game library, so what is judged is exactly what was built here.
//
// One caution shapes the whole file: in the grader the output directory is
// a mount point, so it is created if missing but never deleted or emptied.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Where this repository lives on disk, and where the entry is handed in.
const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the gate scores against; passing the same numbers here means a
// delivery that would be refused there fails loudly here instead.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// Copy one folder of the entry across and say what was staged. A missing
// source is only fatal for the game itself; screenshots are copied when
// the repository has them.
function stage(folder: string, required: boolean): boolean {
  const from = join(repoDir, folder);
  if (!existsSync(from)) {
    if (required) throw new Error(`cannot hand in VAULTBREAK: no ${folder}/ in the repository`);
    console.log(`stage: no ${folder}/ in the repository, nothing copied`);
    return false;
  }
  cpSync(from, join(outDir, folder), { recursive: true });
  console.log(`stage: ${folder}/ copied to the output directory`);
  return true;
}

// Prepare the output directory (created, never removed), then move the
// game and the screenshots into it.
mkdirSync(outDir, { recursive: true });
const gameStaged = stage('game', true);
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsStaged = stage('screenshots', false);

// Seal the handover: the dossier describes the staged tree, and writing it
// is the last step — if the tree broke a cap, buildDossier throws here and
// nothing is handed in.
const dossierText = buildDossier(outDir, GATE_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossierText);

console.log(
  `VAULTBREAK handed in: game ${gameStaged ? 'staged' : 'missing'}, ` +
    `screenshots ${shotsStaged ? 'staged' : 'absent'}, dossier.json written to ${outDir}`,
);
