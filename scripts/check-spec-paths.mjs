import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const dataSpec = read('docs/DATA_SPEC.md');
const locations = dataSpec.split('## Data File Locations')[1]?.split('## ')[0] ?? '';
const named = [...locations.matchAll(/`([A-Za-z0-9._-]+\.json)`/g)].map((m) => m[1]);
if (named.length === 0) {
  errors.push('DATA_SPEC.md has no JSON files under Data File Locations');
}
for (const file of named) {
  const rel = path.join('public/data', file);
  if (!fs.existsSync(path.join(root, rel))) {
    errors.push(`DATA_SPEC names ${file} but ${rel} does not exist`);
  }
}

const packageJson = JSON.parse(read('package.json'));
const viteRange = packageJson.devDependencies?.vite ?? packageJson.dependencies?.vite ?? '';
const viteVersion = viteRange.replace(/^[^0-9]*/, '');
const architecture = read('docs/ARCHITECTURE_SPEC.md');
if (!viteVersion || !architecture.includes(`Vite ${viteVersion}`)) {
  errors.push(`ARCHITECTURE_SPEC.md must name Vite ${viteVersion} (package.json)`);
}

const required = [
  'src/main.tsx',
  'src/utils/dataLoader.ts',
  'src/utils/quizQuestionGenerator.ts',
  'src/types/index.ts',
  'public/service-worker.js',
  'vite.config.ts',
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    errors.push(`missing required path ${rel}`);
  }
}
if (!architecture.includes('vite-plugin-pwa')) {
  errors.push('ARCHITECTURE_SPEC.md must state that vite-plugin-pwa generates the service worker');
}
if (!read('src/main.tsx').includes('/service-worker.js')) {
  errors.push('src/main.tsx must register /service-worker.js');
}

const staleNeedles = ['app/src', 'app/public', 'app/prototype_figma', '.cursorrules', 'quizQuestions.json'];
const scanned = [
  'docs/ARCHITECTURE_SPEC.md',
  'docs/DATA_SPEC.md',
  'docs/UX_SPEC.md',
  'docs/IMPLEMENTATION_PLAN.md',
  '.cursor/rules/main.md',
];
for (const rel of scanned) {
  const text = read(rel);
  for (const needle of staleNeedles) {
    if (text.includes(needle)) {
      errors.push(`${rel} still contains stale reference ${needle}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`spec paths ok (${named.length} catalog JSON files)`);
