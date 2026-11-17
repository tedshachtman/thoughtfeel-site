// Waystone, the first morning: the ripe line.
// Three wisps are the three variables of the way. mid tastes. Everything behind lo is ripe; lo stands on the first plot not yet known.
// hi stands on the first plot known to be green (or the stump past the end); everything after it is green too.
// The way taught is finding a boundary by halving (binary search). The player's code is run by py.js.
(() => {
  const $ = (id) => document.getElementById(id);
  const cv = $('c'), cx = cv.getContext('2d');
  const V = '7';
  const IMG = {}, names = Object.keys(META);
  let loaded = 0, ready = false;
  for (const n of names) { const i = new Image(); i.onload = () => { if (++loaded === names.length) start(); }; i.src = 'a/' + n + '.png?v=' + V; IMG[n] = i; }

  let seed = 20261118;
  const sr = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ---------- sound: a few synthesized notes, no files ----------
  let AC = null;
  const tone = (f, d = .15, type = 'sine', vol = .08, to = 0, when = 0) => { if (!AC) return; const t = AC.currentTime + when, o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0005, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .03); };
  const SFX = {
    bell: () => { tone(660, 1.6, 'sine', .09); tone(1320, 1.1, 'sine', .04); tone(1980, .7, 'sine', .02); },
    ripe: () => tone(880, .12, 'triangle', .07, 1320), green: () => tone(620, .14, 'triangle', .07, 440),
    hop: () => tone(520, .08, 'triangle', .05, 700), bad: () => tone(170, .22, 'sawtooth', .04, 120),
    come: () => { tone(660, .2, 'sine', .07, 990); tone(990, .3, 'sine', .05, 1320, .12); },
    moth: () => { tone(90, .9, 'sine', .12, 40); tone(140, .7, 'sawtooth', .025, 60); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .34, 'triangle', .07, 0, i * .11)),
    tick: () => tone(1500, .02, 'square', .012),
    cut: () => tone(rnd(300, 380), .05, 'sawtooth', .02, 180),
    hum: (p) => tone(220 + p * 440, .12, 'sine', .04),
    talk: () => tone(rnd(380, 460), .035, 'square', .016),
    cricket: () => { for (let i = 0; i < 3; i++) tone(4200, .03, 'sine', .012, 0, i * .07); },
    bird: () => { const f = rnd(2200, 3200); tone(f, .09, 'sine', .022, f * 1.25); tone(f * 1.1, .08, 'sine', .018, f * .9, .13); },
  };

  // ---------- the map ----------
  const TW = 48, TH = 34, TS = 16, WW = TW * TS, WH = TH * TS;
  const map = Array.from({ length: TH }, () => Array(TW).fill('g'));
  const rect = (c, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (map[y] && x >= 0 && x < TW) map[y][x] = c; };
  const blob = (c, cx0, cy0, rx, ry) => { for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const dx = (x + .5 - cx0) / rx, dy = (y + .5 - cy0) / ry; if (dx * dx + dy * dy < 1) map[y][x] = c; } };
  rect('p', 0, 17, 47, 18); rect('p', 8, 15, 9, 16); rect('p', 23, 19, 24, 21); rect('p', 34, 12, 35, 16);
  blob('w', 3.5, 26.5, 4.2, 6); blob('w', 42, 4.5, 4.4, 3.2);
  rect('s', 11, 23, 37, 29); rect('s', 30, 10, 39, 11); blob('w', 27.9, 10.7, 1.9, 2.1);
  const tile = (tx, ty) => map[clamp(ty, 0, TH - 1)][clamp(tx, 0, TW - 1)];
  const tileAt = (x, y) => tile(Math.floor(x / TS), Math.floor(y / TS));

  let ground, kind, glints = [];
  const buildGround = () => {
    const texData = {};
    for (const k of ['grass', 'dirt', 'water', 'soil']) { const im = IMG['tex_' + k], c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); texData[k] = { d: g.getImageData(0, 0, im.width, im.height).data, w: im.width, h: im.height }; }
    const tex = (k, x, y) => { const t = texData[k]; let u = x % (t.w * 2), v = y % (t.h * 2); if (u >= t.w) u = t.w * 2 - 1 - u; if (v >= t.h) v = t.h * 2 - 1 - v; const i = (v * t.w + u) * 4; return [t.d[i], t.d[i + 1], t.d[i + 2]]; };
    const R = 6;
    const inside = (c, x, y) => {   // is this pixel part of terrain c: the tile, with rounded outer corners and a ragged edge
      const X = x + (hash(y >> 1, 7) % 3) - 1, Y = y + (hash(x >> 1, 91) % 3) - 1, tx = X >> 4, ty = Y >> 4;
      if (tile(tx, ty) !== c) return false;
      const lx = X & 15, ly = Y & 15, L = tile(tx - 1, ty) !== c, Rr = tile(tx + 1, ty) !== c, U = tile(tx, ty - 1) !== c, D = tile(tx, ty + 1) !== c;
      const cut = (dx, dy) => (R - dx - .5) ** 2 + (R - dy - .5) ** 2 > R * R;
      if (L && U && lx < R && ly < R && cut(lx, ly)) return false;
      if (Rr && U && lx > 15 - R && ly < R && cut(15 - lx, ly)) return false;
      if (L && D && lx < R && ly > 15 - R && cut(lx, 15 - ly)) return false;
      if (Rr && D && lx > 15 - R && ly > 15 - R && cut(15 - lx, 15 - ly)) return false;
      return true;
    };
    kind = new Uint8Array(WW * WH);   // 0 grass, 1 path, 2 soil, 3 water
    const CODE = { p: 1, s: 2, w: 3 };
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { let k = 0; for (const c of ['w', 's', 'p']) if (inside(c, x, y)) { k = CODE[c]; break; } kind[y * WW + x] = k; }
    const depth = new Uint8Array(WW * WH), other = new Uint8Array(WW * WH);   // how many pixels from a different terrain, and which
    for (let pass = 1; pass <= 4; pass++) for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const i = y * WW + x; if (depth[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= WW || ny >= WH) continue; const j = ny * WW + nx;
        if (pass === 1 ? kind[j] !== kind[i] : (depth[j] === pass - 1 && kind[j] === kind[i])) { depth[i] = pass; other[i] = pass === 1 ? kind[j] : other[j]; break; }
      }
    }
    ground = document.createElement('canvas'); ground.width = WW; ground.height = WH;
    const g = ground.getContext('2d'), id = g.createImageData(WW, WH), o = id.data, KN = ['grass', 'dirt', 'soil', 'water'];
    for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) {
      const i = y * WW + x, k = kind[i], d = depth[i]; let [r, gg, b] = tex(KN[k], x, y);
      const mul = (a, c, e) => { r *= a; gg *= c; b *= e; }, mix = (R2, G2, B2, t) => { r += (R2 - r) * t; gg += (G2 - gg) * t; b += (B2 - b) * t; };
      if (k === 0) {
        // Broad patches of sun and cool grass cross the tile seams.
        const meadow = Math.sin(x * .034 + Math.sin(y * .04)) + Math.sin(y * .051 + x * .014);
        if (meadow > .8) mix(194, 184, 105, .24);
        else if (meadow < -.65) mix(58, 120, 102, .25);
        if (d === 1) { if (other[i] === 3) mix(120, 96, 52, .8); else mul(.62, .78, .5); } else if (d === 2 && other[i] === 3) mix(150, 126, 70, .75); else if (d === 2 && hash(x, y) % 3) mul(.86, .92, .8); }
      else if (k === 1) { if (d === 1) mul(.78, .66, .5); else if (d === 2 && hash(x, y) % 2) mul(.93, .88, .8); }
      else if (k === 2) { if (d === 1) mul(.66, .62, .58); else if (d === 2) mul(.86, .84, .82); }
      else { if (d === 1) mul(.5, .62, .8); else if (d === 2) mix(214, 240, 255, .62); else if (d === 3 && hash(x >> 1, y) % 3 === 0) mix(190, 230, 255, .4); if (!d && hash(x >> 2, y) % 53 === 0) glints.push({ x, y, ph: (hash(x, y) % 628) / 100, sp: .6 + (hash(y, x) % 100) / 100, w: 2 + hash(x, x) % 3 }); }
      const p = i * 4; o[p] = r; o[p + 1] = gg; o[p + 2] = b; o[p + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    // small flat decorations, drawn into the ground
    const open = (tx, ty, c) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => tile(tx + a, ty + b) === c);
    for (let ty = 0; ty < TH; ty++) for (let tx = 0; tx < TW; tx++) {
      const r = sr();
      if (open(tx, ty, 'g')) { const pickN = r < .16 ? ['t1', 't2', 't3'][Math.floor(sr() * 3)] : r < .24 ? ['f_w', 'f_y', 'f_p', 'f_b'][Math.floor(sr() * 4)] : r < .27 ? 'fern' : r < .29 ? 'weed' : r < .3 ? 'pebbles' : null; if (pickN) { const im = IMG[pickN]; g.drawImage(im, tx * TS + Math.floor(sr() * 8) - 4, ty * TS + 14 - im.height + Math.floor(sr() * 6)); } }
      else if (open(tx, ty, 'w') && r < .16) { const im = IMG[r < .06 ? 'lilyf' : 'lily']; g.drawImage(im, tx * TS + Math.floor(sr() * 6) - 3, ty * TS + Math.floor(sr() * 6) - 2); }
      else if (open(tx, ty, 'p') && r < .05) { const im = IMG.pebbles; g.drawImage(im, tx * TS - 3, ty * TS - 2); }
    }
    g.drawImage(IMG.stone_court, 321, 336);
    // Flower drifts follow the water and the edges of the tended plots.
    for (const [x, y, length] of [[18, 322, 75], [16, 268, 68], [193, 483, 111], [482, 481, 116], [470, 151, 70], [574, 153, 58], [246, 261, 74], [420, 330, 47]]) {
      for (let offset = 0; offset < length; offset += 13) {
        const h = hash(x + offset, y);
        g.drawImage(IMG['border_' + (h % 2)], x + offset, y - 18 + h % 6);
      }
    }
    // Gravel exposed along the lane and ribbons of current under the lilies.
    for (let y = 0; y < WH; y += 2) for (let x = 0; x < WW; x += 4) {
      const h = hash(x + 311, y), k = kind[y * WW + x];
      if (k === 1 && h % 31 === 0) {
        g.fillStyle = '#bd9579'; g.fillRect(x, y, 3, 2);
        g.fillStyle = '#e5cb9e'; g.fillRect(x + 1, y, 2, 1);
      } else if (k === 3 && depth[y * WW + x] === 0 && h % 17 === 0) {
        g.fillStyle = '#88c6c118'; g.fillRect(x, y, 7 + h % 12, 2);
      }
    }
    glints = glints.slice(0, 400);
  };


  const paintShadows = () => {
    const g = ground.getContext('2d');
    g.fillStyle = 'rgba(35,58,72,.19)';
    for (const obj of [...things, ...scenery]) {
      const im = IMG[obj.n];
      const w = im.width, h = im.height;
      if (w < 23 || obj.n === 'stone_court') continue;
      // Project the silhouette onto the ground in the morning light.
      g.save();
      g.translate(obj.x, obj.y + 1);
      g.transform(1, 0, -.41, .22, 0, 0);
      const mask = document.createElement('canvas');
      mask.width = w; mask.height = h;
      const m = mask.getContext('2d'); m.drawImage(im, 0, 0);
      m.globalCompositeOperation = 'source-in';
      m.fillStyle = 'rgba(43,54,77,.24)'; m.fillRect(0, 0, w, h);
      g.drawImage(mask, -w / 2, -h);
      g.restore();
    }
  };

  // ---------- things ----------
  const things = [];
  const T = (n, x, y, o = {}) => { const t = { n, x, y, hw: o.hw ?? Math.round(META[n].w * .3), d: o.d ?? 7, ...o }; things.push(t); return t; };
  const cottage = T('cottage', 140, 262, { hw: 62, d: 44 });
  [352, 400, 448, 496, 544].forEach((x, i) => T('apple', x, 92 + (i % 2) * 4, { sway: 1, hw: 5, d: 5, ph: i * 1.7 }));
  T('well', 240, 262, { hw: 13, d: 12 });
  const lamp = T('lantern', 350, 352, { hw: 2, d: 3 });
  const stone = T('way', 384, 364, { hw: 9, d: 6 });
  T('barrel', 52, 262, { hw: 9, d: 6 }); T('bench', 296, 332, { hw: 16, d: 7 }); T('cart', 650, 262, { hw: 13, d: 9 });
  T('sign', 340, 322, { hw: 4, d: 4 }); T('scarecrow', 622, 380, { hw: 5, d: 4 });
  for (const [x, y] of [[20, 258], [700, 262], [326, 200], [470, 334], [690, 430]]) T('bush', x, y, { hw: 10, d: 7 });
  for (const [x, y] of [[134, 372], [150, 440], [120, 500], [70, 340]]) T('reeds', x, y, { hw: 0, d: 0, soft: true, sway: 1 });
  T('stump', 680, 330, { hw: 9, d: 7 }); T('mushroom', 30, 180, { hw: 0, d: 0, soft: true });
  const forest = () => {
    for (let n = 0; n < 900 && things.length < 95; n++) {
      const x = 12 + sr() * (WW - 24), y = 40 + sr() * (WH - 44);
      const far = y < 74 || (x > 650 && y < 250) || (x < 70 && y < 250) || (y > 500 && (x < 150 || x > 650)) || (x > 660 && y > 330 && y < 400);
      if (!far) continue;
      let ok = true;
      for (let a = -1; a <= 1 && ok; a++) for (let b = -1; b <= 1; b++) if (tileAt(x + a * 14, y - 4 + b * 12) !== 'g') { ok = false; break; }
      if (!ok) continue;
      for (const t of things) if (Math.abs(t.x - x) < (t.n === 'cottage' ? 100 : 30) && Math.abs(t.y - y) < (t.n === 'cottage' ? 150 : 22)) { ok = false; break; }
      if (ok) T(sr() < .78 ? 'pine' : 'apple0', Math.round(x), Math.round(y), { sway: 1, hw: 5, d: 5, ph: sr() * 6 });
    }
  };

  // Scenery is sorted with the actors, independently of navigation and forest placement.
  const scenery = [
    ['willow', 423, 163], ['willow', 109, 385], ['willow', 49, 494],
    ['stall', 302, 259], ['hedge_fence', 65, 267], ['hedge_fence', 556, 268],
    ['hedge_fence', 265, 325], ['hedge_fence', 498, 324],
    ['hedge_fence', 206, 480], ['hedge_fence', 568, 480],
    ['duck', 451, 179], ['duck', 438, 187], ['lantern_cord', 385, 320],
  ].map(([n, x, y]) => ({ n, x, y }));

  // ---------- beds of wheat. known: 0 under dew, 1 ripe, 2 green, 3 cut. lo and hi are where those two wisps stand. ----------
  const mkBed = (x0, y, n, line) => ({ x0, y, n, line, known: new Array(n).fill(0), lo: 0, hi: n, mid: -1, nums: false });
  const topRow = mkBed(200, 392, 24, 9);
  const rows = [mkBed(200, 414, 24, 15), mkBed(200, 436, 24, 6), mkBed(200, 458, 24, 20)];
  const pbed = mkBed(504, 186, 8, 5);
  const beds = [pbed, topRow, ...rows];
  const px = (b, i) => b.x0 + i * 16;
  const resetBed = (b) => { b.known.fill(0); b.lo = 0; b.hi = b.n; b.mid = -1; b.wrong = null; b.lineAt = undefined; };
  const WEN = rows.reduce((s, b) => s + Math.min(b.line + 1, b.n), 0);
  let ab = null;   // the bed the three wisps are working on

  const solidAt = (x, y, self) => {
    if (x < 5 || y < 24 || x > WW - 5 || y > WH - 2) return true;
    if (tileAt(x, y) === 'w' || tileAt(x - 3, y) === 'w' || tileAt(x + 3, y) === 'w') return true;
    for (const t of things) if (!t.soft && x > t.x - t.hw - 3 && x < t.x + t.hw + 3 && y > t.y - t.d - 1 && y < t.y + 2) return true;
    for (const b of beds) if (x > b.x0 - 12 && x < b.x0 + b.n * 16 + 8 && Math.abs(y - b.y + 2) < 5) return true;
    for (const p of people) if (p !== self && !p.ghost && Math.hypot(p.x - x, (p.y - y) * 1.4) < 7) return true;
    return false;
  };

  // ---------- people ----------
  const P = (n, x, y, o = {}) => ({ n, x, y, dir: 0, moving: false, t: 0, speed: 30, route: [], act: null, ...o });
  const you = P('you', 384, 378, { speed: 62, name: 'You', face: 'p_you', dir: 3 });
  const tobiah = P('tobiah', 414, 350, { name: 'Tobiah', face: 'p_tobiah', speed: 46 });
  const yusra = P('yusra', 462, 348, { name: 'Yusra', face: 'p_yusra', speed: 46 });
  const goat = P('goat', 356, 376, { name: 'Remainder', face: 'p_goat', speed: 46, ghost: true });
  const people = [you, tobiah, yusra, goat];
  // villagers: one standing picture each, and one cheering
  const F = (n, x, y, name) => ({ n, x, y, name2: name, hop: 0, cheer: false, vis: true });
  const mum = Object.assign(F('mum', 352, 348), { name: 'Mum', face: 'p_mum' });
  const folk = [mum, F('reaper_m', 326, 344), F('reaper_f', 444, 344), F('girl', 424, 356), F('elder', 304, 350), F('baker', 486, 352), F('farmer', 282, 344)];
  const boy = Object.assign(F('boy', 790, 292), { name: 'A boy from Harrow', face: 'p_boy', vis: false }); folk.push(boy);
  const NARR = { name: '' };
  const play = (p, from, to, fps = 7, times = 1) => { p.act = { from, to, t: 0, fps, times }; p.moving = false; };
  const step = (p, dx, dy, dt) => {
    const L = Math.hypot(dx, dy); if (L < .01) { p.moving = false; return false; }
    const vx = dx / L * p.speed * dt, vy = dy / L * p.speed * dt * .85; let moved = false;
    if (!solidAt(p.x + vx, p.y, p)) { p.x += vx; moved = moved || Math.abs(vx) > .001; }
    if (!solidAt(p.x, p.y + vy, p)) { p.y += vy; moved = moved || Math.abs(vy) > .001; }
    p.dir = Math.abs(dx) > Math.abs(dy) * 1.1 ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    p.moving = moved; if (moved) { p.t += dt; p.act = null; }
    return moved;
  };
  const faceTo = (p, q) => { const dx = q.x - p.x, dy = q.y - p.y; p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); };

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ---------- small promises the story is written with ----------
  let now = 0, last = 0; const waits = [];
  const until = (f) => new Promise((res) => waits.push({ f, res }));
  const sleep = (s) => { const t = now + s; return until(() => now >= t); };
  const fade = async (dark, s = 1.4) => { $('fade').style.transitionDuration = s + 's'; $('fade').style.opacity = dark ? 1 : 0; await sleep(s); };

  // ---------- talking ----------
  let talking = null, lines = [], li = 0, typed = 0, typeT = 0, talkRes = null, choices = null;
  const portrait = (who) => {
    const f = $('face').getContext('2d'); f.imageSmoothingEnabled = false; f.clearRect(0, 0, 66, 66); if (!who.face) return; const im = IMG[who.face];
    if (im.width < 40) f.drawImage(im, 0, 0, im.width, 22, Math.round((66 - im.width * 3) / 2), 0, im.width * 3, 66); else f.drawImage(im, Math.round((66 - im.width) / 2), 66 - im.height);
  };
  const openTalk = (who, isNote) => { $('talk').hidden = false; $('talk').classList.toggle('note', isNote); $('talk').classList.toggle('narr', !who.face); $('tname').textContent = who.name; $('tchoices').innerHTML = ''; portrait(who); };
  const say = (who, ls, ch) => new Promise((res) => {
    talking = who; lines = ls; li = 0; typed = 0; talkRes = res; choices = ch || null;
    if (who.dir !== undefined && who !== you) { faceTo(who, you); who.moving = false; who.act = null; faceTo(you, who); }
    you.moving = false; target = null; pending = null; for (const k in keys) keys[k] = false;
    openTalk(who, false); $('ttext').textContent = ''; $('tmore').style.display = '';
  });
  const showChoices = () => { $('tmore').style.display = 'none'; const box = $('tchoices'); if (box.children.length) return; choices.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c; if (!i) b.className = 'main'; b.addEventListener('click', (e) => { e.stopPropagation(); const r = talkRes; talking = null; talkRes = null; choices = null; $('talk').hidden = true; r(i); }); box.appendChild(b); }); };
  const nextLine = () => {
    if (!talking) return;
    if (typed < lines[li].length) { typed = lines[li].length; $('ttext').textContent = lines[li]; if (choices && li === lines.length - 1) showChoices(); return; }
    if (li === lines.length - 1) { if (choices) return; const r = talkRes; talking = null; talkRes = null; $('talk').hidden = true; r(); return; }
    li++; typed = 0; $('ttext').textContent = '';
  };
  const note = (who, text) => { openTalk(who, true); $('ttext').textContent = text; };
  const noteOff = () => { if (!talking) $('talk').hidden = true; };
  const goal = (s) => { $('goal').textContent = s; };

  // ---------- wisps ----------
  const wisps = [], W = { mid: null, lo: null, hi: null };
  const NAME = { mid: 'Mid', lo: 'Lo', hi: 'Hi' }, GLOWC = { mid: '255,214,120', lo: '120,180,255', hi: '255,130,120' };
  const mkWisp = (kind, x, y) => { const w = { kind, x, y, ph: rnd(0, 6), happy: 0, fly: null, dim: 0 }; wisps.push(w); W[kind] = w; return w; };
  const flyTo = (w, x, y, speed = 150) => new Promise((res) => { w.fly = { x, y, speed, res }; });
  const sparks = [], puff = (x, y, n = 8, green = false) => { for (let k = 0; k < n; k++) sparks.push({ x: x + rnd(-5, 5), y: y + rnd(-6, 2), vx: rnd(-14, 14), vy: rnd(-34, -8), t: 0, life: rnd(.4, .9), green }); };
  const reveal = (b, i, real) => { if (real) light = Math.max(0, light - 1); b.known[i] = i < b.line ? 1 : 2; puff(px(b, i), b.y - 14, 6, i >= b.line); (i < b.line ? SFX.ripe : SFX.green)(); };
  const bubs = [];
  const bubble = (w, text, secs = 1.5) => { for (let i = bubs.length - 1; i >= 0; i--) if (bubs[i].w === w) { bubs[i].el.remove(); bubs.splice(i, 1); } const el = document.createElement('div'); el.className = 'bub ' + w.kind; el.textContent = text; $('bubs').appendChild(el); bubs.push({ w, el, until: now + secs }); };
  const seatOf = (w) => { const b = ab, i = b[w.kind], same = b.lo === b.hi; return { x: px(b, i) + (same ? (w.kind === 'lo' ? -5 : 5) : 0), y: b.y - 30 }; };

  // ---------- input ----------
  const keys = {}; let target = null, pending = null, mode = 'locked', req = null, held = null, mouse = { x: -99, y: -99 };
  const KEYMAP = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' };
  addEventListener('keydown', (e) => {
    if (e.target === $('src')) return;
    if (meanReq && !talking) { if (e.key === ' ') holding = true; e.preventDefault(); return; }
    if (talking) { if (e.key === ' ' || e.key === 'Enter' || e.key === 'e') nextLine(); e.preventDefault(); return; }
    if (mode !== 'walk') return;
    const k = KEYMAP[e.key]; if (k) { keys[k] = true; target = null; pending = null; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'e' || e.key === 'Enter') { const n = nearest(30); if (n) use(n); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => { if (e.key === ' ') holding = false; const k = KEYMAP[e.key]; if (k) keys[k] = false; });
  addEventListener('pointerup', () => { holding = false; });
  const wpos = (e) => { const r = cv.getBoundingClientRect(); return { x: cam.x + (e.clientX - r.left) / r.width * view.w, y: cam.y + (e.clientY - r.top) / r.height * view.h }; };
  const plotAt = (b, w) => { if (w.y < b.y - 34 || w.y > b.y + 14) return -1; const i = Math.round((w.x - b.x0) / 16); return i >= 0 && i < b.n ? i : -1; };
  const wispAt = (w) => { let best = null, bd = 15; for (const k of ['lo', 'hi']) { const q = W[k]; if (!q) continue; const d = Math.hypot(q.x - w.x, q.y - 10 - w.y); if (d < bd) { bd = d; best = q; } } return best; };
  const plant = (w) => { const b = req.bed, index = clamp(Math.round((w.x - b.x0) / 16), 0, b.n), r = req, who = held.w.kind; held = null; req = null; r.resolve({ who, index }); };
  cv.addEventListener('pointerdown', (e) => {
    if (talking) { nextLine(); return; }
    if (meanReq) { holding = true; return; }
    const w = wpos(e); mouse = w;
    if (req) {
      if (req.kind === 'plot') { const i = plotAt(req.bed, w); if (i >= 0) { const r = req; req = null; r.resolve(i); } }
      else if (held) plant(w);
      else { const q = wispAt(w); if (q) { held = { w: q, down: w.x, moved: false }; q.fly = null; SFX.hop(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* synthetic events have no pointer */ } } }
      return;
    }
    if (mode !== 'walk') return;
    const hit = pick(w.x, w.y);
    if (hit) { pending = hit; target = { x: hit.x + (you.x < hit.x ? -14 : 14), y: hit.y + (hit.dir === undefined ? 10 : (you.y < hit.y ? -6 : 6)), since: 0 }; if (dist(you, hit) < 28) { use(hit); pending = null; target = null; } }
    else { pending = null; target = { x: w.x, y: w.y, since: 0 }; }
  });
  cv.addEventListener('pointermove', (e) => { mouse = wpos(e); if (held && Math.abs(mouse.x - held.down) > 6) held.moved = true; });
  cv.addEventListener('pointerup', (e) => { if (held && held.moved && req) plant(wpos(e)); });
  $('talk').addEventListener('click', () => nextLine());
  const askPlot = (bed) => new Promise((resolve) => { held = null; req = { kind: 'plot', bed, resolve }; });
  const askWisp = (bed) => new Promise((resolve) => { held = null; req = { kind: 'wisp', bed, resolve }; });
  const usable = () => [stone, tobiah, yusra, goat, mum].filter((o) => o.onUse);
  const pick = (wx, wy) => { let best = null, bd = 1e9; for (const o of usable()) { if (wx > o.x - 12 && wx < o.x + 12 && wy > o.y - 36 && wy < o.y + 6) { const d = Math.abs(wx - o.x); if (d < bd) { bd = d; best = o; } } } return best; };
  const nearest = (r) => { let b = null, bd = r; for (const o of usable()) { const d = dist(you, o); if (d < bd) { bd = d; b = o; } } return b; };
  const use = (o) => { if (o.dir !== undefined) faceTo(you, o); const f = o.onUse; if (f) f(); };
  const used = (o) => new Promise((res) => { o.onUse = () => { o.onUse = null; res(); }; });

  // ---------- meaning it: the player holds, a light fills, and a wisp comes ----------
  let meanReq = null, holding = false;
  const meanIt = (at) => new Promise((res) => { holding = false; meanReq = { at, p: 0, res, hum: 0 }; goal('Hold Space, or hold the mouse button, and mean it.'); });

  // ---------- the slate ----------
  const src = $('src');
  const TEMPLATE = 'def ripe_line(row):\n    lo = 0\n    hi = len(row)\n    while lo < hi:\n        mid = ?\n        if ripe(row[mid]):\n            lo = ?\n        else:\n            hi = ?\n    return lo\n';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const gutter = () => {
    const n = src.value.split('\n').length; let s = ''; for (let i = 1; i <= n; i++) s += i + '\n'; $('gutter').textContent = s;
    $('paint').innerHTML = esc(src.value).replace(/\b(lo|hi|mid)\b|(\?)|\b(def|while|if|else|elif|return)\b/g, (m, v, q, k) => v ? `<span class="${v}">${v}</span>` : q ? '<span class="q">?</span>' : `<span class="kw">${k}</span>`) + '\n';
    const t = `translate(${-src.scrollLeft}px, ${-src.scrollTop}px)`; $('paint').style.transform = t; $('gutter').style.transform = `translateY(${-src.scrollTop}px)`;
  };
  const lh = () => parseFloat(getComputedStyle(src).lineHeight);
  const hl = (line, bad = false) => { const e = $('hl'); e.classList.toggle('bad', bad); e.style.top = line ? (8 + (line - 1) * lh() - src.scrollTop) + 'px' : '-60px'; };
  let slateFace = null;
  const drawSlateFace = () => {
    if (!slateFace) return;
    const { kind, mood, since } = slateFace;
    const elapsed = now - since;
    const expression = elapsed < 2 && Math.sin(elapsed * 11) > .2 ? '_talk' : mood;
    if (slateFace.shown === expression) return;
    slateFace.shown = expression;
    const f = $('wface').getContext('2d'), im = IMG['p_' + kind + expression];
    f.clearRect(0, 0, 64, 64); f.drawImage(im, Math.floor((64 - im.width) / 2), Math.floor((64 - im.height) / 2));
  };
  const wsay = (kind, s, happy = false) => {
    $('wname').textContent = NAME[kind]; $('wname').className = kind; $('wtext').textContent = s;
    slateFace = { kind, mood: happy ? '_h' : s.includes('?') ? '_puzzle' : '', since: now };
    drawSlateFace();
  };
  const lineOf = (re) => { const m = re.exec(src.value); return m ? src.value.slice(0, m.index).split('\n').length : 0; };
  const RE = { mid: /^(\s*)mid\s*=.*$/m, lo: /^( {5,})lo\s*=.*$/m, hi: /^( {5,})hi\s*=.*$/m };
  const writeLine = (name, expr) => { if (!RE[name].test(src.value)) return; src.value = src.value.replace(RE[name], '$1' + name + ' = ' + expr); gutter(); hl(lineOf(RE[name])); SFX.tick(); };
  src.addEventListener('input', () => { gutter(); hl(0); $('bind').hidden = true; });
  src.addEventListener('scroll', gutter);
  src.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = src.selectionStart; src.value = src.value.slice(0, s) + '    ' + src.value.slice(src.selectionEnd); src.selectionStart = src.selectionEnd = s + 4; gutter(); } });

  // ---------- view ----------
  const view = { w: 320, h: 200, z: 3 }, cam = { x: 0, y: 0, fx: 0, fy: 0 };
  let casting = false, frozen = false, focus = null, night = 0, nightTo = null;
  const fit = () => {
    const w = innerWidth, h = innerHeight - (casting ? $('slate').offsetHeight : 0);
    let z = clamp(Math.round(Math.sqrt(w * h / 60000)), 2, 6);
    while (z > 2 && (w / z < 150 || h / z < 120)) z--;
    while (casting && z > 1 && (w / z < 412 || h / z < 170)) z--;
    // Fit both end posts even when the display is narrower than the full row.
    if (casting && w < 412) z = w / 412;
    if (!casting && w / z < 224) z = w / 224;
    view.z = z; view.w = Math.min(WW, Math.ceil(w / z)); view.h = Math.min(WH, Math.ceil(h / z));
    cv.width = view.w; cv.height = view.h; cv.style.width = view.w * z + 'px'; cv.style.height = view.h * z + 'px';
  };
  addEventListener('resize', fit);

  // ---------- light ----------
  let light = 100, lightTo = null, tally = null, dew = 100, dewRun = false, dewShown = false;
  const hud = () => { $('light').hidden = night > .8; $('dew').hidden = !dewShown; $('dew').textContent = 'Dew ' + Math.round(dew) + '%'; $('light').textContent = 'Daylight ' + Math.round(light) + '%'; const a = $('asks'); a.hidden = tally === null; if (tally !== null) a.textContent = tally; };

  // ---------- ambient ----------
  const smoke = [], bfly = [];
  for (let i = 0; i < 9; i++) bfly.push({ x: rnd(60, 700), y: rnd(120, 360), tx: rnd(60, 700), ty: rnd(120, 360), ph: rnd(0, 6), c: ['#fff3c4', '#ffb3c8', '#bfe3ff', '#ffd76a'][i % 4] });
  const moth = { x: 520, y: 200, vis: false, fly: null };

  const update = (dt) => {
    now += dt;
    for (let i = waits.length - 1; i >= 0; i--) if (waits[i].f()) { const w = waits.splice(i, 1)[0]; w.res(); }
    if (dewRun && !frozen) dew = Math.max(20, dew - dt * 80 / 300);
    if (lightTo !== null) { light += (lightTo - light) * Math.min(1, dt * 1.2); if (Math.abs(lightTo - light) < .4) { light = lightTo; lightTo = null; } }
    if (nightTo !== null) { night += (nightTo - night) * Math.min(1, dt * 1.1); if (Math.abs(nightTo - night) < .01) { night = nightTo; nightTo = null; } }
    hud();
    if (meanReq) { const m = meanReq; m.p = clamp(m.p + (holding ? dt / 1.5 : -dt * .9), 0, 1); m.hum -= dt; if (holding && m.hum <= 0) { m.hum = .14; SFX.hum(m.p); } if (m.p >= 1) { meanReq = null; holding = false; goal(''); m.res(); } }
    if (AC && !frozen && Math.random() < dt * (night > .5 ? 1.1 : .35)) (night > .5 ? SFX.cricket : SFX.bird)();
    const glide = (w, tx, ty, sp) => { const dx = tx - w.x, dy = ty - w.y, L = Math.hypot(dx, dy), s = sp * dt; if (L <= s) { w.x = tx; w.y = ty; return true; } w.x += dx / L * s; w.y += dy / L * s; return false; };
    for (const w of wisps) {
      if (w.happy > 0) w.happy -= dt;
      if (w.fly) { if (glide(w, w.fly.x, w.fly.y, w.fly.speed)) { const r = w.fly.res; w.fly = null; r(); } else if (Math.random() < dt * 30) sparks.push({ x: w.x, y: w.y - 8, vx: rnd(-4, 4), vy: rnd(-4, 6), t: 0, life: .45 }); }
      else if (held && held.w === w) { w.x = mouse.x; w.y = mouse.y + 10; }
      else if (ab && w.kind !== 'mid') { const s = seatOf(w); glide(w, s.x, s.y, 240); }
      else if (!ab && w.follow) { const ox = w.kind === 'mid' ? 4 : w.kind === 'lo' ? -15 : 19; glide(w, you.x + ox, you.y - (w.kind === 'mid' ? 34 : 42), 60 + dist(w, you) * 2); }
    }
    for (const m of [moth, ...folk]) if (m.fly) { if (glide(m, m.fly.x, m.fly.y, m.fly.speed)) { const r = m.fly.res; m.fly = null; r(); } }
    for (const f of folk) if (f.hop > 0) f.hop -= dt;
    for (const s of sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 26 * dt; }
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t > sparks[i].life) sparks.splice(i, 1);
    if (!frozen) {
      if (!talking && mode === 'walk') {
        let dx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), dy = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
        if (!dx && !dy && target) { dx = target.x - you.x; dy = target.y - you.y; if (Math.hypot(dx, dy) < 3) { dx = dy = 0; target = null; if (pending) { if (dist(you, pending) < 32) use(pending); pending = null; } } }
        const moved = step(you, dx, dy, dt);
        if (target) { target.since = moved ? 0 : target.since + dt; if (target.since > .35) { if (pending && dist(you, pending) < 40) use(pending); target = null; pending = null; you.moving = false; } }
        if (!dx && !dy) you.moving = false;
      } else you.moving = false;
      for (const p of people) if (p.act) { p.act.t += dt; const n = p.act.to - p.act.from + 1; if (p.act.t * p.act.fps >= n * p.act.times) p.act = null; }
      for (const p of [tobiah, yusra]) {
        if (talking === p) continue;
        if (p.route.length) {
          const [tx, ty] = p.route[0];
          if (Math.hypot(tx - p.x, ty - p.y) < 3) { p.route.shift(); p.moving = false; p.stuck = 0; if (!p.route.length) faceTo(p, you); continue; }
          if (!step(p, tx - p.x, ty - p.y, dt)) { p.stuck = (p.stuck || 0) + dt; if (p.stuck > 1) { p.x = tx; p.y = ty; p.stuck = 0; } } else p.stuck = 0;
        } else { p.moving = false; if (p.weeds && !p.act) { p.idle = (p.idle || 0) + dt; if (p.idle > 2.5) { p.idle = 0; p.dir = 0; play(p, 0, 11, 6); } } }
      }
      if (talking !== goat && !goat.stay) {
        const d = dist(goat, you);
        if (d > 30) { step(goat, you.x - goat.x, you.y + 4 - goat.y, dt); goat.idle = 0; }
        else { goat.moving = false; goat.idle = (goat.idle || 0) + dt; if (!goat.act && goat.idle > 2.2) { goat.idle = 0; if (goat.dir === 0 || goat.dir === 3) goat.dir = Math.random() < .5 ? 1 : 2; if (Math.random() < .5) play(goat, 0, 7, 9); else play(goat, 8, 15, 5, 2); } }
      }
      if (Math.random() < dt * 2.4) smoke.push({ x: CHIM[0] + rnd(-1, 1), y: 0, t: 0, life: rnd(3, 4.5), dx: rnd(2, 6), r: rnd(1.5, 2.8) });
      for (const s of smoke) { s.t += dt; s.y -= dt * 8; s.x += dt * s.dx; }
      while (smoke.length && smoke[0].t > smoke[0].life) smoke.shift();
      for (const b of bfly) {
        if (Math.hypot(b.tx - b.x, b.ty - b.y) < 4) { b.tx = clamp(b.x + rnd(-70, 70), 20, WW - 20); b.ty = clamp(b.y + rnd(-50, 50), 60, 360); }
        const L = Math.hypot(b.tx - b.x, b.ty - b.y) || 1; b.x += (b.tx - b.x) / L * 16 * dt; b.y += (b.ty - b.y) / L * 16 * dt + Math.sin(now * 9 + b.ph) * .25;
      }
    }
    const f = focus || you, tx = clamp(f.x - view.w / 2, 0, WW - view.w), ty = clamp(f.y - (focus ? 0 : 16) - view.h / 2, 0, WH - view.h);
    const k = Math.min(1, dt * (focus ? 4 : 30)); cam.fx += (tx - cam.fx) * k; cam.fy += (ty - cam.fy) * k; cam.x = Math.round(cam.fx); cam.y = Math.round(cam.fy);
    if (talking && typed < lines[li].length) { typeT += dt; while (typeT > .016 && typed < lines[li].length) { typeT -= .016; typed++; if (typed % 3 === 0 && lines[li][typed - 1] !== ' ') SFX.talk(); } $('ttext').textContent = lines[li].slice(0, typed); if (typed >= lines[li].length && choices && li === lines.length - 1) showChoices(); }
  };

  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
  const digits = (s, x, y, col) => {
    const str = String(s), w = str.length * 4 - 1; let ox = Math.round(x - w / 2);
    cx.fillStyle = '#2a1a08'; cx.fillRect(ox - 2, y - 2, w + 4, 9); cx.fillStyle = col;
    for (const ch of str) { const g = DIG[ch]; for (let i = 0; i < 15; i++) if (g[i] === '1') cx.fillRect(ox + i % 3, y + Math.floor(i / 3), 1, 1); ox += 4; }
  };
  const drawSway = (t, im, x, y) => {
    const w = im.width, h = im.height, top = Math.floor(h * .68);
    for (let r = 0; r < top; r += 3) {
      const k = 1 - r / top, off = Math.round(Math.sin(now * 1.3 + (t.ph || 0) + r * .04) * 1.3 * k * k + Math.sin(now * .37 + t.x) * k);
      cx.drawImage(im, 0, r, w, 3, x + off, y + r, w, 3);
    }
    cx.drawImage(im, 0, top, w, h - top, x, y + top, w, h - top);
  };
  const drawPerson = (p) => {
    let sheet = p.n, f, row, flip = false;
    if (p.act) { const n = p.act.to - p.act.from + 1, k = p.act.from + Math.floor(p.act.t * p.act.fps) % n; sheet = p.n + '_act'; f = k % 4; row = Math.floor(k / 4); flip = p === goat && p.dir === 2; }
    else { row = p.dir === 2 ? 1 : p.dir; f = p.moving ? Math.floor(p.t * 7.5) % 4 : 0; flip = p.dir === 2; }
    const m = META[sheet], im = IMG[sheet];
    const x = Math.round(p.x - m.w / 2) - cam.x, y = Math.round(p.y - m.h) - cam.y + 1;
    cx.fillStyle = 'rgba(20,40,10,.3)'; cx.fillRect(Math.round(p.x) - 6 - cam.x, Math.round(p.y) - 1 - cam.y, 12, 3); cx.fillRect(Math.round(p.x) - 4 - cam.x, Math.round(p.y) - 2 - cam.y, 8, 5);
    if (flip) { cx.save(); cx.translate(x + m.w, y); cx.scale(-1, 1); cx.drawImage(im, f * m.w, row * m.h, m.w, m.h, 0, 0, m.w, m.h); cx.restore(); }
    else cx.drawImage(im, f * m.w, row * m.h, m.w, m.h, x, y, m.w, m.h);
  };
  const glow = (x, y, r, a, col = '255,190,90') => {
    const g = cx.createRadialGradient(x - cam.x, y - cam.y, 0, x - cam.x, y - cam.y, r);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); cx.fillStyle = g; cx.fillRect(x - r - cam.x, y - r - cam.y, r * 2, r * 2);
  };

  // Paint the lamps after dusk grading so their warm cores survive the blue shadows.
  const drawAtmosphere = () => {
    const dot = (x, y, w, h, col) => {
      cx.fillStyle = col;
      cx.fillRect(Math.round(x) - cam.x, Math.round(y) - cam.y, w, h);
    };
    if (night > .02) {
      cx.save();
      cx.globalAlpha = night;
      for (let i = 0; i < 5; i++) {
        const x = 340 + 23 * i, y = 287 + Math.round(7 * Math.sin((12 + i * 23) * Math.PI / 113));
        glow(x, y, 18, .48);
        dot(x - 1, y - 2, 3, 3, '#ffe6a6');
      }
      glow(stone.x, stone.y - 8, stone.n === 'way' ? 59 : 27, stone.n === 'way' ? .27 : .17, stone.n === 'way' ? '255,190,91' : '166,163,236');
      for (let i = 0; i < 78; i++) {
        const x = hash(i, 32) % WW, y = 160 + hash(i, 54) % 320;
        if (Math.sin(now * .9 + i) < .37) continue;
        dot(x + Math.sin(now + i) * 2, y + Math.cos(now * .7 + i) * 2, 1, 1, '#ffe5a1');
      }
      cx.restore();
    }
    if (stone.n === 'way_bit') {
      for (let i = 0; i < 22; i++) {
        dot(stone.x + 3 + hash(i, 33) % 16, stone.y - 3 + hash(i, 19) % 6, 1 + i % 2, 1, i % 3 ? '#9492a2' : '#d1c7bd');
      }
    }
    if (!frozen) return;
    // Indigo at the boundary gives way to a still blue light over the working field.
    const veil = cx.createRadialGradient(390 - cam.x, 422 - cam.y, 40, 390 - cam.x, 422 - cam.y, 260);
    veil.addColorStop(0, 'rgba(50,88,160,.10)');
    veil.addColorStop(.62, 'rgba(54,72,145,.27)');
    veil.addColorStop(1, 'rgba(30,26,84,.67)');
    cx.fillStyle = veil; cx.fillRect(0, 0, view.w, view.h);
    // A stationary star chart rings the field. The working row and its labels stay clear.
    const X = 390 - cam.x, Y = 427 - cam.y;
    cx.save();
    cx.strokeStyle = 'rgba(192,220,244,.48)';
    cx.lineWidth = 1;
    for (const radius of [225, 230]) {
      cx.beginPath(); cx.ellipse(X, Y, radius, radius * .34, 0, 0, 2 * Math.PI); cx.stroke();
    }
    for (let i = 0; i < 80; i++) {
      const t = i * Math.PI / 40, x = 390 + 227 * Math.cos(t), y = 427 + 77 * Math.sin(t);
      dot(x, y, i % 5 ? 1 : 3, i % 5 ? 1 : 2, '#c9e8ec');
    }
    for (let i = 0; i < 85; i++) {
      const x = 100 + hash(i, 23) % 620, y = 270 + hash(i, 61) % 245;
      if (x > 180 && x < 604 && y > 368 && y < 476) continue;
      dot(x, y, 1, 1, '#e3f9f8');
      if (i % 7 === 0) { dot(x - 2, y, 5, 1, '#bed7e7'); dot(x, y - 2, 1, 5, '#bed7e7'); }
    }
    cx.restore();
  };

  const GLY = { l: ['1', '1', '1', '1', '1'], o: ['000', '111', '101', '101', '111'], h: ['100', '100', '111', '101', '101'], i: ['1', '0', '1', '1', '1'], m: ['00000', '11111', '10101', '10101', '10101'], d: ['001', '001', '111', '101', '111'] };
  const tag = (s, num, x, y, col) => {   // a wisp's name and the number it holds, like "lo 13"
    const n = String(num); let w = -1; for (const ch of s) w += GLY[ch][0].length + 1; const tw = w + 3 + n.length * 4 - 1; let ox = Math.round(x - tw / 2);
    cx.fillStyle = '#1b1408'; cx.fillRect(ox - 2, y - 2, tw + 4, 9); cx.fillStyle = col;
    for (const ch of s) { const g = GLY[ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c] === '1') cx.fillRect(ox + c, y + r, 1, 1); ox += g[0].length + 1; }
    ox += 2; cx.fillStyle = '#ffffff'; for (const ch of n) { const g = DIG[ch]; for (let i = 0; i < 15; i++) if (g[i] === '1') cx.fillRect(ox + i % 3, y + Math.floor(i / 3), 1, 1); ox += 4; }
  };
  const SPR = ['wheat_d', 'wheat_r', 'wheat_g', 'wheat_s'];
  const drawBed = (b) => {
    const live = b === ab;
    for (let i = 0; i < b.n; i++) {
      const st = b.known[i], inf = !st && live ? (i < b.lo ? 1 : i >= b.hi ? 2 : 0) : 0, im = IMG[SPR[st]], X = Math.round(px(b, i) - im.width / 2) - cam.x, Y = b.y - im.height - cam.y + 2;
      const variation = hash(i + 5, b.y);
      const trim = variation % 3;
      if (variation & 4) {
        cx.save(); cx.translate(X + im.width, Y + trim); cx.scale(-1, 1);
        cx.drawImage(im, 0, 0, im.width, im.height - trim); cx.restore();
      } else cx.drawImage(im, X, Y + trim, im.width, im.height - trim);
      if (inf) { const dx = px(b, i) - cam.x; cx.fillStyle = '#1b1408'; cx.fillRect(dx - 3, Y + 1, 6, 6); cx.fillStyle = inf === 1 ? '#ffd24a' : '#7fe04a'; cx.fillRect(dx - 2, Y + 2, 4, 4); }
      if (!st) { const h = hash(i * 7 + b.y, Math.floor((frozen ? 0 : now) * 3 + i * .37)); if (h % 5 === 0) { cx.fillStyle = '#ffffff'; cx.fillRect(X + 4 + (h >>> 4) % 14, Y + 4 + (h >>> 9) % 16, 1, 1); } }
    }
    const p = IMG.end_post; cx.drawImage(p, Math.round(px(b, b.n) - p.width / 2) - cam.x, b.y - p.height - cam.y + 2);
  };
  let CHIM = [0, 0];
  const draw = () => {
    cx.imageSmoothingEnabled = false;
    cx.drawImage(ground, -cam.x, -cam.y);
    for (const g of glints) { const s = Math.sin((frozen ? 0 : now) * g.sp + g.ph); if (s > .55) { cx.fillStyle = s > .9 ? '#ffffff' : '#b8ecff'; cx.fillRect(g.x - cam.x + Math.round(s * 2), g.y - cam.y, g.w, 1); } }
    const list = [];
    for (const o of things.concat(scenery)) if (o.x > cam.x - 80 && o.x < cam.x + view.w + 80 && o.y > cam.y - 10 && o.y < cam.y + view.h + 160) list.push(o);
    for (const p of people) if (!p.hide) list.push(p);
    for (const f of folk) if (f.vis) list.push({ f, y: f.y });
    for (const b of beds) list.push({ bed: b, y: b.y });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.bed) { drawBed(o.bed); continue; }
      if (o.f) {
        const f = o.f, move = f.fly && IMG[f.n + '_move'];
        const im = move || IMG[f.n + (f.cheer ? '_c' : '')];
        const width = move ? im.width / 4 : im.width;
        const up = f.hop > 0 ? Math.round(Math.abs(Math.sin(f.hop * 9)) * 4) : 0;
        const x = Math.round(f.x) - cam.x, y = Math.round(f.y) - cam.y;
        const frame = move ? Math.floor((f.x - (f.n === 'boy' ? 0 : 177)) / 4) & 3 : 0;
        cx.fillStyle = 'rgba(32,45,46,.28)';
        cx.fillRect(x - 6, y - 1, 12, 3);
        cx.drawImage(im, frame * width, 0, width, im.height, x - Math.floor(width / 2), y - im.height + 1 - up, width, im.height);
        continue;
      }
      if (o.dir !== undefined) { drawPerson(o); continue; }
      const im = IMG[o.n], x = Math.round(o.x - im.width / 2) - cam.x, y = o.y - im.height - cam.y + 2;
      if (o.sway && !frozen) drawSway(o, im, x, y); else cx.drawImage(im, x, y);
    }

    for (const s of smoke) { const k = s.t / s.life, r = Math.round(s.r + k * 3); cx.fillStyle = `rgba(240,238,232,${(.55 * (1 - k)).toFixed(2)})`; cx.fillRect(Math.round(s.x - r) - cam.x, Math.round(CHIM[1] + s.y - r) - cam.y, r * 2, r * 2 - 1); }
    if (night < .5) for (const b of bfly) { const up = Math.sin((frozen ? 0 : now) * 14 + b.ph) > 0; cx.fillStyle = b.c; const x = Math.round(b.x) - cam.x, y = Math.round(b.y) - cam.y; if (up) { cx.fillRect(x - 2, y - 2, 2, 2); cx.fillRect(x + 1, y - 2, 2, 2); } else { cx.fillRect(x - 2, y, 2, 1); cx.fillRect(x + 1, y, 2, 1); } cx.fillStyle = '#3a2a1a'; cx.fillRect(x, y - 1, 1, 2); }
    // the light: dim where wisps have drunk it, blue and still outside time, dark at night
    const d = (100 - light) / 100, m = (a, b, t) => Math.round(a + (b - a) * Math.min(1, t));
    if (d > .005 || frozen || night > .01) { cx.globalCompositeOperation = 'multiply'; cx.fillStyle = night > .01 ? `rgb(${m(255, 99, night)},${m(255, 113, night)},${m(255, 179, night)})` : frozen ? 'rgb(118,153,210)' : `rgb(${m(255, 150, d * 1.5)},${m(255, 130, d * 1.5)},${m(255, 170, d * 1.5)})`; cx.fillRect(0, 0, view.w, view.h); cx.globalCompositeOperation = 'source-over'; }
    drawAtmosphere();
    if (moth.vis) {
      // The pale wings catch lamplight against the cold hollow.
      const wing = IMG.moth, beat = (1 + Math.sin(now * 14)) / 2;
      const width = wing.width - Math.round(beat * 9);
      const x = Math.round(moth.x) - cam.x, y = Math.round(moth.y + Math.sin(now * 3) * 2) - cam.y;
      glow(moth.x, moth.y - 4, 26, .21, '176,156,215');
      for (let i = 0; i < 12; i++) {
        const drift = (now * .8 + i / 12) % 1;
        cx.fillStyle = i % 2 ? '#9e91a7' : '#635872';
        cx.fillRect(x + Math.round(Math.sin(i * 4) * (8 + drift * 12)), y + Math.round(drift * 15), 1, 1);
      }
      cx.drawImage(wing, x - Math.floor(width / 2), y - 16 - Math.round(beat * 2), width, wing.height);
    }
    if (casting) drawSlateFace();
    for (const b of beds) {
      if (b.nums && (b === ab || !casting)) digits(b.n, px(b, b.n) - cam.x, b.y + 5 - cam.y, '#8d93ad');
      if (b.nums && (b === ab || !casting)) for (let i = 0; i < b.n; i++) digits(i, px(b, i) - cam.x, b.y + 5 - cam.y, i === b.mid ? '#ffffff' : b.known[i] === 1 ? '#ffd76a' : b.known[i] === 2 ? '#a6e36a' : '#b9c0dc');
      if (b.wrong !== null && b.wrong !== undefined) { cx.fillStyle = '#ff6b6b'; cx.fillRect(px(b, clamp(b.wrong, 0, b.n)) - 8 - cam.x, b.y - 30 - cam.y, 2, 34); }
      if (b.lineAt !== undefined) { cx.fillStyle = '#fff3c4'; cx.fillRect(px(b, b.lineAt) - 8 - cam.x, b.y - 30 - cam.y, 1, 34); }
    }
    if (req && req.kind === 'plot') { const i = plotAt(req.bed, mouse); if (i >= 0) { const x = px(req.bed, i) - cam.x, y = req.bed.y - 38 - cam.y + Math.round(Math.sin(now * 6)); cx.fillStyle = '#fff3c4'; cx.fillRect(x - 2, y, 5, 2); cx.fillRect(x - 1, y + 2, 3, 1); cx.fillRect(x, y + 3, 1, 1); } }
    if (held && req) { const b = req.bed, snap = clamp(Math.round((mouse.x - b.x0) / 16), 0, b.n); cx.fillStyle = 'rgba(255,255,255,.8)'; cx.fillRect(px(b, snap) - 7 - cam.x, b.y + 2 - cam.y, 14, 1); }
    cx.globalCompositeOperation = 'lighter';
    if (meanReq) { const a = meanReq.at; glow(a.x, a.y - 18, 12 + meanReq.p * 46, .25 + meanReq.p * .6, '255,224,150'); }
    if (stone.n === 'way') glow(stone.x, stone.y - 18, 26 + night * 14, .24 + night * .12 + Math.sin(now * 2) * .045, '255,205,110');
    if (night > .05) { glow(cottage.x - 43, cottage.y - 95, 28, .6 * night); glow(cottage.x - 20, cottage.y - 55, 25, .55 * night); glow(lamp.x + 6, lamp.y - 22, 34, .5 * night); }
    for (const w of wisps) glow(w.x, w.y - 9, 15, .5 * (1 - w.dim * .7), GLOWC[w.kind]);
    for (const s of sparks) { cx.fillStyle = s.green ? 'rgba(190,255,150,.9)' : 'rgba(255,230,150,.95)'; cx.fillRect(Math.round(s.x) - cam.x, Math.round(s.y) - cam.y, 1, 1); }
    cx.globalCompositeOperation = 'source-over';
    const labels = [];
    for (const w of wisps) {
      const speaking = bubs.some(b => b.w === w && b.until > now);
      const mood = w.dim > .5 ? '_puzzle' : w.happy > 0 ? '_h' : speaking && Math.sin(now * 12) > -.3 ? '_talk' : '';
      const im = IMG['w_' + w.kind + mood], X = Math.round(w.x - im.width / 2) - cam.x, Y = Math.round(w.y - im.height + Math.sin(now * (w.kind === 'hi' ? 7 : w.kind === 'lo' ? 2 : 4) + w.ph) * (w.kind === 'hi' ? 2 : 1)) - cam.y;
      cx.globalAlpha = 1 - w.dim * .45; cx.drawImage(im, X, Y); cx.globalAlpha = 1;
      if (ab && !w.notag) {
        const v = held && held.w === w ? clamp(Math.round((mouse.x - ab.x0) / 16), 0, ab.n) : ab[w.kind];
        if (v >= 0) labels.push({ w, v, x: Math.round(w.x) - cam.x, y: Y - 9 });
      }
    }
    for (let i = 0; i < labels.length; i++) {
      const l = labels[i];
      l.x = clamp(l.x, 15, view.w - 15);
      while (labels.slice(0, i).some(o => Math.abs(o.x - l.x) < 29 && Math.abs(o.y - l.y) < 10)) l.y -= 10;
      tag(l.w.kind, l.v, l.x, l.y, l.w.kind === 'lo' ? '#8fc4ff' : l.w.kind === 'hi' ? '#ff9a8a' : '#ffd666');
    }
    const n = !talking && mode === 'walk' && nearest(34);
    if (n) { const h = n === goat ? 20 : n === stone ? 36 : 30, y = Math.round(n.y - h - 10 + Math.sin(now * 5) * 1.5) - cam.y, x = Math.round(n.x) - cam.x; cx.fillStyle = '#2a1a08'; cx.fillRect(x - 4, y - 1, 9, 7); cx.fillRect(x - 1, y + 6, 3, 2); cx.fillStyle = '#ffe08a'; cx.fillRect(x - 3, y, 7, 5); cx.fillRect(x, y + 5, 1, 2); cx.fillStyle = '#2a1a08'; cx.fillRect(x - 2, y + 2, 1, 1); cx.fillRect(x, y + 2, 1, 1); cx.fillRect(x + 2, y + 2, 1, 1); }
    // speech bubbles ride above the canvas
    const r = cv.getBoundingClientRect();
    for (let i = bubs.length - 1; i >= 0; i--) { const b = bubs[i]; if (now > b.until) { b.el.remove(); bubs.splice(i, 1); continue; } b.el.style.left = (r.left + (b.w.x - cam.x) * view.z) + 'px'; let top = b.w.y - 36 - cam.y;
      for (const l of labels) if (Math.abs(l.x - (b.w.x - cam.x)) < 32) top = Math.min(top, l.y - 4);
      b.el.style.top = (r.top + top * view.z) + 'px'; }
  };
  const frame = (ms) => { const dt = Math.min(.05, (ms - last) / 1000 || 0); last = ms; update(dt); draw(); requestAnimationFrame(frame); };

  // =====================================================================================================
  // THE STORY
  // =====================================================================================================
  const cheerAll = (on) => { for (const f of folk) if (f.vis && f !== boy) { f.cheer = on; f.hop = on ? rnd(1, 1.8) : 0; } };

  // Wen's way, led by hand: taste this plot, then the next, then the next. The player feels how slow it is.
  const handWay = async () => {
    const b = topRow, w = W.mid; b.nums = true; w.follow = false; w.notag = true; focus = { x: 300, y: 372 }; let n = 0;
    await flyTo(w, px(b, 0) - 16, b.y - 40, 160);
    for (let i = 0; i < b.n; i++) {
      goal(i ? 'Touch the next plot.' : 'Touch the first plot of the top row.');
      for (;;) { const t = await askPlot(b); if (t === i) break; SFX.bad(); bubble(w, i ? 'Wen always took the next one.' : 'Wen always started at the river.', 1.8); }
      await flyTo(w, px(b, i), b.y - 34, 150); reveal(b, i, true); n++; tally = 'Tastes: ' + n; bubble(w, i < b.line ? 'ripe' : 'GREEN! Here!', i < b.line ? .7 : 1.8); focus = { x: clamp(px(b, i) + 40, 300, 480), y: 372 };
      if (i === 4) note(tobiah, 'You see how it goes. Every single plot.');
      if (i >= b.line) break;
    }
    goal(''); noteOff(); b.lineAt = b.line; await sleep(1); focus = null; w.follow = true; w.notag = false; return n;
  };
  const reapRow = async (f, b, upto) => {
    f.vis = true; f.cheer = false; place(f, b.x0 - 20, b.y + 2);
    for (let i = 0; i < upto; i++) { await new Promise((res) => { f.fly = { x: px(b, i) - 3, y: b.y + 2, speed: 64, res }; }); b.known[i] = 3; puff(px(b, i), b.y - 10, 2); SFX.cut(); }
    f.hop = .5;
  };

  // Yusra's lesson: she says the whole idea first, then the player does every step on eight plots.
  const LINES = [5, 2, 7]; let lessons = 0;
  const lesson = async (first) => {
    const b = pbed; b.line = LINES[lessons++ % 3]; resetBed(b); b.nums = true; mode = 'locked'; focus = { x: 556, y: 172 };
    if (first) {
      await say(yusra, ["So you're the one it came to. Good. I'll say all of it once, then your hands will do it.", 'Same as the big field: the ripening creeps out from the water each night. Here the water is the duck pond.', 'So ripe is all on the pond side and green is all on the far side. Nothing is mixed.', 'That means you never have to taste every plot. One taste can tell you about half the row.', 'You need three wisps. One to taste. You have that one. And two to keep your place.', "Call them. Don't say it. Mean it."]);
      await meanIt(you);
      const lo = mkWisp('lo', 150, 420), hi = mkWisp('hi', 640, 120); lo.follow = hi.follow = true; SFX.come();
      await Promise.all([flyTo(lo, you.x - 16, you.y - 40, 300), flyTo(hi, you.x + 16, you.y - 40, 300)]); puff(lo.x, lo.y - 8, 10); puff(hi.x, hi.y - 8, 10);
      bubble(lo, 'Lo.', 1.8); await sleep(.7); bubble(hi, 'HI! Hi. I am Hi.', 2); await sleep(1.6);
      await say(yusra, ['...', "Twenty years I've known this way. I have said it to this bed a thousand times. Nothing ever came for me.", 'I asked the order to send a waymaker. Twice. They do not send one for forty people.', 'Never mind that. Look at them.']);
    }
    ab = b; W.mid.follow = false; flyTo(W.mid, px(b, 0) - 18, b.y - 44, 170);
    await sleep(.9); bubble(W.lo, 'Nothing behind me yet.', 2.6); await sleep(1.2); bubble(W.hi, "I'm on the stump. Nothing after me yet.", 2.8); await sleep(1.8);
    if (first) await say(yusra, ['Lo says: everything behind me is ripe. Lo stands on the first plot we are not sure of.', 'Hi says: I am green, and so is everything after me. To start, Hi sits on the stump past the last plot.', 'The line is somewhere from Lo up to Hi. So send Mid to taste the middle plot.', 'If it is ripe, a ripe plot cannot be the line. So Lo hops to just past it.', 'If it is green, it might be the very first green one. So Hi comes onto it, and keeps it.', 'When Lo and Hi stand on the same plot, that plot is the line: the first green one. Eight plots. Go.']);
    let n = 0;
    while (b.lo < b.hi) {
      const m = (b.lo + b.hi) >> 1, even = (b.hi - b.lo) % 2 === 0 && b.hi - b.lo > 2; let mid = m;
      note(yusra, n ? 'Again. Touch the middle plot between Lo and Hi.' : 'Touch the middle plot between Lo and Hi. Mid will fly there and taste it.');
      for (;;) { const i = await askPlot(b); if (i === m || (even && i === m - 1)) { mid = i; break; } SFX.bad(); note(yusra, i < b.lo || i >= b.hi ? `We know about plot ${i} already. Only plots ${b.lo} to ${b.hi - 1} are in question.` : `That would work, but it tells you less. Plots ${b.lo} to ${b.hi - 1} are in question. The middle one is plot ${m}.`); }
      b.mid = mid; await flyTo(W.mid, px(b, mid), b.y - 44, 180); reveal(b, mid, true); n++; tally = 'Tastes: ' + n;
      const ripe = b.known[mid] === 1, want = ripe ? 'lo' : 'hi', at = ripe ? mid + 1 : mid; bubble(W.mid, ripe ? 'Ripe!' : 'Green!', 1.4); await sleep(.3);
      note(yusra, ripe ? `Plot ${mid} is ripe, so it cannot be the line. Drag Lo to just past it: plot ${mid + 1}.` : `Plot ${mid} is green. It might be the first green one. Drag Hi onto it: plot ${mid}.`);
      for (;;) {
        const { who, index } = await askWisp(b);
        if (who === want && index === at) break;
        SFX.bad();
        if (who !== want) bubble(W[who], ripe ? 'Not me. That plot is ripe.' : 'Not me. That plot is green.', 2);
        note(yusra, who !== want ? (ripe ? `Hi only sits on green. Plot ${mid} was ripe. Move Lo.` : `Everything behind Lo has to be ripe. Plot ${mid} was green. Move Hi.`)
          : ripe ? (index === mid ? `Not onto plot ${mid} itself. Plot ${mid} is ripe, so it is behind the line. Lo goes just past it, to plot ${mid + 1}. If Lo stayed on it, Mid would taste plot ${mid} again.` : `Just past Mid: plot ${mid + 1}.`)
            : `Onto Mid's plot: plot ${mid}. It is green, so Hi keeps it.`);
      }
      b[want] = at; SFX.hop(); bubble(W[want], ripe ? 'Everything behind me: ripe.' : 'Me, and everything after: green.', 1.8); await sleep(.6);
    }
    b.mid = -1; b.lineAt = b.lo; for (const k of ['mid', 'lo', 'hi']) W[k].happy = 3; SFX.win(); noteOff(); bubble(W.hi, "Oh. It's you.", 2); await sleep(1.1); bubble(W.lo, "It's always me.", 2); await sleep(1.4);
    await say(yusra, [`Lo and Hi are both on plot ${b.lo}. That is the first green plot. Plots 0 to ${b.lo - 1} are ripe.`, `${n} tastes. See the plots with only a dot? You knew those without tasting them.`, `Wen's way would have taken ${b.line + 1} tastes here. On the long rows the difference is huge.`]);
    tally = null; ab = null; for (const k of ['mid', 'lo', 'hi']) W[k].follow = true; focus = null; mode = 'walk';
  };

  // The casting, outside time. The wisps ask what the player means, and each answer becomes a line on the slate.
  let demoId = 0, rules = {};
  const midOf = (b) => (rules.mid === 'lo' ? b.lo : rules.mid === 'hi - 1' ? b.hi - 1 : rules.mid === '(lo + hi - 1) // 2' ? (b.lo + b.hi - 1) >> 1 : (b.lo + b.hi) >> 1);
  const clearRows = () => { for (const r of rows) { resetBed(r); r.nums = true; } };
  const demonstrate = async () => {
    const my = ++demoId, b = rows[0], live = () => my === demoId; let stuck = false;
    rules = {}; clearRows(); ab = b; req = null; held = null; tally = null;
    await flyTo(W.mid, px(b, 0) - 18, b.y - 44, 240); if (!live()) return;
    while (b.lo < b.hi) {
      if (!rules.mid) {
        wsay('mid', 'This slate is the way. Every ? is something you have not told us yet. Blue is Lo, red is Hi, gold is me. So: where do I taste? Touch a plot between Lo and Hi.');
        for (;;) {
          const i = await askPlot(b); if (!live()) return; const m = (b.lo + b.hi) >> 1;
          if (i < b.lo || i >= b.hi) { SFX.bad(); wsay('mid', 'That plot is settled. Touch one between Lo and Hi.'); continue; }
          if (i === m) rules.mid = '(lo + hi) // 2'; else if (i === m - 1 && (b.hi - b.lo) % 2 === 0 && b.hi - b.lo > 2) rules.mid = '(lo + hi - 1) // 2';
          else if (i === b.lo) rules.mid = 'lo'; else if (i === b.hi - 1) rules.mid = 'hi - 1';
          else { SFX.bad(); wsay('mid', "I can only find a plot from where Lo and Hi stand: Lo's plot, the middle one between them, or the last one before Hi. Touch the one you mean."); continue; }
          break;
        }
        writeLine('mid', rules.mid);
        wsay('mid', rules.mid === 'lo' ? "Lo's plot. Every time. It is on the slate now." : rules.mid === 'hi - 1' ? 'The last plot before Hi. Every time. It is on the slate now.' : 'The middle plot between Lo and Hi. Every time. It is on the slate now.');
        await sleep(.8); if (!live()) return;
      }
      const mid = midOf(b); b.mid = mid; hl(lineOf(RE.mid));
      if (!b.known[mid]) { await flyTo(W.mid, px(b, mid), b.y - 44, rules.lo && rules.hi ? 280 : 210); if (!live()) return; reveal(b, mid); bubble(W.mid, mid < b.line ? 'Ripe!' : 'Green!', 1.2); await sleep(.25); if (!live()) return; }
      const ripe = b.known[mid] === 1, name = ripe ? 'lo' : 'hi', before = b.lo + ',' + b.hi;
      if (!rules[name]) {
        wsay(stuck ? name : 'mid', stuck ? `Wait. If I stand there, nothing changes, and Mid will taste plot ${mid} again. And again. Forever. Stand me somewhere else.` : `Plot ${mid} is ${ripe ? 'ripe' : 'green'}. So who moves, Lo or Hi? Drag one of them to where it should stand.`); stuck = false;
        for (;;) {
          const { who, index } = await askWisp(b); if (!live()) return;
          if (who !== name) { SFX.bad(); wsay(who, ripe ? `Me? Plot ${mid} is ripe. I only ever sit on green.` : `Me? Plot ${mid} is green. Everything behind me has to be ripe.`); continue; }
          const off = index - mid;
          if (ripe ? (off === 0 || off === 1) : (off >= -1 && off <= 1)) { rules[name] = off === 0 ? 'mid' : off === 1 ? 'mid + 1' : 'mid - 1'; break; }
          SFX.bad(); wsay(who, `The only thing I know is where Mid is: plot ${mid}. Stand me on Mid's plot, or right beside it.`);
        }
        writeLine(name, rules[name]);
        wsay(name, (rules[name] === 'mid' ? "Onto Mid's plot" : rules[name] === 'mid + 1' ? 'Just past Mid' : 'Just before Mid') + `, every time it is ${ripe ? 'ripe' : 'green'}. It is on the slate now.`);
        await sleep(.6); if (!live()) return;
      }
      hl(lineOf(RE[name]));
      b[name] = clamp(mid + (rules[name] === 'mid' ? 0 : rules[name] === 'mid + 1' ? 1 : -1), 0, b.n); SFX.hop();
      if (b.lo + ',' + b.hi === before) { stuck = true; SFX.bad(); bubble(W[name === 'lo' ? 'hi' : 'lo'], 'Are you going to move?', 2.4); setTimeout(() => bubble(W[name], 'I was told to stand here.', 2.4), 900); rules[name] = null; writeLine(name, '?'); hl(lineOf(RE[name]), true); await sleep(.4); if (!live()) return; continue; }
      await sleep(rules.lo && rules.hi ? .14 : .35); if (!live()) return;
    }
    b.mid = -1; hl(0);
    if (rules.mid && rules.lo && rules.hi) { for (const k of ['mid', 'lo', 'hi']) W[k].happy = 3; SFX.come(); wsay('mid', `Lo and Hi met on plot ${Math.min(b.lo, b.hi)}. I think we know what you mean now. Shall we try all three rows?`, true); }
    else wsay('mid', 'Lo and Hi met. One of them never had to move on this row, so its line on the slate still has a ? in it. You can write that line yourself.');
  };
  let running = false;
  const fail = (e) => { running = false; hl(e.line || 0, true); SFX.bad(); wsay('mid', e.message + (e.line ? ' (Line ' + e.line + '.)' : '')); $('tally').textContent = ''; };
  const runAll = async () => {
    if (running) return; demoId++; req = null; held = null; $('bind').hidden = true;
    let fn; try { fn = PY.parse(src.value); } catch (e) { fail(e); return; }
    running = true; let total = 0; $('tally').textContent = ''; wsay('mid', 'Trying it on all three rows.'); clearRows();
    for (let ri = 0; ri < rows.length; ri++) {
      const b = rows[ri]; ab = b; const g = PY.run(fn, b.n); let res, count = 0, last = -1, rep = 0;
      try {
        let st = g.next();
        while (!st.done) {
          const { ask, line, env } = st.value; hl(line);
          if (typeof env.lo === 'number') b.lo = clamp(env.lo, 0, b.n); if (typeof env.hi === 'number') b.hi = clamp(env.hi, 0, b.n);
          b.mid = ask; count++; total++; rep = ask === last ? rep + 1 : 0; last = ask;
          if (rep >= 2 || count > b.n * 3) throw new PY.PyError(`I keep tasting plot ${ask}, and Lo and Hi are not closing in. Look at the line that moves one of them after that answer.`, line);
          await flyTo(W.mid, px(b, ask), b.y - 44, 340); reveal(b, ask); tally = 'Tastes: ' + total; await sleep(.1);
          st = g.next(b.known[ask] === 1);
        }
        res = st.value;
      } catch (e) { fail(e); return; }
      if (typeof res.env.lo === 'number') b.lo = clamp(res.env.lo, 0, b.n); if (typeof res.env.hi === 'number') b.hi = clamp(res.env.hi, 0, b.n); b.mid = -1;
      if (res.value !== b.line) {
        for (let i = 0; i < b.n; i++) b.known[i] = i < b.line ? 1 : 2; b.wrong = typeof res.value === 'number' ? res.value : 0; b.lineAt = b.line;
        fail({ message: `Row ${ri + 1}: your way says the first green plot is plot ${res.value}. Look at the row. Plots 0 to ${b.line - 1} are ripe, so the first green plot is plot ${b.line}. The red mark is where the reapers would have stopped.` }); return;
      }
      b.lineAt = b.line; for (let i = 0; i < b.n; i++) b.known[i] = i < b.line ? 1 : 2; puff(px(b, b.line) - 8, b.y - 16, 10); await sleep(.4);
    }
    running = false; hl(0); for (const k of ['mid', 'lo', 'hi']) W[k].happy = 4; castTastes = total; SFX.win();
    $('tally').textContent = `Your way: ${total} tastes. Wen's way: ${WEN} tastes.`;
    wsay('mid', total <= WEN * .5 ? `All three lines, in ${total} tastes. Wen's way took ${WEN}. Bind it, and that daylight goes back to the wheat.` : total < WEN ? `It works: ${total} tastes, against Wen's ${WEN}. Could each taste settle more? You can bind it as it is.` : `It works. It drinks as much daylight as Wen's did: ${total} tastes. You can bind it. Or think about which plot settles the most.`, true);
    $('bind').hidden = false;
  };
  let castTastes = 0, castDone = null, outArmed = false;
  $('run').addEventListener('click', runAll);
  $('show').addEventListener('click', () => { if (running) return; src.value = TEMPLATE; gutter(); $('bind').hidden = true; $('tally').textContent = ''; demonstrate(); });
  $('memory').addEventListener('click', () => wsay('mid', 'You remember Yusra: "Everything behind Lo is ripe. Hi is green, and so is everything after. Send Mid to the middle plot. If it is ripe, Lo hops to just past it. If it is green, Hi comes onto it. When they stand on the same plot, that plot is the line."'));
  $('out').addEventListener('click', () => { if (running) return; if (!outArmed) { outArmed = true; $('out').textContent = 'Yes, step out'; wsay('mid', 'If you step out, the stone shuts, and the wheat dries before anyone else can come. Are you sure?'); setTimeout(() => { outArmed = false; $('out').textContent = 'Step out'; }, 6000); return; } castDone('left'); });
  $('bind').addEventListener('click', () => { if (!running) castDone('bound'); });
  const cast = async () => {
    mode = 'locked'; frozen = true; casting = true; document.body.classList.add('casting'); $('slate').hidden = false; goal(''); noteOff();
    src.value = TEMPLATE; gutter(); fit(); focus = { x: 392, y: 420 }; for (const k in keys) keys[k] = false; for (const k of ['mid', 'lo', 'hi']) W[k].follow = false;
    const done = new Promise((res) => { castDone = res; });
    demonstrate();
    const how = await done;
    demoId++; req = null; held = null; running = false; casting = false; frozen = false; document.body.classList.remove('casting'); $('slate').hidden = true; fit(); tally = null; ab = null;
    for (const r of rows) { r.nums = false; r.mid = -1; r.wrong = null; } for (const k of ['mid', 'lo', 'hi']) W[k].follow = true;
    return how;
  };

  const ending = (title, html) => { $('endh').textContent = title; $('endb').innerHTML = html; $('end').hidden = false; };
  $('endx').addEventListener('click', () => location.reload());
  const place = (o, x, y) => { o.x = x; o.y = y; };

  const story = async () => {
    // ----- tonight -----
    night = 1; focus = { x: 384, y: 344 }; cam.fx = clamp(384 - view.w / 2, 0, WW - view.w); cam.fy = clamp(344 - view.h / 2, 0, WH - view.h); goat.stay = true;
    await fade(false, 2);
    await say(NARR, ['Tonight you turned twelve.', 'In Briar Glen, every child of twelve stands at the reaping stone and asks a wisp to come.', 'None has come since Wen, seventy years ago.']);
    await say(mum, ['A way is what the stone tells a wisp to do. A waymaker is someone a wisp will listen to.', "Go on, love. Don't say it. Just mean it."]);
    await meanIt(stone);
    const w = mkWisp('mid', stone.x, stone.y - 16); w.notag = true; SFX.come(); puff(stone.x, stone.y - 20, 16); await flyTo(w, stone.x, stone.y - 52, 26); await sleep(.4); await flyTo(w, you.x + 2, you.y - 34, 30); w.happy = 3; cheerAll(true); SFX.win(); play(tobiah, 0, 7, 8, 2);
    await sleep(1.6);
    await say(tobiah, ["Well, I'll be reaped. A waymaker. In my lifetime.", "That is Wen's own wisp. It has tasted this field every dawn since she was your age. And it came to you."]);
    await say(mum, ['Bed. Both of you. Waymakers still need sleep.']);
    cheerAll(false); await fade(true, 1.2);
    // ----- the night -----
    for (const f of folk) f.vis = false; for (const p of [tobiah, yusra, you, goat]) p.hide = true; w.follow = false; place(w, stone.x + 14, stone.y - 10); w.dim = .6; w.happy = 0;
    place(moth, 560, 250); moth.vis = true; await fade(false, 1.2);
    await say(NARR, ['That night, while the village slept, something came that eats ways.']);
    await new Promise((res) => { moth.fly = { x: stone.x + 2, y: stone.y - 26, speed: 46, res }; }); SFX.moth(); await sleep(.5);
    stone.n = 'way_bit'; puff(stone.x, stone.y - 20, 22); w.dim = 1; await sleep(1.4);
    await new Promise((res) => { moth.fly = { x: -20, y: 300, speed: 90, res }; }); moth.vis = false;
    await fade(true, 1.2);
    // ----- the morning -----
    night = 0; place(you, 150, 292); you.dir = 0; place(mum, 176, 292); place(tobiah, 232, 296); place(yusra, 500, 214); yusra.weeds = true; place(goat, 128, 300); goat.stay = false;
    for (const p of [tobiah, yusra, you, goat]) p.hide = false;
    const spots = { reaper_m: [250, 364], reaper_f: [278, 366], girl: [198, 300], elder: [520, 364], baker: [604, 292], farmer: [548, 366] }; for (const f of folk) { if (spots[f.n]) { place(f, ...spots[f.n]); f.vis = true; } } mum.vis = true;
    const [reaperM, reaperF, farmer] = [folk[1], folk[2], folk[6]];
    place(w, stone.x + 20, stone.y - 6); w.dim = .8; focus = null; cam.fx = clamp(you.x - view.w / 2, 0, WW - view.w); cam.fy = clamp(you.y - 16 - view.h / 2, 0, WH - view.h);
    SFX.bell(); await fade(false, 1.4); SFX.bell();
    await say(mum, ["Up, up! Tobiah has been ringing that bell like the river's on fire."]);
    await say(tobiah, ['The reaping stone has been bitten. Hollow as a drum.', 'The reapers are standing in the field with nothing to cut. Come and see. Quick.']);
    goal('Follow Tobiah down to the field and look at the reaping stone. Arrow keys or click to walk. Space or click to talk.');
    tobiah.route = [[330, 296], [372, 300], [414, 350]]; mode = 'walk';
    goat.onUse = () => say(goat, [['Meh.'], ['(Remainder has eaten the corner of something. You decide not to ask what.)'], ['Meh.', '(It sounded encouraging.)']][(goat.k = (goat.k || 0) + 1) % 3]);
    mum.onUse = () => say(mum, [["Go on. I'll keep your breakfast warm."], ['I am not worried. This is my not-worried face.']][(mum.k = (mum.k || 0) + 1) % 2]);
    await used(stone);
    mode = 'locked'; goal('');
    await say(tobiah, ['Grey dust in the hollow. Moth. It ate the way right out of the stone.', "Wen made that way the summer she turned twelve. It has fed us for seventy years.", 'Every night the wheat ripens out from the river. Every morning the ripe stops somewhere new.', "Under the dew, ripe and green look the same. Bite a grain and it tastes of nothing. A wisp can taste the difference. We can't.", 'And ripe wheat has to come off wet. Once the sun dries it, the heads shatter and the grain is in the dirt.', 'So we cut before the dew lifts. Up to the line, and not one plot past it.']);
    bubble(w, '...?', 2); await sleep(1.2);
    await say(tobiah, ["Look at the poor thing. Without the stone it doesn't know what to do next.", "It won't hear me. It will hear you. Wen's way was simple: taste this plot, then the next, then the next.", 'Lead it down the top row.']);
    w.dim = 0; const n = await handWay();
    await say(tobiah, [`${n} tastes, and that is one row out of four.`, 'Every taste, the wisp drinks a sip of our daylight. Daylight the wheat wanted. That is why we are forty people and no more.', 'Forty-one, once. My sister made forty-one.', 'Top row is known. Get cutting!']);
    const firstCut = reapRow(reaperM, topRow, topRow.line); topRow.nums = false;
    await say(tobiah, ['You could lead it down every row, every dawn, for the rest of your life. A way in the stone does it without you.', "You could put Wen's way back. It would hold us at forty for another seventy years.", "The stone is empty this morning. If a better way is ever going in, it is today. Yusra knows one. Knows it, can't cast it. She is up the path, by the duck pond.", 'Run. The dew is lifting.']);
    tally = null; dewShown = true; dewRun = true; w.follow = true;
    goal('Find Yusra, up the path by the duck pond.'); mode = 'walk';
    await used(yusra);
    goal(''); yusra.weeds = false;
    await lesson(true);
    const toStone = [[556, 214], [556, 292], [424, 298], [356, 352]];
    await say(yusra, ['Two words before you go. To cast a way is to show the wisps what you mean. To bind it is to leave it in the stone, so it runs every dawn without you.', 'And one more thing.', 'Twenty quiet years. Then the night a wisp comes to you, the moth comes too. Do not think about that yet.', 'That moth eats ways. It goes for the stone first, because stone cannot hide. I can, mostly.', 'You will not have to hide. A waymaker can drive it off. You will learn how.']);
    yusra.route = toStone.slice();
    for (;;) {
      goal('Go to the reaping stone when you are ready. Talk to Yusra to practise on a new bed first.');
      const what = await Promise.race([used(stone).then(() => 'stone'), used(yusra).then(() => 'yusra')]);
      stone.onUse = null; yusra.onUse = null; goal('');
      if (what === 'yusra') {
        const c = await say(yusra, ['Mid tastes the middle. Ripe: Lo hops just past it. Green: Hi comes onto it. Again? The dew will not wait, mind.'], ['Yes, once more', "No, I'm ready"]);
        if (c === 0) { yusra.route = []; place(yusra, 500, 214); place(you, 530, 214); await lesson(false); yusra.route = toStone.slice(); }
        continue;
      }
      mode = 'locked';
      const c = await say(yusra, ['Inside the stone, time holds its breath. The dew will wait for you. Stay as long as you need.', "I can't come in. And if you step out before the way is bound, the stone shuts. The order might send someone in three days.", 'In there you show them once, and they do it that way every time after. That is all a way is.'], ['Go in', 'Not yet']);
      if (c === 0) break;
      mode = 'walk';
    }
    dewRun = false; const dewIn = Math.round(dew), lost = clamp(Math.floor((100 - dewIn) / 12), 0, 4);
    const how = await cast();
    if (how === 'bound') {
      stone.n = 'way'; puff(stone.x, stone.y - 20, 30); SFX.come(); focus = { x: 392, y: 414 };
      await sleep(.9); bubble(W.mid, 'I know what I am for.', 2.6); await sleep(1.6);
      for (const b of rows) { b.lineAt = b.line; for (let i = 0; i < b.n; i++) b.known[i] = i < b.line ? 1 : 2; }
      await firstCut;
      await Promise.all([reapRow(reaperF, rows[0], Math.max(0, rows[0].line - lost)), reapRow(farmer, rows[1], Math.max(0, rows[1].line - lost)), reapRow(reaperM, rows[2], Math.max(0, rows[2].line - lost))]);
      for (const b of [topRow, ...rows]) { T('basket', b.x0 - 4, b.y + 2, { hw: 8, d: 5 }); b.lineAt = undefined; }
      cheerAll(true); SFX.win(); play(tobiah, 0, 7, 8, 2); await sleep(1.6); focus = null;
      const fed = 40 + Math.round(16 * Math.max(0, 1 - castTastes / WEN)), lostAll = rows.reduce((t, b) => t + Math.min(lost, b.line), 0);
      await say(tobiah, castTastes < WEN ? [`${castTastes} tastes for three rows. Wen needed ${WEN}.`, lostAll ? `We lost ${lostAll} plots to the sun while you learned. We will manage.` : 'And not one plot lost to the sun.', 'From tomorrow the far plots get daylight they have never had. More of this field will ripen.', 'When there got to be too many of us for the field, my sister was the one who left. I am writing to her tonight.', 'Wen would have liked you.'] : [`${castTastes} tastes. The same as Wen's.`, lostAll ? `We lost ${lostAll} plots to the sun. But the reapers are cutting, and that is because of you.` : 'The reapers are cutting. Nobody goes hungry today, and that is because of you.', 'Maybe there is a cheaper way. There is time to look for it now.']);
      W.mid.follow = false; await flyTo(W.mid, yusra.x + 4, yusra.y - 34, 120); bubble(W.mid, 'Your way.', 2.2); await sleep(1.6);
      await say(yusra, ['Twenty years. So that is what it looks like.', 'It is in the stone now, and in you. Two places, and one of them can fight.', 'The moth will be back. They always come back. When it does, you will know this one cold.']);
      W.mid.follow = true; place(mum, you.x - 18, you.y + 4);
      await say(mum, ["You didn't eat breakfast.", '...I am so proud I could burst. Now eat something.']);
      cheerAll(false); await fade(true, 1); night = .55; boy.vis = true; place(boy, Math.max(10, you.x - 240), you.y + 2); await say(NARR, ['That evening.']); await fade(false, 1);
      await new Promise((res) => { boy.fly = { x: you.x - 26, y: you.y + 2, speed: 120, res }; }); boy.hop = .6;
      await say(boy, ['Is that a waymaker? I saw your stone light up from the river.', 'I am from Harrow. I was running for the city. Our waymaker was called there a year ago.', "Our ferry stone was bitten two nights back. The boats can't find the channel.", 'It was a grey moth, big as a hand. It flew upriver.']);
      await say(yusra, ['Ours.']);
      await say(boy, ['Please. We have nobody.']);
      ending(castTastes < WEN ? 'Room at the table' : 'The line holds', `<div class="nums"><div>Wen's way<b>${WEN}</b>tastes each dawn</div><div>Your way<b>${castTastes}</b>tastes each dawn</div><div>Briar Glen can feed<b>${fed}</b>people (it was 40)</div></div><p>You went in with ${dewIn}% of the dew left. ${lostAll ? lostAll + ' ripe plots dried out before they could be cut.' : 'No ripe wheat was lost.'}</p><p>On Earth this way is called <b>binary search</b>. It is how a database finds one record among millions, and how programmers find the first broken version of their code. The three wisps are its three variables: <b>lo</b>, <b>hi</b> and <b>mid</b>.</p><p>Next: Harrow.</p>`);
    } else {
      await sleep(1.5);
      await say(yusra, ['The stone has shut.', 'The order sent a waymaker on the third day. Until then we shared what there was. Nobody starved. It was close.', 'Tomorrow, sit with me again. You can still learn this one.']);
      ending('Three thin days', '<p>The reapers guessed where the line was. Some cut green wheat, and some ripe wheat dried and shattered.</p><p>The way can be learned again another morning.</p>');
    }
  };

  function start() {
    buildGround(); forest(); paintShadows();
    const cm = META.cottage, cl = cottage.x - cm.w / 2, ct = cottage.y - cm.h; CHIM = [cl + cm.w * .74, ct + 6];
    fit(); night = 1; ready = true; requestAnimationFrame(frame);
  }
  let begun = false;
  const begin = () => { if (begun || !ready) return; begun = true; try { AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state !== 'running') AC.resume(); } catch (e) { AC = null; } SFX.bell(); $('title').hidden = true; story(); };
  $('begin').addEventListener('click', begin);
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => { if (AC && AC.state !== 'running') AC.resume(); }, true);
  window.GAME = { mean: () => { if (meanReq) { holding = true; meanReq.p = 1; } }, topRow, audio: () => AC && AC.state, you, yusra, tobiah, stone, mum, rows, pbed, wisps, W, cam, view, px, begin, state: () => ({ mode, talking: talking && (talking.name || 'narrator'), line: talking ? lines[li] : null, req: req && req.kind, held: held && held.w.kind, casting, light: Math.round(light), goal: $('goal').textContent, rules, running, night }), click: (wx, wy) => { const r = cv.getBoundingClientRect(); return { clientX: r.left + (wx - cam.x) / view.w * r.width, clientY: r.top + (wy - cam.y) / view.h * r.height }; }, next: nextLine, tp: (x, y) => { you.x = x; you.y = y; }, use, resolvePlot: (i) => { if (req && req.kind === 'plot') { const r = req; req = null; r.resolve(i); return true; } return false; }, resolveWisp: (who, index) => { if (req && req.kind === 'wisp') { const r = req; req = null; held = null; r.resolve({ who, index }); return true; } return false; }, tick: (sec) => { for (let t = 0; t < sec; t += .04) update(.04); draw(); } };
})();
