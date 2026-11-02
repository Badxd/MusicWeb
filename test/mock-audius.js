// Fake Audius API for offline testing: node test/mock-audius.js
const http = require('http');
function wav(sec = 20, hz = 440) {
  const sr = 8000, n = sr * sec, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / sr) * 8000), 44 + i * 2);
  return b;
}
const audio = wav();
const svgCover = (c) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='480' height='480'><rect width='480' height='480' fill='${c}'/></svg>`);
const mk = (i, genre) => ({ id: 'T' + i, title: 'Song number ' + i + ' with a fairly long title', user: { name: 'Artist ' + i }, duration: 20, genre,
  artwork: { '150x150': svgCover(`hsl(${i * 37},70%,55%)`), '480x480': svgCover(`hsl(${i * 37},70%,55%)`) }, is_streamable: true });
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  res.setHeader('Content-Type', 'application/json');
  if (u.pathname === '/v1/tracks/trending') {
    const g = u.searchParams.get('genre') || 'Pop';
    const off = g === 'Pop' ? 0 : 20;
    return res.end(JSON.stringify({ data: Array.from({ length: 8 }, (_, i) => mk(i + 1 + off, g)) }));
  }
  if (u.pathname === '/v1/tracks/search') return res.end(JSON.stringify({ data: u.searchParams.get('query') === 'none' ? [] : [mk(50, 'Pop'), mk(51, 'Pop')] }));
  const m = u.pathname.match(/^\/v1\/tracks\/([^/]+)\/stream$/);
  if (m) { res.setHeader('Content-Type', 'audio/wav'); res.setHeader('Content-Length', audio.length); res.setHeader('Accept-Ranges', 'bytes'); return res.end(audio); }
  res.statusCode = 404; res.end('{}');
}).listen(4001, () => console.log('mock audius on 4001'));
