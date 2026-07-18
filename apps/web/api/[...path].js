/**
 * NestJS API on the same Vercel project as Next.js.
 * Rewrites send /v1/* (and /health) here; strip the /api prefix for Nest routing.
 */
const mod = require('../../api/dist/vercel.js');
const nestHandler = mod.default || mod;

module.exports = function handler(req, res) {
  if (typeof req.url === 'string' && req.url.startsWith('/api')) {
    req.url = req.url.slice(4) || '/';
  }
  return nestHandler(req, res);
};
