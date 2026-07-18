/**
 * CJS loader for Nest on Vercel — kept outside Next/webpack so createRequire works.
 * nest-dist is copied here during `scripts/vercel-web-build.js`.
 */
'use strict';

const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { createRequire } = require('node:module');

function resolveCreateApp() {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, 'nest-dist', 'bootstrap', 'create-app.js'),
    join(cwd, '..', 'api', 'dist', 'bootstrap', 'create-app.js'),
    join(cwd, 'apps', 'web', 'nest-dist', 'bootstrap', 'create-app.js'),
  ];
  const found = candidates.find((file) => existsSync(file));
  if (!found) {
    throw new Error(
      `Nest create-app missing. Looked for: ${candidates.join(' | ')}. Ensure vercel-web-build copied nest-dist.`,
    );
  }
  return found;
}

async function loadNexioraExpress() {
  const file = resolveCreateApp();
  const requireFromFile = createRequire(file);
  const mod = requireFromFile(file);
  if (typeof mod.createNexioraApp !== 'function') {
    throw new Error(`createNexioraApp missing in ${file}`);
  }
  const { express } = await mod.createNexioraApp();
  return express;
}

module.exports = { loadNexioraExpress, resolveCreateApp };
