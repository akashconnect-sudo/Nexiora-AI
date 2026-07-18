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

  requireFromFile('reflect-metadata');

  const expressMod = requireFromFile('express');
  const expressFn =
    typeof expressMod === 'function'
      ? expressMod
      : typeof expressMod?.default === 'function'
        ? expressMod.default
        : null;
  if (!expressFn) {
    throw new Error(
      `express resolve failed from ${file}: type=${typeof expressMod} keys=${JSON.stringify(
        Object.keys(expressMod || {}),
      )}`,
    );
  }

  const mod = requireFromFile(file);
  const create =
    typeof mod.createNexioraApp === 'function'
      ? mod.createNexioraApp
      : typeof mod.default?.createNexioraApp === 'function'
        ? mod.default.createNexioraApp
        : null;
  if (!create) {
    throw new Error(
      `createNexioraApp missing in ${file}. keys=${JSON.stringify(Object.keys(mod || {}))}`,
    );
  }

  const { express } = await create();
  if (typeof express !== 'function') {
    throw new Error(`createNexioraApp returned non-function express (${typeof express})`);
  }
  return express;
}

module.exports = { loadNexioraExpress, resolveCreateApp };
