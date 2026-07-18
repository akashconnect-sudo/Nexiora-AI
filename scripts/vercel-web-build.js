/**
 * Vercel web build — keep vercel.json buildCommand under 256 chars.
 * Run from monorepo root OR apps/web (script resolves root).
 */
const { execSync } = require('node:child_process');
const { cpSync, existsSync, mkdirSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');

const cwd = process.cwd();
const root = existsSync(join(cwd, 'pnpm-workspace.yaml')) ? cwd : resolve(cwd, '../..');

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
}

run('pnpm --filter @nexiora/shared build');
run('pnpm --filter @nexiora/search-core build');
run('pnpm --filter @nexiora/api exec prisma generate');
try {
  run('pnpm --filter @nexiora/web exec prisma generate --schema ../api/prisma/schema.prisma');
} catch {
  console.warn('> web prisma generate skipped (api client already generated)');
}
run('pnpm --filter @nexiora/api build');

const from = join(root, 'apps/api/dist');
const to = join(root, 'apps/web/nest-dist');
console.log(`> copy ${from} -> ${to}`);
cpSync(from, to, { recursive: true });

// Replace pnpm/file: symlink with a real copy so Vercel serverless packaging succeeds.
const runtimeSrc = join(root, 'apps/web/nest-runtime');
const runtimeDest = join(root, 'apps/web/node_modules/@nexiora/nest-runtime');
mkdirSync(join(root, 'apps/web/node_modules/@nexiora'), { recursive: true });
rmSync(runtimeDest, { recursive: true, force: true });
cpSync(runtimeSrc, runtimeDest, { recursive: true, dereference: true });
console.log(`> materialized ${runtimeDest}`);

run('pnpm --filter @nexiora/web build');
console.log('vercel-web-build: ok');
