'use strict';
// Music provider: Audius public API (free, no key, streaming + download allowed).
// To use another source, export the same 5 functions from a new file and
// change the require() in server.js.
const BASE = (process.env.AUDIUS_API || 'https://api.audius.co').replace(/\/$/, '');
const APP = encodeURIComponent(process.env.APP_NAME || 'Shizumusic');

async function api(pathAndQuery) {
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}/v1${pathAndQuery}${sep}app_name=${APP}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error('Audius ' + r.status);
  return (await r.json()).data;
}

function norm(t) {
  const art = t.artwork || {};
  return {
    id: t.id,
    title: t.title || 'Untitled',
    artist: (t.user && t.user.name) || 'Unknown',
    cover: art['480x480'] || art['1000x1000'] || art['150x150'] || '',
    thumb: art['150x150'] || art['480x480'] || '',
    duration: t.duration || 0,
    genre: t.genre || '',
  };
}
const list = (d) => (Array.isArray(d) ? d : []).filter((t) => t && t.id && t.is_streamable !== false).map(norm);

module.exports = {
  trending: async (genre) =>
    list(await api(`/tracks/trending?time=week&limit=30${genre ? '&genre=' + encodeURIComponent(genre) : ''}`)),
  search: async (q) => list(await api(`/tracks/search?query=${encodeURIComponent(q)}&limit=30`)),
  track: async (id) => { const d = await api(`/tracks/${encodeURIComponent(id)}`); return d ? norm(d) : null; },
  streamUrl: (id) => `${BASE}/v1/tracks/${encodeURIComponent(id)}/stream?app_name=${APP}`,
};
