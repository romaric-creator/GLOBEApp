/**
 * download-windows-engines.mjs
 * Télécharge les engines Prisma pour Windows avant de packager l'application Electron.
 * À exécuter depuis le dossier backend : node scripts/download-windows-engines.mjs
 */

import pkg from '@prisma/fetch-engine';
const { download } = pkg;
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = resolve(__dirname, '..');

// Lire la version depuis le package @prisma/engines
const enginesPackage = JSON.parse(
  readFileSync(resolve(backendDir, 'node_modules/@prisma/engines/package.json'), 'utf-8')
);
const version = enginesPackage.version;

console.log(`📦 Prisma engines version: ${version}`);
console.log('⬇️  Téléchargement des engines Windows...');

const outputDir = resolve(backendDir, 'node_modules/@prisma/engines');

await download({
  binaries: {
    'schema-engine': outputDir,
    'query-engine': outputDir,
  },
  binaryTargets: ['windows'],
  version,
});

console.log('✅ Engines Windows téléchargés avec succès dans :', outputDir);
