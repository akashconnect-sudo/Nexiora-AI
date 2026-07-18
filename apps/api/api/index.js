/**
 * Vercel Function entry (Root Directory = apps/api).
 * Loads the Nest handler built by `pnpm --filter @nexiora/api build`.
 */
const mod = require('../dist/vercel.js');
module.exports = mod.default || mod;
