// Download the 3D assets this spike needs.
//
// They are NOT committed, deliberately. The Ready Player Me animation library
// licence, clause 3: "You may not redistribute, sell, or otherwise transfer the
// Animations, in whole or in part, to any third party." Committing them to a
// git repo is redistribution. So we fetch them from Ready Player Me's own
// public repos at setup time instead.
//
//   node fetch-assets.mjs
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(__filename);
const ANIM = 'https://cdn.jsdelivr.net/gh/readyplayerme/animation-library@master/feminine/glb';
const RAW  = 'https://raw.githubusercontent.com/readyplayerme';

// avatar bodies -------------------------------------------------------------
const AVATARS = [
  // Male: the only free RPM asset with 9 SEPARATE materials (skin, hair, beard,
  // eyes, top, bottom, shoes) plus 52 ARKit expressions — so it is the only one
  // a colour editor can actually drive.
  ['models/rpm/XR.glb',
   `${RAW}/rpm-unity-sdk-core/HEAD/Runtime/Core/Models/RPM_Template_Mesh_XR.glb`],
  // Female: ships as ONE merged material and zero morph targets, so she takes
  // only an overall tint and has no facial expressions. A limit of the asset.
  ['models/rpm/Feminine.glb',
   'https://cdn.jsdelivr.net/gh/readyplayerme/animation-library@master/feminine/glb/Feminine_TPose.glb'],
];

// animation clips -----------------------------------------------------------
// The 11 wired into CLIP_FILES, plus the rest of the expression set so the
// contact sheet (sheet.html) has alternatives to choose from.
const CLIPS = [
  ['idle', ['F_Standing_Idle_001']],
  ['dance', ['F_Dances_001', 'F_Dances_004', 'F_Dances_005', 'F_Dances_006']],
  ['expression', [
    'F_Talking_Variations_001', 'F_Talking_Variations_002', 'F_Talking_Variations_003',
    'F_Talking_Variations_004', 'F_Talking_Variations_005', 'F_Talking_Variations_006',
    'M_Standing_Expressions_001', 'M_Standing_Expressions_002', 'M_Standing_Expressions_004',
    'M_Standing_Expressions_005', 'M_Standing_Expressions_006', 'M_Standing_Expressions_007',
    'M_Standing_Expressions_008', 'M_Standing_Expressions_009', 'M_Standing_Expressions_010',
    'M_Standing_Expressions_011', 'M_Standing_Expressions_012', 'M_Standing_Expressions_013',
    'M_Standing_Expressions_014', 'M_Standing_Expressions_015', 'M_Standing_Expressions_016',
    'M_Standing_Expressions_017', 'M_Standing_Expressions_018',
  ]],
];

const exists = async p => { try { await stat(p); return true; } catch { return false; } };

async function get(dest, url) {
  const full = join(ROOT, dest);
  if (await exists(full)) { console.log(`  skip   ${dest}`); return; }
  await mkdir(dirname(full), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) { console.error(`  FAIL   ${dest}  (${res.status})`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.subarray(0, 4).toString() !== 'glTF') {
    console.error(`  FAIL   ${dest}  (not a GLB — LFS pointer or an error page?)`);
    return;
  }
  await writeFile(full, buf);
  console.log(`  ok     ${dest}  ${(buf.length / 1024).toFixed(0)} KB`);
}

console.log('avatars:');
for (const [dest, url] of AVATARS) await get(dest, url);

console.log('clips:');
for (const [folder, names] of CLIPS)
  for (const n of names) await get(`models/rpm/clips/${n}.glb`, `${ANIM}/${folder}/${n}.glb`);

console.log('\ndone. now: node serve.mjs');
