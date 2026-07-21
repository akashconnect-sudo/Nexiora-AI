/**
 * Worker package entry delegates to the Nest worker bootstrap in @nexiora/api.
 * Docker images should prefer `pnpm --filter @nexiora/api worker` after build.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const workerEntry = join(__dirname, '..', '..', 'api', 'dist', 'worker.js');
const child = spawn(process.execPath, [workerEntry], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
