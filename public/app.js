'use strict';
/* Shizumusic - front end (plain JS, no framework) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const audio = $('#audio');

  /* ---------------- icons ---------------- */
  const P = {
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z"/>',
    pause: '<rect x="5.5" y="4" width="4.5" height="16" rx="1.2"/><rect x="14" y="4" width="4.5" height="16" rx="1.2"/>',
    next: '<path d="M3 5.5v13a.9.9 0 0 0 1.4.75l9.3-6.5a.9.9 0 0 0 0-1.5L4.4 4.75A.9.9 0 0 0 3 5.5zM16 5h2.6c.8 0 1.4.6 1.4 1.4v11.2c0 .8-.6 1.4-1.4 1.4H16z"/>',
    prev: '<path d="M21 5.5v13a.9.9 0 0 1-1.4.75l-9.3-6.5a.9.9 0 0 1 0-1.5l9.3-6.5A.9.9 0 0 1 21 5.5zM8 5H5.4C4.6 5 4 5.6 4 6.4v11.2c0 .8.6 1.4 1.4 1.4H8z"/>',
    heart: '<path d="M12 20.5s-8-5-9.4-10A5.2 5.2 0 0 1 12 7.3a5.2 5.2 0 0 1 9.4 3.2c-1.4 5-9.4 10-9.4 10z"/>',
    home: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.7-4.7"/>',
    lib: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    note: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    more: '<circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/>',
    download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/>',
    queue: '<path d="M4 6h16M4 12h16M4 18h8M16 15.5l5 3-5 3z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    shuffle: '<path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 3.6c1.1 1.7 2.3 2.7 4.3 2.7H21M3 17h3.5c2 0 3.2-1 4.3-2.7M13.2 9.7C14.3 8 15.5 7 17.5 7H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    repeat: '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H20M17 3l3 3-3 3M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H4M7 21l-3-3 3-3"/>',
    auto: '<path d="M7.5 8a4 4 0 1 0 0 8c4.5 0 5-8 9-8a4 4 0 1 1 0 8c-4 0-4.5-8-9-8z"/>',
    trash: '<path d="M4 7h16M9.5 7V4h5v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  };
  const FILLED = new Set(['play', 'pause', 'next', 'prev', 'more']);
  const svg = (n, cls = '') => `<svg viewBox="0 0 24 24" class="${FILLED.has(n) ? 'f ' : ''}${cls}">${P[n]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- storage ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('shizu:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('shizu:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const lib = {
    fav: store.get('fav', []),
    recent: store.get('recent', []),
    playlists: store.get('playlists', []),
    save() { store.set('fav', this.fav); store.set('recent', this.recent); store.set('playlists', this.playlists); },
  };
  const slim = (t) => ({ id: t.id, title: t.title, artist: t.artist, cover: t.cover, thumb: t.thumb, duration: t.duration, genre: t.genre });
  const isFav = (id) => lib.fav.some((t) => t.id === id);

  /* ---------------- helpers ---------------- */
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const api = async (path) => {
    const r = await fetch(path);
    if (!r.ok) throw new Error('Request failed');
    return r.json();
  };
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }
  const cssUrl = (u) => String(u).replace(/['"()\\\s<>&]/g, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));
  const artStyle = (url) => (url ? `background-image:url('${cssUrl(url)}')` : '');
  function artEl(url, cls) {
    const d = document.createElement('div');
    d.className = 'art ' + cls + (url ? '' : ' ph');
    if (url) d.style.backgroundImage = `url("${cssUrl(url)}")`; else d.innerHTML = svg('note');
    return d;
  }
  function download(t) {
    const a = document.createElement('a');
    a.href = `/api/download/${encodeURIComponent(t.id)}?name=${encodeURIComponent(t.artist + ' - ' + t.title)}`;
    a.download = ''; document.body.appendChild(a); a.click(); a.remove();
    toast('Downloading…');
  }

  /* ---------------- player ---------------- */
  const S = {
    queue: [], idx: -1, shuffle: store.get('shuffle', false), repeat: store.get('repeat', 'off'),
    autoplay: store.get('autoplay', true), history: [], loadingMore: false, seeking: false,
  };
  const cur = () => S.queue[S.idx];

  function playList(tracks, start = 0, { shuffleFirst = false } = {}) {
    S.queue = tracks.map(slim); S.history = [];
    if (shuffleFirst) { S.shuffle = true; store.set('shuffle', true); start = Math.floor(Math.random() * S.queue.length); }
    playIndex(start);
  }
  function playIndex(i, pushHistory = true) {
    if (i < 0 || i >= S.queue.length) return;
    if (pushHistory && S.idx >= 0 && S.idx !== i) S.history.push(S.idx);
    S.idx = i;
    const t = cur();
    audio.src = '/api/stream/' + encodeURIComponent(t.id);
    audio.play().catch(() => { /* blocked or loading; ui follows audio events */ });
    lib.recent = [slim(t), ...lib.recent.filter((x) => x.id !== t.id)].slice(0, 40); lib.save();
    updateMeta(); highlightPlaying();
  }
  function togglePlay() {
    if (!cur()) return;
    if (audio.paused) audio.play().catch(() => toast('Cannot play this song')); else audio.pause();
  }
  async function next(auto = false) {
    if (!S.queue.length) return;
    if (S.repeat === 'one' && auto) { audio.currentTime = 0; audio.play(); return; }
    if (S.shuffle && S.queue.length > 1) {
      let n; do { n = Math.floor(Math.random() * S.queue.length); } while (n === S.idx);
      return playIndex(n);
    }
    if (S.idx + 1 < S.queue.length) return playIndex(S.idx + 1);
    if (S.repeat === 'all') return playIndex(0);
    if (S.autoplay && auto !== 'manual-stop') {
      const added = await loadMore();
      if (added) return playIndex(S.idx + 1);
    }
    if (auto) { audio.pause(); audio.currentTime = 0; }
  }
  function prev() {
    if (audio.currentTime > 3 || !S.history.length) { audio.currentTime = 0; return; }
    playIndex(S.history.pop(), false);
  }
  // autoplay: when the queue ends keep going with similar (same genre) songs
  async function loadMore() {
    if (S.loadingMore) return 0;
    S.loadingMore = true;
    try {
      const t = cur();
      let tracks = [];
      try { tracks = (await api('/api/similar?genre=' + encodeURIComponent(t ? t.genre : ''))).tracks; } catch { /* fall through */ }
      if (!tracks.length) tracks = (await api('/api/trending')).tracks;
      const have = new Set(S.queue.map((x) => x.id));
      const fresh = tracks.filter((x) => !have.has(x.id)).sort(() => Math.random() - 0.5);
      if (!fresh.length) return 0;
      S.queue.push(...fresh.map(slim));
      return fresh.length;
    } catch { return 0; } finally { S.loadingMore = false; }
  }
  function playNext(t) { if (!S.queue.length) return playList([t]); S.queue.splice(S.idx + 1, 0, slim(t)); toast('Playing next'); }
  function addQueue(t) { if (!S.queue.length) return playList([t]); S.queue.push(slim(t)); toast('Added to queue'); }

  audio.addEventListener('ended', () => next(true));
  audio.addEventListener('play', syncPlayState);
  audio.addEventListener('pause', syncPlayState);
  audio.addEventListener('error', () => {
    if (!audio.src || !cur()) return;
    toast('Song unavailable, skipping…');
    setTimeout(() => next('skip'), 900);
  });
  audio.addEventListener('timeupdate', onTime);
  audio.addEventListener('loadedmetadata', onTime);

  /* ---------------- player UI ---------------- */
  const el = {
    mini: $('#mini'), miniArt: $('#miniArt'), miniTitle: $('#miniTitle'), miniArtist: $('#miniArtist'), miniBar: $('#miniBar'),
    miniPlay: $('#miniPlay'), miniNext: $('#miniNext'), player: $('#player'), pBg: $('#playerBg'), pArt: $('#playerArt'),
    pTitle: $('#pTitle'), pArtist: $('#pArtist'), pFav: $('#pFav'), pMore: $('#pMore'), seek: $('#seek'), tCur: $('#tCur'), tLeft: $('#tLeft'),
    cPrev: $('#cPrev'), cPlay: $('#cPlay'), cNext: $('#cNext'), xShuffle: $('#xShuffle'), xRepeat: $('#xRepeat'), xAuto: $('#xAuto'),
    xDownload: $('#xDownload'), xQueue: $('#xQueue'),
  };
  el.miniPlay.innerHTML = svg('play'); el.miniNext.innerHTML = svg('next');
  el.cPrev.innerHTML = svg('prev'); el.cNext.innerHTML = svg('next'); el.cPlay.innerHTML = svg('play');
  el.pFav.innerHTML = svg('heart'); el.pMore.innerHTML = svg('more');
  el.xShuffle.innerHTML = svg('shuffle'); el.xRepeat.innerHTML = svg('repeat'); el.xAuto.innerHTML = svg('auto');
  el.xDownload.innerHTML = svg('download'); el.xQueue.innerHTML = svg('queue');

  function syncPlayState() {
    const playing = !audio.paused;
    el.miniPlay.innerHTML = svg(playing ? 'pause' : 'play');
    el.cPlay.innerHTML = svg(playing ? 'pause' : 'play');
    el.player.classList.toggle('paused', !playing);
    document.body.classList.toggle('is-playing', playing);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }
  function setSeekFill() { el.seek.style.setProperty('--p', (el.seek.value / 10) + '%'); }
  function onTime() {
    const d = audio.duration && isFinite(audio.duration) ? audio.duration : (cur() ? cur().duration : 0);
    const c = audio.currentTime || 0;
    if (d) el.miniBar.style.width = Math.min(100, (c / d) * 100) + '%';
    if (!S.seeking) {
      el.seek.value = d ? Math.round((c / d) * 1000) : 0; setSeekFill();
      el.tCur.textContent = fmt(c); el.tLeft.textContent = '-' + fmt(d - c);
    }
    if ('mediaSession' in navigator && d && navigator.mediaSession.setPositionState) {
      try { navigator.mediaSession.setPositionState({ duration: d, position: Math.min(c, d), playbackRate: 1 }); } catch { /* ignore */ }
    }
  }
  function updateMeta() {
    const t = cur(); if (!t) return;
    document.body.classList.add('has-mini'); el.mini.classList.remove('hidden');
    const setArt = (node, cls) => { node.className = 'art ' + cls + (t.cover ? '' : ' ph'); node.style.backgroundImage = t.cover ? `url("${cssUrl(t.cover)}")` : ''; node.innerHTML = t.cover ? '' : svg('note'); };
    setArt(el.miniArt, 'sm'); setArt(el.pArt, 'xl');
    el.pBg.style.backgroundImage = t.cover ? `url("${cssUrl(t.cover)}")` : '';
    el.miniTitle.textContent = el.pTitle.textContent = t.title;
    el.miniArtist.textContent = el.pArtist.textContent = t.artist;
    document.title = t.title + ' · Shizumusic';
    refreshToggles();
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: 'Shizumusic', artwork: t.cover ? [{ src: t.cover, sizes: '480x480' }] : [] });
    }
  }
  function refreshToggles() {
    const t = cur();
    el.pFav.classList.toggle('liked', !!t && isFav(t.id));
    el.pFav.innerHTML = svg('heart', t && isFav(t.id) ? 'f' : '');
    el.xShuffle.classList.toggle('on', S.shuffle);
    el.xRepeat.classList.toggle('on', S.repeat !== 'off');
    el.xRepeat.classList.toggle('repeat-one', S.repeat === 'one');
    el.xAuto.classList.toggle('on', S.autoplay);
  }
  function highlightPlaying() {
    const t = cur();
    document.querySelectorAll('.item[data-id]').forEach((n) => n.classList.toggle('playing', !!t && n.dataset.id === t.id));
  }
  function openPlayer() { if (!cur()) return; el.player.classList.add('open'); el.player.setAttribute('aria-hidden', 'false'); }
  function closePlayer() { el.player.classList.remove('open'); el.player.setAttribute('aria-hidden', 'true'); }

  $('#miniOpen').onclick = openPlayer;
  $('#playerClose').onclick = closePlayer;
  el.miniPlay.onclick = el.cPlay.onclick = togglePlay;
  el.miniNext.onclick = el.cNext.onclick = () => next('skip');
  el.cPrev.onclick = prev;
  el.seek.addEventListener('input', () => {
    S.seeking = true; setSeekFill();
    const d = audio.duration || (cur() && cur().duration) || 0;
    el.tCur.textContent = fmt((el.seek.value / 1000) * d); el.tLeft.textContent = '-' + fmt(d - (el.seek.value / 1000) * d);
  });
  el.seek.addEventListener('change', () => {
    const d = audio.duration || 0;
    if (d) audio.currentTime = (el.seek.value / 1000) * d;
    S.seeking = false;
  });
  el.xShuffle.onclick = () => { S.shuffle = !S.shuffle; store.set('shuffle', S.shuffle); refreshToggles(); toast('Shuffle ' + (S.shuffle ? 'on' : 'off')); };
  el.xRepeat.onclick = () => {
    S.repeat = { off: 'all', all: 'one', one: 'off' }[S.repeat]; store.set('repeat', S.repeat); refreshToggles();
    toast({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }[S.repeat]);
  };
  el.xAuto.onclick = () => { S.autoplay = !S.autoplay; store.set('autoplay', S.autoplay); refreshToggles(); toast('Autoplay ' + (S.autoplay ? 'on' : 'off')); };
  el.xDownload.onclick = () => cur() && download(cur());
  el.pFav.onclick = () => cur() && toggleFav(cur());
  el.pMore.onclick = () => cur() && trackMenu(cur());
  el.xQueue.onclick = openQueue;

  // swipe down to close the full player
  (() => {
    let y0 = null;
    el.player.addEventListener('touchstart', (e) => { if (!e.target.closest('input,button')) y0 = e.touches[0].clientY; }, { passive: true });
    el.player.addEventListener('touchend', (e) => { if (y0 !== null && e.changedTouches[0].clientY - y0 > 90) closePlayer(); y0 = null; }, { passive: true });
  })();

  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => audio.play());
    ms.setActionHandler('pause', () => audio.pause());
    ms.setActionHandler('previoustrack', prev);
    ms.setActionHandler('nexttrack', () => next('skip'));
    try { ms.setActionHandler('seekto', (d) => { audio.currentTime = d.seekTime; }); } catch { /* unsupported */ }
  }
  document.addEventListener('keydown', (e) => {
    if (/input|textarea/i.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowRight' && e.shiftKey) next('skip');
    else if (e.code === 'ArrowLeft' && e.shiftKey) prev();
    else if (e.code === 'Escape') closePlayer();
  });

  /* ---------------- favourites / playlists ---------------- */
  function toggleFav(t) {
    if (isFav(t.id)) { lib.fav = lib.fav.filter((x) => x.id !== t.id); toast('Removed from Favourites'); }
    else { lib.fav.unshift(slim(t)); toast('Added to Favourites'); }
    lib.save(); refreshToggles(); if (view.name === 'home' || view.name === 'library') render();
  }
  function addToPlaylist(pl, t) {
    if (pl.tracks.some((x) => x.id === t.id)) return toast('Already in ' + pl.name);
    pl.tracks.push(slim(t)); lib.save(); toast('Added to ' + pl.name);
  }
  const uid = () => Math.random().toString(36).slice(2, 9);

  /* ---------------- sheets & alerts ---------------- */
  const root = $('#sheetRoot');
  function closeSheet() {
    const nodes = [...root.children];
    nodes.forEach((n) => n.classList.remove('show'));
    setTimeout(() => nodes.forEach((n) => n.remove()), 300); // only remove what we closed, not a newly opened sheet
  }
  function openSheet(html, after) {
    root.innerHTML ='<div class="backdrop"></div><div class="sheet"><div class="grab"></div>' + html + '</div>';
    const sh = $('.sheet', root);
    $('.backdrop', root).onclick = closeSheet;
    if (after) after(sh);
    requestAnimationFrame(() => { sh.classList.add('show'); $('.backdrop', root).classList.add('show'); });
    return sh;
  }
  function trackHead(t) {
    return `<div class="sheet-head"><div class="art md${t.thumb ? '' : ' ph'}" style="${artStyle(t.thumb)}">${t.thumb ? '' : svg('note')}</div><div style="min-width:0"><div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.artist)}</div></div></div>`;
  }
  function actions(list) {
    return '<div class="sheet-body">' + list.map((a, i) => `<button class="act ${a.danger ? 'danger' : ''}" data-i="${i}">${svg(a.icon, a.fill ? 'f' : '')}<span>${esc(a.label)}</span>${a.small ? `<small>${esc(a.small)}</small>` : ''}</button>`).join('') + '</div>';
  }
  function bindActions(sh, list) {
    sh.querySelectorAll('.act').forEach((b) => { b.onclick = () => { closeSheet(); setTimeout(list[b.dataset.i].run, 120); }; });
  }
  function trackMenu(t, ctx = {}) {
    const list = [
      { icon: 'play', fill: true, label: 'Play Next', run: () => playNext(t) },
      { icon: 'queue', label: 'Add to Queue', run: () => addQueue(t) },
      { icon: 'plus', label: 'Add to Playlist…', run: () => pickPlaylist(t) },
      { icon: 'heart', fill: isFav(t.id), label: isFav(t.id) ? 'Remove from Favourites' : 'Add to Favourites', run: () => toggleFav(t) },
      { icon: 'download', label: 'Download', run: () => download(t) },
    ];
    if (ctx.playlistId) list.push({ icon: 'trash', danger: true, label: 'Remove from this Playlist', run: () => {
      const pl = lib.playlists.find((p) => p.id === ctx.playlistId); if (!pl) return;
      pl.tracks = pl.tracks.filter((x) => x.id !== t.id); lib.save(); render();
    } });
    const sh = openSheet(trackHead(t) + actions(list));
    bindActions(sh, list);
  }
  function pickPlaylist(t) {
    const list = [{ icon: 'plus', label: 'New Playlist…', run: () => askName('New Playlist', '', (name) => {
      const pl = { id: uid(), name, tracks: [] }; lib.playlists.push(pl); addToPlaylist(pl, t); if (view.name === 'library') render();
    }) }];
    lib.playlists.forEach((pl) => list.push({ icon: 'list', label: pl.name, small: pl.tracks.length + ' songs', run: () => addToPlaylist(pl, t) }));
    const sh = openSheet('<h3>Add to Playlist</h3>' + actions(list));
    bindActions(sh, list);
  }
  function askName(title, value, done) {
    root.innerHTML = `<div class="backdrop"></div><div class="alert"><h4>${esc(title)}</h4><input type="text" maxlength="40" placeholder="Playlist name" value="${esc(value)}"><div class="btns"><button data-c>Cancel</button><button data-ok>Save</button></div></div>`;
    const a = $('.alert', root), inp = $('input', a);
    $('.backdrop', root).onclick = closeSheet;
    $('[data-c]', a).onclick = closeSheet;
    const ok = () => { const v = inp.value.trim(); if (!v) return inp.focus(); closeSheet(); done(v); };
    $('[data-ok]', a).onclick = ok;
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    requestAnimationFrame(() => { a.classList.add('show'); $('.backdrop', root).classList.add('show'); inp.focus(); inp.select(); });
  }
  function openQueue() {
    if (!S.queue.length) return toast('Queue is empty');
    const upcoming = S.queue.map((t, i) => ({ t, i }));
    const html = '<h3>Queue</h3><div class="sheet-body">' + upcoming.map(({ t, i }) =>
      `<div class="item ${i === S.idx ? 'playing' : ''}" data-q="${i}" style="padding-left:20px"><div class="art md${t.thumb ? '' : ' ph'}" style="${artStyle(t.thumb)}">${t.thumb ? '' : svg('note')}</div><div class="grow"><div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.artist)}</div></div>${i === S.idx ? '<span class="qnow">Now</span>' : ''}</div>`).join('') + '</div>';
    const sh = openSheet(html);
    sh.querySelectorAll('[data-q]').forEach((n) => { n.onclick = () => { playIndex(+n.dataset.q); closeSheet(); }; });
    const now = $('.item.playing', sh); if (now) now.scrollIntoView({ block: 'center' });
  }

  /* ---------------- views ---------------- */
  const views = $('#views');
  const view = { name: 'home', stack: [], genre: '', q: '' };
  const cache = { trending: {}, search: {} };

  function trackItem(t, list, i, ctx) {
    const n = document.createElement('div');
    n.className = 'item'; n.dataset.id = t.id;
    if (cur() && cur().id === t.id) n.classList.add('playing');
    n.innerHTML = `<div class="art md${t.thumb ? '' : ' ph'}" style="${artStyle(t.thumb)}">${t.thumb ? '' : svg('note')}<div class="eq"><i></i><i></i><i></i></div></div>
      <div class="grow"><div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.artist)}</div></div>
      <span class="dur">${t.duration ? fmt(t.duration) : ''}</span>
      <button class="icon-btn more" aria-label="More">${svg('more')}</button>`;
    n.onclick = () => playList(list, i);
    $('.more', n).onclick = (e) => { e.stopPropagation(); trackMenu(t, ctx); };
    return n;
  }
  function trackList(tracks, ctx) {
    const wrap = document.createElement('div'); wrap.className = 'list';
    tracks.forEach((t, i) => wrap.appendChild(trackItem(t, tracks, i, ctx)));
    return wrap;
  }
  function carousel(tracks) {
    const w = document.createElement('div'); w.className = 'row-scroll';
    tracks.forEach((t, i) => {
      const c = document.createElement('button'); c.className = 'card';
      c.appendChild(artEl(t.cover, 'md'));
      c.insertAdjacentHTML('beforeend', `<div class="t1">${esc(t.title)}</div><div class="t2">${esc(t.artist)}</div>`);
      c.onclick = () => playList(tracks, i);
      w.appendChild(c);
    });
    return w;
  }
  const skeleton = (n = 6) => '<div class="list" style="margin:0">' + '<div class="skel"></div>'.repeat(n) + '</div>';
  const errorBox = (msg, retry) => `<div class="empty">${msg}<br><br><button class="btn primary" style="max-width:160px;margin:0 auto" data-retry>Try again</button></div>`;

  const GENRES = [['', 'All'], ['Pop', 'Pop'], ['Hip-Hop/Rap', 'Hip-Hop'], ['Electronic', 'Electronic'], ['Lofi', 'Lo-Fi'], ['R&B/Soul', 'R&B'], ['Rock', 'Rock'], ['Latin', 'Latin'], ['World', 'World'], ['Devotional', 'Devotional'], ['Acoustic', 'Acoustic']];

  function viewHome(page) {
    page.innerHTML = `<div class="large-title"><div class="brand"><div class="logo">${svg('note')}</div><span>Shizumusic</span></div></div>
      <div class="chips" id="chips"></div><div id="homeBody">${skeleton()}</div>`;
    const chips = $('#chips', page);
    GENRES.forEach(([g, label]) => {
      const b = document.createElement('button'); b.className = 'chip' + (view.genre === g ? ' on' : ''); b.textContent = label;
      b.onclick = () => { view.genre = g; render(); }; chips.appendChild(b);
    });
    const body = $('#homeBody', page);
    const load = async () => {
      try {
        const g = view.genre;
        if (!cache.trending[g]) cache.trending[g] = (await api('/api/trending?genre=' + encodeURIComponent(g))).tracks;
        if (view.name !== 'home' || view.genre !== g) return;
        const tr = cache.trending[g];
        body.innerHTML = '';
        if (lib.recent.length && !g) {
          body.insertAdjacentHTML('beforeend', '<div class="section-title">Recently Played</div>');
          body.appendChild(carousel(lib.recent.slice(0, 15)));
        }
        if (!tr.length) { body.insertAdjacentHTML('beforeend', '<div class="empty">No songs found for this genre.</div>'); return; }
        body.insertAdjacentHTML('beforeend', `<div class="section-title">Trending${g ? ' · ' + esc(GENRES.find((x) => x[0] === g)[1]) : ''}</div>`);
        body.appendChild(carousel(tr.slice(0, 12)));
        body.insertAdjacentHTML('beforeend', '<div class="section-title">Top Songs</div>');
        body.appendChild(trackList(tr));
      } catch {
        body.innerHTML = errorBox('Could not load songs.');
        $('[data-retry]', body).onclick = () => { body.innerHTML = skeleton(); load(); };
      }
    };
    load();
  }

  let searchTimer;
  function viewSearch(page) {
    page.innerHTML = `<div class="large-title">Search</div>
      <div class="searchbox"><label>${svg('search')}<input id="q" type="search" placeholder="Songs, artists" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label></div>
      <div id="results"></div>`;
    const inp = $('#q', page), res = $('#results', page);
    inp.value = view.q;
    const idle = () => { res.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24">${P.search}</svg>Search for any song or artist</div>`; };
    const run = async (q) => {
      q = q.trim(); view.q = q;
      if (!q) return idle();
      res.innerHTML = skeleton();
      try {
        if (!cache.search[q]) cache.search[q] = (await api('/api/search?q=' + encodeURIComponent(q))).tracks;
        if (view.q !== q || view.name !== 'search') return;
        const tr = cache.search[q];
        res.innerHTML = '';
        if (!tr.length) res.innerHTML = `<div class="empty">No results for “${esc(q)}”</div>`;
        else res.appendChild(trackList(tr));
      } catch {
        res.innerHTML = errorBox('Search failed.');
        $('[data-retry]', res).onclick = () => run(q);
      }
    };
    inp.oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => run(inp.value), 350); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { clearTimeout(searchTimer); run(inp.value); inp.blur(); } };
    if (view.q) run(view.q); else idle();
  }

  function row(glyphCls, icon, title, sub, onclick, fill) {
    const b = document.createElement('div'); b.className = 'item'; b.style.cursor = 'pointer';
    b.innerHTML = `<div class="glyph ${glyphCls}">${svg(icon, fill ? 'f' : '')}</div><div class="grow"><div class="t1">${esc(title)}</div>${sub ? `<div class="t2">${esc(sub)}</div>` : ''}</div><svg class="chev" viewBox="0 0 24 24">${P.left}</svg>`;
    b.onclick = onclick; return b;
  }
  function viewLibrary(page) {
    page.innerHTML = '<div class="large-title">Library</div>';
    const g1 = document.createElement('div'); g1.className = 'group';
    g1.appendChild(row('g-fav', 'heart', 'Favourites', lib.fav.length + ' songs', () => push('fav'), true));
    g1.appendChild(row('g-rec', 'clock', 'Recently Played', lib.recent.length + ' songs', () => push('recent')));
    page.appendChild(g1);
    page.insertAdjacentHTML('beforeend', '<div class="section-title">Playlists</div>');
    const g2 = document.createElement('div'); g2.className = 'group';
    g2.appendChild(row('g-new', 'plus', 'New Playlist…', '', () => askName('New Playlist', '', (name) => { lib.playlists.push({ id: uid(), name, tracks: [] }); lib.save(); render(); })));
    lib.playlists.forEach((pl) => g2.appendChild(row('g-pl', 'list', pl.name, pl.tracks.length + ' songs', () => push('playlist', pl.id))));
    page.appendChild(g2);
    if (!lib.playlists.length) page.insertAdjacentHTML('beforeend', '<p class="muted" style="font-size:14px;padding:6px 4px">Create a playlist, then tap “···” on any song to add it.</p>');
  }
  function viewDetail(page) {
    const { kind, id } = view.detail;
    let title, tracks, pl = null, ctx = {};
    if (kind === 'fav') { title = 'Favourites'; tracks = lib.fav; }
    else if (kind === 'recent') { title = 'Recently Played'; tracks = lib.recent; }
    else { pl = lib.playlists.find((p) => p.id === id); if (!pl) { pop(); return; } title = pl.name; tracks = pl.tracks; ctx = { playlistId: pl.id }; }
    page.innerHTML = `<div class="nav"><button class="back" id="back">${svg('left')}Library</button></div>
      <div class="hero"><div class="art ${tracks[0] && tracks[0].cover ? '' : 'ph'}" style="${artStyle(tracks[0] && tracks[0].cover)}">${tracks[0] && tracks[0].cover ? '' : svg('note')}</div><h2>${esc(title)}</h2><p>${tracks.length} songs</p></div>
      <div class="btn-row"><button class="btn primary" id="pAll">${svg('play')}Play</button><button class="btn" id="pShuf">${svg('shuffle', 'st')}Shuffle</button></div><div id="dl"></div>`;
    $('#back', page).onclick = pop;
    $('#pAll', page).onclick = () => tracks.length ? playList(tracks, 0) : toast('No songs yet');
    $('#pShuf', page).onclick = () => tracks.length ? playList(tracks, 0, { shuffleFirst: true }) : toast('No songs yet');
    if (pl) {
      const bar = document.createElement('div'); bar.className = 'btn-row'; bar.style.marginTop = '0';
      bar.innerHTML = `<button class="btn" id="ren">${svg('edit')}Rename</button><button class="btn" id="del" style="color:#ff3b30">${svg('trash')}Delete</button>`;
      page.insertBefore(bar, $('#dl', page));
      $('#ren', bar).onclick = () => askName('Rename Playlist', pl.name, (n) => { pl.name = n; lib.save(); render(); });
      $('#del', bar).onclick = () => {
        const list = [{ icon: 'trash', danger: true, label: 'Delete “' + pl.name + '”', run: () => { lib.playlists = lib.playlists.filter((p) => p.id !== pl.id); lib.save(); pop(); toast('Playlist deleted'); } }];
        const sh = openSheet('<h3>Delete playlist?</h3>' + actions(list)); bindActions(sh, list);
      };
    }
    const dl = $('#dl', page);
    if (!tracks.length) dl.innerHTML = '<div class="empty" style="padding:40px 20px">Nothing here yet.<br>Tap “···” on a song to add it.</div>';
    else dl.appendChild(trackList(tracks, ctx));
  }

  function push(kind, id) { view.stack.push({ scroll: views.scrollTop }); view.detail = { kind, id }; view.prevName = view.name; view.name = 'detail'; render(true); }
  function pop() { view.name = 'library'; view.detail = null; render(); }

  function render(top = false) {
    const page = document.createElement('div'); page.className = 'page';
    ({ home: viewHome, search: viewSearch, library: viewLibrary, detail: viewDetail })[view.name](page);
    views.innerHTML = ''; views.appendChild(page);
    if (top) views.scrollTop = 0;
    document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === (view.name === 'detail' ? 'library' : view.name)));
    highlightPlaying();
  }

  const TAB_ICONS = { home: ['home', 'fillable'], search: ['search', ''], library: ['lib', ''] };
  document.querySelectorAll('#tabbar button').forEach((b) => {
    const [ic, cls] = TAB_ICONS[b.dataset.tab];
    $('.ti', b).innerHTML = svg(ic, cls);
    b.onclick = () => {
      const same = view.name === b.dataset.tab;
      view.name = b.dataset.tab; view.detail = null;
      if (same) views.scrollTo({ top: 0, behavior: 'smooth' }); else render(true);
    };
  });

  /* ---------------- boot ---------------- */
  refreshToggles(); syncPlayState(); render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
