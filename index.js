/**
 * api/index.js — Vercel serverless entry.
 *
 * Vercel runs this file as a function. It simply re-exports the Express
 * app from server.js (which does NOT call listen() when process.env.VERCEL
 * is set). vercel.json rewrites /api/* and /health here, and Express then
 * sees the original URL (e.g. /api/products) and routes it normally.
 */
module.exports = require('../server');
