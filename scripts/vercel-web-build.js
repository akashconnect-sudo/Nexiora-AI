/**
 * Vercel web build — keep vercel.json buildCommand under 256 chars.
 * Run from monorepo root OR apps/web (script resolves root).
 */
const { execSync } = require('node:child_process');
const { cpSync, existsSync } = require('node:fs');
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
run('pnpm --filter @nexiora/api build');

const from = join(root, 'apps/api/dist');
const to = join(root, 'apps/web/nest-dist');
console.log(`> copy ${from} -> ${to}`);
cpSync(from, to, { recursive: true });

run('pnpm --filter @nexiora/web build');
console.log('vercel-web-build: ok');
