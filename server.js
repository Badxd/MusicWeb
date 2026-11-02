'use strict';
/**
 * Shizumusic server
 * - serves the static iOS style web app from /public
 * - small JSON API on top of a music provider (providers/audius.js)
 * - /api/stream/:id   -> redirect to audio (browser plays it directly)
 * - /api/download/:id -> proxied as an attachment so the browser saves the file
 * Nothing is stored on disk, so it works on Heroku's ephemeral filesystem.
 * Playlists / favourites live in the user's browser (localStorage).
 */
const express = require('express');
const path = require('path');
const { Readable } = require('stream');
const provider = require('./providers/audius');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

// force https on Heroku / behind proxies
app.use((req, res, next) => {
  if (process.env.FORCE_HTTPS === '1' && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
  }
  next();
});

// tiny in-memory cache
const cache = new Map();
async function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  const val = await fn();
  cache.set(key, { val, exp: Date.now() + ttlMs });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return val;
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err.message);
    res.status(502).json({ error: 'Music service unavailable, try again.' });
  });

app.get('/healthz', (req, res) => res.send('ok'));

app.get('/api/trending', wrap(async (req, res) => {
  const genre = String(req.query.genre || '').slice(0, 40);
  const data = await cached('t:' + genre, 5 * 60e3, () => provider.trending(genre));
  res.json({ tracks: data });
}));

app.get('/api/search', wrap(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (!q) return res.json({ tracks: [] });
  const data = await cached('s:' + q.toLowerCase(), 2 * 60e3, () => provider.search(q));
  res.json({ tracks: data });
}));

// used by autoplay when the queue ends
app.get('/api/similar', wrap(async (req, res) => {
  const genre = String(req.query.genre || '').slice(0, 40);
  const data = await cached('t:' + genre, 5 * 60e3, () => provider.trending(genre));
  res.json({ tracks: data });
}));

app.get('/api/track/:id', wrap(async (req, res) => {
  const t = await cached('i:' + req.params.id, 10 * 60e3, () => provider.track(req.params.id));
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
}));

const okId = (id) => /^[A-Za-z0-9_-]{1,40}$/.test(id);

app.get('/api/stream/:id', (req, res) => {
  if (!okId(req.params.id)) return res.sendStatus(400);
  res.set('Cache-Control', 'no-store');
  res.redirect(302, provider.streamUrl(req.params.id));
});

app.get('/api/download/:id', async (req, res) => {
  if (!okId(req.params.id)) return res.sendStatus(400);
  try {
    const headers = {};
    if (req.headers.range) headers.range = req.headers.range;
    const up = await fetch(provider.streamUrl(req.params.id), { redirect: 'follow', headers });
    if (!up.ok && up.status !== 206) return res.status(502).send('Upstream error');
    const raw = String(req.query.name || 'song').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 120) || 'song';
    const ascii = raw.replace(/[^\x20-\x7E]/g, '_');
    res.status(up.status);
    res.set('Content-Type', up.headers.get('content-type') || 'audio/mpeg');
    res.set('Content-Disposition', `attachment; filename="${ascii}.mp3"; filename*=UTF-8''${encodeURIComponent(raw)}.mp3`);
    for (const h of ['content-length', 'content-range', 'accept-ranges']) {
      const v = up.headers.get(h);
      if (v) res.set(h, v);
    }
    Readable.fromWeb(up.body).on('error', () => res.end()).pipe(res);
    req.on('close', () => up.body.cancel().catch(() => {}));
  } catch (e) {
    console.error('download failed', e.message);
    if (!res.headersSent) res.status(502).send('Download failed');
  }
});

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  setHeaders: (res, p) => { if (p.endsWith('sw.js') || p.endsWith('.html')) res.set('Cache-Control', 'no-cache'); },
}));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  app.listen(PORT, () => console.log('Shizumusic running on port ' + PORT));
}
module.exports = app;
