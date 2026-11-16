/* A Part of a Part: thoughtfeel.net/pan (students) and thoughtfeel.net/pan/board (the classroom board).
   A square pan of brownies for finding a fraction of a fraction, written for a grade 5 demo lesson.
   Nothing on these pages is saved or sent anywhere: no logins, no tracking, no cookies. */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (q, r = document) => r.querySelector(q);
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
    return e;
  };
  const s = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const frac = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
  const same = (a, b, c, d) => a * d === b * c;
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
  const simp = (n, d) => { const g = gcd(n, d); return [n / g, d / g]; };
  const range = (a, b) => Array.from({ length: Math.max(0, b - a) }, (_, i) => a + i);
  const MAX = 8;

  /* ---------- the pan ---------- */
  let uid = 0;
  class Pan {
    constructor(host, { interactive = true, onchange = null } = {}) {
      this.S = 480; this.P = 18;
      this.interactive = interactive; this.onchange = onchange;
      this.cols = 1; this.gone = new Set(); this.rows = 1; this.mine = new Set();
      this.grid = false; this.numbers = false; this.mode = 'strips';
      this.id = 'pan' + (++uid);
      this.wrap = h('div', { class: 'pan-wrap' });
      host.append(this.wrap);
      const W = this.S + 2 * this.P, id = this.id;
      this.svg = s('svg', { viewBox: `0 0 ${W} ${W}`, class: 'pan' + (interactive ? ' tappable' : ''), role: 'img', 'aria-label': 'A square pan of brownies' }, this.wrap);
      const defs = s('defs', {}, this.svg);
      const pb = s('pattern', { id: id + 'b', width: 46, height: 46, patternUnits: 'userSpaceOnUse' }, defs);
      s('rect', { width: 46, height: 46, fill: '#5c3a26' }, pb);
      [[6, 8, 3.2, '#4a2c1c'], [30, 14, 2.6, '#6f4630'], [18, 30, 3.6, '#46291a'], [40, 38, 2.2, '#7a5037'], [10, 40, 1.8, '#7a5037'], [36, 4, 1.6, '#46291a'], [24, 20, 1.4, '#86593d'], [3, 24, 1.2, '#86593d']]
        .forEach(([cx, cy, r, fill]) => s('circle', { cx, cy, r, fill }, pb));
      const gl = s('linearGradient', { id: id + 'g', x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
      s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '.18' }, gl);
      s('stop', { offset: '.55', 'stop-color': '#fff', 'stop-opacity': '0' }, gl);
      const tr = s('linearGradient', { id: id + 't', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      s('stop', { offset: '0', 'stop-color': '#dfe4ea' }, tr);
      s('stop', { offset: '1', 'stop-color': '#a9b2bc' }, tr);
      const cp = s('pattern', { id: id + 'c', width: 60, height: 60, patternUnits: 'userSpaceOnUse' }, defs);
      s('rect', { width: 60, height: 60, fill: '#eef1f4' }, cp);
      [[12, 14, 1.9], [44, 22, 1.4], [26, 46, 2.1], [52, 52, 1.2], [6, 38, 1.2]].forEach(([cx, cy, r]) => s('circle', { cx, cy, r, fill: '#b38f76', opacity: '.55' }, cp));
      s('rect', { x: 2, y: 2, width: W - 4, height: W - 4, rx: 26, fill: `url(#${id}t)`, stroke: '#8d96a0', 'stroke-width': 3 }, this.svg);
      this.g = s('g', {}, this.svg);
      this.toast = h('div', { class: 'toast', role: 'status' });
      this.wrap.append(this.toast);
      if (interactive) this.svg.addEventListener('pointerdown', (e) => this.tap(e));
      this.render();
    }
    get left() { return this.cols - this.gone.size; }
    get piece() { return [this.mine.size * this.left, this.rows * this.cols]; }
    set(o = {}) {
      if ('cols' in o) this.cols = o.cols;
      if ('gone' in o) this.gone = new Set(o.gone);
      if ('rows' in o) this.rows = o.rows;
      if ('mine' in o) this.mine = new Set(o.mine);
      if ('grid' in o) this.grid = o.grid;
      if ('numbers' in o) this.numbers = o.numbers;
      this.render(); this.changed();
    }
    build([a, b], [c, d], extra = {}) { this.set({ cols: b, gone: range(a, b), rows: d, mine: range(0, c), ...extra }); }
    reset() { this.set({ cols: 1, gone: [], rows: 1, mine: [], grid: false, numbers: false }); }
    setCols(n) { this.cols = n; this.gone.clear(); this.mine.clear(); this.render(); this.changed(); }
    setRows(n) { this.rows = n; this.mine.clear(); this.render(); this.changed(); }
    changed() { if (this.onchange) this.onchange(this); }
    flash(msg) {
      this.toast.textContent = msg; this.toast.classList.add('show');
      clearTimeout(this.tt); this.tt = setTimeout(() => this.toast.classList.remove('show'), 2400);
    }
    locate(e) {
      const pt = this.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(this.svg.getScreenCTM().inverse());
      const x = p.x - this.P, y = p.y - this.P;
      if (x < 0 || y < 0 || x > this.S || y > this.S) return null;
      return { c: Math.min(this.cols - 1, Math.floor(x / (this.S / this.cols))), r: Math.min(this.rows - 1, Math.floor(y / (this.S / this.rows))) };
    }
    tap(e) {
      const t = this.locate(e); if (!t) return;
      e.preventDefault();
      if (this.mode === 'strips') {
        if (this.cols === 1) { this.flash('First cut the pan into strips (step 1).'); return; }
        if (this.gone.has(t.c)) this.gone.delete(t.c);
        else if (this.left > 1) this.gone.add(t.c);
        else { this.flash('Keep at least one strip of brownie.'); return; }
      } else {
        if (this.gone.has(t.c)) { this.flash('That strip is gone. Tap the brownie that is left.'); return; }
        if (this.rows === 1 && !this.mine.size) this.flash('Tip: cut what is left into pieces first (step 2).');
        if (this.mine.has(t.r)) this.mine.delete(t.r); else this.mine.add(t.r);
      }
      this.render(); this.changed();
    }
    render() {
      const g = this.g; g.replaceChildren();
      const { S, P, cols, rows, id } = this, cw = S / cols, rh = S / rows;
      for (let c = 0; c < cols; c++) {
        const gone = this.gone.has(c);
        s('rect', { x: P + c * cw, y: P, width: cw + 0.6, height: S, fill: `url(#${id}${gone ? 'c' : 'b'})` }, g);
        if (!gone) s('rect', { x: P + c * cw, y: P, width: cw + 0.6, height: S, fill: `url(#${id}g)` }, g);
      }
      for (const r of this.mine) for (let c = 0; c < cols; c++) {
        if (!this.gone.has(c)) s('rect', { x: P + c * cw, y: P + r * rh, width: cw, height: rh, class: 'mine' }, g);
      }
      for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) {
        const gone = this.gone.has(c);
        if (gone && !this.grid) continue;
        s('line', { x1: P + c * cw + 3, x2: P + (c + 1) * cw - 3, y1: P + r * rh, y2: P + r * rh, class: gone ? 'cut ghost' : 'cut' }, g);
      }
      for (let c = 1; c < cols; c++) {
        const tray = this.gone.has(c - 1) && this.gone.has(c);
        s('line', { x1: P + c * cw, x2: P + c * cw, y1: P + 3, y2: P + S - 3, class: tray ? 'cut tray' : 'cut' }, g);
      }
      for (const r of this.mine) {
        let c = 0;
        while (c < cols) {
          if (this.gone.has(c)) { c++; continue; }
          let e = c; while (e + 1 < cols && !this.gone.has(e + 1)) e++;
          s('rect', { x: P + c * cw + 2.5, y: P + r * rh + 2.5, width: (e - c + 1) * cw - 5, height: rh - 5, rx: 6, class: 'mine-edge' }, g);
          c = e + 1;
        }
      }
      if (this.numbers) {
        let n = 0;
        const fs = Math.max(13, Math.min(30, Math.min(cw, rh) * 0.36));
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          n++;
          const gone = this.gone.has(c), m = !gone && this.mine.has(r);
          const t = s('text', { x: P + (c + 0.5) * cw, y: P + (r + 0.5) * rh, class: 'num' + (gone ? ' gone' : '') + (m ? ' minenum' : ''), style: `font-size:${fs}px` }, g);
          t.textContent = n;
        }
      }
      s('rect', { x: P, y: P, width: S, height: S, rx: 4, fill: 'none', stroke: '#7b848e', 'stroke-width': 2 }, g);
    }
  }

  /* ---------- the problems ---------- */
  const P = {
    ana: {
      key: 'ana', tab: 'Problem 1', who: 'Ana', left: [1, 2], eat: [1, 3],
      text: `Half of the pan is left. Ana eats ${frac(1, 3)} of what is left.`,
      ask: 'How much of the WHOLE pan does Ana eat?',
      predict: { q: `Predict first: will Ana's piece be more or less than ${frac(1, 2)} of the whole pan?`, options: ['More', 'Less', 'Not sure'] },
    },
    ben: {
      key: 'ben', tab: 'Problem 2', who: 'Ben', left: [1, 3], eat: [1, 2],
      text: `Ben has his own pan. ${frac(1, 3)} of Ben's pan is left. Ben eats ${frac(1, 2)} of what is left.`,
      ask: 'How much of the WHOLE pan does Ben eat?',
      predict: { q: 'Predict first: who eats more, Ana or Ben?', options: ['Ana', 'Ben', 'The same'] },
    },
    p3: {
      key: 'p3', tab: 'Problem 3', left: [3, 4], eat: [1, 2],
      text: `${frac(3, 4)} of the pan is left. You eat ${frac(1, 2)} of what is left.`,
      ask: 'How much of the WHOLE pan do you eat?',
      predict: { q: `Predict first: more or less than ${frac(1, 2)} of the whole pan?`, options: ['More', 'Less', 'Not sure'] },
    },
    p4: {
      key: 'p4', tab: 'Problem 4', left: [2, 3], eat: [3, 4],
      text: `${frac(2, 3)} of the pan is left. You eat ${frac(3, 4)} of what is left.`,
      ask: 'How much of the WHOLE pan do you eat?',
      predict: { q: `Predict first: more than half, less than half, or half of the whole pan?`, options: ['More than half', 'Less than half', 'Half'] },
    },
  };
  const nameOf = (p) => p.who || 'You';
  const verb = (p) => (p.who ? 'eats' : 'eat');

  /* ---------- step controls for one pan ---------- */
  function stepsUI(pan, prob, { onSolved = null, getPrediction = () => null } = {}) {
    const stepper = (get, set, label) => {
      const out = h('output');
      const minus = h('button', { type: 'button', 'aria-label': 'Fewer ' + label, onclick: () => { if (get() > 1) set(get() - 1); } }, '−');
      const plus = h('button', { type: 'button', 'aria-label': 'More ' + label, onclick: () => { if (get() < MAX) set(get() + 1); } }, '+');
      return { el: h('span', { class: 'stepper' }, minus, out, plus), sync: () => { out.value = get(); minus.disabled = get() <= 1; plus.disabled = get() >= MAX; } };
    };
    const st1 = stepper(() => pan.cols, (n) => { pan.setCols(n); activate(1); }, 'strips');
    const st2 = stepper(() => pan.rows, (n) => { pan.setRows(n); activate(2); }, 'pieces');
    const read1 = h('div', { class: 'readout' }), read2 = h('div', { class: 'readout' });
    const s1 = h('div', { class: 'step active', onpointerdown: () => activate(1) },
      h('h3', { html: '<b>1.</b> Cut the pan into equal strips. Then tap strips to take them away.' }),
      h('div', { class: 'row' }, st1.el, read1));
    const s2 = h('div', { class: 'step', onpointerdown: () => activate(2) },
      h('h3', { html: '<b>2.</b> Cut what is left into equal pieces. Then tap the piece that gets eaten.' }),
      h('div', { class: 'row' }, st2.el, read2));
    const nIn = h('input', { type: 'text', inputmode: 'numeric', maxlength: 3, 'aria-label': 'Top number', autocomplete: 'off' });
    const dIn = h('input', { type: 'text', inputmode: 'numeric', maxlength: 3, 'aria-label': 'Bottom number', autocomplete: 'off' });
    const fb = h('div', { class: 'feedback', 'aria-live': 'polite' });
    const gridBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { pan.set({ grid: !pan.grid, numbers: pan.grid ? false : pan.numbers }); } }, 'Cut the whole pan the same way');
    const numBtn = h('button', { type: 'button', class: 'btn ghost', onclick: () => { const on = !pan.numbers; pan.set({ numbers: on, grid: on ? true : pan.grid }); } }, 'Number the pieces');
    const checkBtn = h('button', { type: 'button', class: 'btn', onclick: () => check() }, 'Check');
    [nIn, dIn].forEach((i) => i.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); }));
    const ask = prob ? `<b>3.</b> How much of the <u>whole</u> pan ${prob.who ? 'does ' + prob.who + ' eat' : 'do you eat'}?` : '<b>3.</b> Count: how much of the <u>whole</u> pan is the eaten piece?';
    const tools = h('div', { class: 'row', style: 'margin-top:10px' }, gridBtn, numBtn,
      h('button', { type: 'button', class: 'btn ghost', onclick: () => { pan.reset(); activate(1); fb.textContent = ''; fb.className = 'feedback'; } }, 'Start over'));
    const s3 = prob
      ? h('div', { class: 'step' }, h('h3', { html: ask }),
          h('div', { class: 'row' }, h('span', { class: 'answer' }, h('span', { class: 'fin' }, nIn, h('span', { class: 'bar' }), dIn)), checkBtn),
          tools, fb)
      : h('div', { class: 'step' }, h('h3', { html: ask }), tools);
    function activate(k) { pan.mode = k === 1 ? 'strips' : 'piece'; s1.classList.toggle('active', k === 1); s2.classList.toggle('active', k === 2); }
    function sync() {
      st1.sync(); st2.sync();
      read1.innerHTML = pan.cols === 1 ? 'Not cut yet' : `Left: ${pan.left} of ${pan.cols} strips = ${frac(pan.left, pan.cols)} of the pan`;
      read2.innerHTML = pan.rows === 1 && !pan.mine.size ? 'Not cut yet' : `Eaten: ${pan.mine.size} of ${pan.rows} = ${frac(pan.mine.size, pan.rows)} of what is left`;
      gridBtn.classList.toggle('on', pan.grid); numBtn.classList.toggle('on', pan.numbers);
    }
    const say = (kind, html) => { fb.className = 'feedback ' + kind; fb.innerHTML = html; };
    function check() {
      const n = parseInt(nIn.value, 10), d = parseInt(dIn.value, 10);
      if (!n || !d) return say('try', 'Type a fraction: a top number and a bottom number.');
      if (!prob) return;
      const [A, B] = prob.left, [C, D] = prob.eat, tn = A * C, td = B * D;
      const leftOK = pan.cols > 1 && same(pan.left, pan.cols, A, B);
      const eatOK = pan.mine.size > 0 && same(pan.mine.size, pan.rows, C, D);
      if (same(n, d, tn, td)) {
        const [pn, pd] = pan.piece;
        let msg = `Yes! ${nameOf(prob)} ${verb(prob)} ${frac(n, d)} of the whole pan.`;
        if (leftOK && eatOK && pan.grid) msg += ` That's ${pn} of the ${pd} equal pieces in the whole pan.`;
        msg += ' Now tell your partner how you know.';
        const pr = getPrediction();
        if (pr) msg += ` <br>You predicted “${pr}.” Were you right? Why?`;
        say('good', msg);
        if (onSolved) onSolved();
        return;
      }
      if (!leftOK) return say('try', `Check step 1. The problem says ${frac(A, B)} of the pan is left. Cut the pan into strips and take some away to match.`);
      if (!eatOK) return say('try', `Check step 2. ${nameOf(prob)} ${verb(prob)} ${frac(C, D)} of what is left. Cut what is left into pieces and tap the part that gets eaten.`);
      if (same(n, d, C, D)) return say('try', `${frac(n, d)} is how much of what was <b>left</b> got eaten. The question asks about the <b>whole</b> pan. Try “Cut the whole pan the same way.”`);
      if (same(n, d, A, B)) return say('try', `${frac(n, d)} is how much was left before anyone ate. How much got eaten?`);
      if (d === B + D) return say('try', 'It looks like the bottom numbers got added. Cut the whole pan the same way and count the pieces.');
      if (n >= d) return say('try', 'That is a whole pan or more! The piece is only part of the pan.');
      if (n * B > A * d) return say('try', `That is more than the part that was left (${frac(A, B)}). A part of a part has to be smaller. Try again.`);
      return say('try', 'Not yet. How many pieces the size of the eaten piece would fill the whole pan?');
    }
    pan.onchange = () => { sync(); };
    sync();
    return { el: h('div', { class: 'steps' }, s1, s2, s3), sync };
  }

  function predictUI(prob, big = false) {
    let picked = null;
    const chips = prob.predict.options.map((o) => h('button', { type: 'button', class: 'chip', onclick: (e) => { picked = o; chips.forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, o));
    return { el: h('div', {}, h('div', { class: big ? 'b-sub' : '', style: big ? 'margin:0' : 'font-size:17px;margin-top:8px', html: prob.predict.q }), h('div', { class: 'predict' }, chips)), get: () => picked };
  }

  /* ---------- the two stories (the analogy) ---------- */
  const STORIES = [
    { title: 'The brownie pan', cls: '', lines: [
      'There is a whole <span class="w">pan of brownies</span>.',
      'Half of the <span class="w">pan</span> is <span class="w">left</span>.',
      'One third of the <span class="w">part that is left</span> is <span class="w">Ana’s piece</span>.',
      '<span class="w">Ana’s piece</span> is a part of a part.',
      '<span class="w">Ana’s piece</span> is one sixth of the whole <span class="w">pan</span>.',
    ] },
    { title: 'The garden', cls: 'g', lines: [
      'There is a whole <span class="w g">garden</span>.',
      'Half of the <span class="w g">garden</span> is <span class="w g">vegetables</span>.',
      'One third of the <span class="w g">vegetable part</span> is <span class="w g">tomatoes</span>.',
      '<span class="w g">The tomatoes</span> are a part of a part.',
      '<span class="w g">The tomatoes</span> are one sixth of the whole <span class="w g">garden</span>.',
    ] },
  ];
  const FRAME = 'There is a whole <span class="blank"></span>. Half of the <span class="blank"></span> is <span class="blank"></span>. One third of the <span class="blank"></span> is <span class="blank"></span>. <span class="blank"></span> is a part of a part. <span class="blank"></span> is one sixth of the whole <span class="blank"></span>.';

  /* ================= student page ================= */
  function student() {
    const tabsEl = $('#tabs'), host = $('#views');
    const order = ['ana', 'ben', 'cmp', 'p3', 'p4', 'ch', 'story'];
    const label = { ana: 'Problem 1', ben: 'Problem 2', cmp: 'Who ate more?', p3: 'Problem 3', p4: 'Problem 4', ch: 'Challenge', story: 'Same story' };
    const views = {}, done = new Set(), tabs = {};
    order.forEach((k) => { tabs[k] = h('button', { type: 'button', class: 'tab', onclick: () => show(k) }, label[k]); tabsEl.append(tabs[k]); });
    const markDone = (k) => { if (done.has(k)) return; done.add(k); tabs[k].append(h('span', { class: 'tick', 'aria-label': 'done' }, '✓')); };

    function problemView(prob) {
      const v = h('div', { class: 's-main' });
      const pred = predictUI(prob);
      v.append(h('div', { class: 'q' }, h('div', { html: `<span class="who">${prob.tab}${prob.who ? ' · ' + prob.who : ''}.</span> ${prob.text}<span class="ask">${prob.ask}</span>` }), pred.el));
      const col = h('div'); v.append(col);
      const pan = new Pan(col);
      const st = stepsUI(pan, prob, { onSolved: () => markDone(prob.key), getPrediction: pred.get });
      v.append(st.el);
      return v;
    }
    function compareView() {
      const v = h('div', { class: 's-main' });
      let picked = null;
      const opts = ['Ana', 'Ben', 'The same'].map((o) => h('button', { type: 'button', class: 'chip', onclick: (e) => { picked = o; opts.forEach((c) => c.classList.toggle('on', c === e.currentTarget)); } }, o));
      v.append(h('div', { class: 'q' },
        h('div', { html: `<span class="who">Who ate more?</span> Ana: half of her pan was left, and she ate ${frac(1, 3)} of it. Ben: ${frac(1, 3)} of his pan was left, and he ate ${frac(1, 2)} of it.<span class="ask">Who ate more of the whole pan? Talk with your partner first.</span>` }),
        h('div', { class: 'predict' }, opts)));
      const fa = h('figure', {}, h('figcaption', {}, 'Ana’s pan')), fbn = h('figure', {}, h('figcaption', {}, 'Ben’s pan'));
      const ana = new Pan(fa, { interactive: false }), ben = new Pan(fbn, { interactive: false });
      ana.build([1, 2], [1, 3]); ben.build([1, 3], [1, 2]);
      const ra = h('div', { class: 'res' }), rb = h('div', { class: 'res' });
      fa.append(ra); fbn.append(rb);
      ben.svg.classList.add('spin');
      let turned = false;
      const note = h('div', { class: 'feedback' });
      const showBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
        ana.set({ grid: true }); ben.set({ grid: true });
        ra.innerHTML = `Ana ate ${frac(1, 6)} of her pan.`; rb.innerHTML = `Ben ate ${frac(1, 6)} of his pan.`;
        note.className = 'feedback good';
        note.innerHTML = (picked ? `You picked “${picked}.” ` : '') + 'They ate the same amount! Why? Try turning Ben’s pan.';
        markDone('cmp');
      } }, 'Cut both whole pans the same way');
      const turnBtn = h('button', { type: 'button', class: 'btn gold', onclick: () => {
        turned = !turned; ben.svg.style.transform = turned ? 'rotate(90deg)' : '';
        turnBtn.textContent = turned ? 'Turn it back' : 'Turn Ben’s pan';
      } }, 'Turn Ben’s pan');
      v.append(h('div', { class: 'cmp' }, fa, fbn));
      v.append(h('div', { class: 'wide' }, h('div', { class: 'row' }, showBtn, turnBtn), note));
      return v;
    }
    function challengeView() {
      const v = h('div', { class: 's-main' });
      const found = new Map();
      const list = h('ol', { class: 'found' });
      v.append(h('div', { class: 'q', html: `<span class="who">Challenge.</span> Find two different ways for the eaten piece to be ${frac(1, 6)} of the whole pan. Build one, press “Is it ${frac(1, 6)}?”, then build a different one.<span class="ask">Can you find a way nobody else found?</span>` }));
      const col = h('div'); v.append(col);
      const pan = new Pan(col);
      const st = stepsUI(pan, null);
      const fb = h('div', { class: 'feedback' });
      const btn = h('button', { type: 'button', class: 'btn gold', html: `Is it ${frac(1, 6)}?`, onclick: () => {
        if (pan.cols === 1 || !pan.mine.size) { fb.className = 'feedback try'; fb.textContent = 'Cut the pan and pick a piece first.'; return; }
        const [n, d] = pan.piece;
        if (!same(n, d, 1, 6)) { const [a, b] = simp(n, d); fb.className = 'feedback try'; fb.innerHTML = `This piece is ${frac(a, b)} of the whole pan, not ${frac(1, 6)}. Try changing the cuts.`; return; }
        const [la, lb] = simp(pan.left, pan.cols), [ea, eb] = simp(pan.mine.size, pan.rows);
        const key = `${la}/${lb}|${ea}/${eb}`;
        if (found.has(key)) { fb.className = 'feedback try'; fb.textContent = 'You found that one already. Can you find a different way?'; return; }
        found.set(key, true);
        list.append(h('li', { html: `${frac(la, lb)} of the pan is left, and ${frac(ea, eb)} of that gets eaten.` }));
        fb.className = 'feedback good';
        fb.innerHTML = found.size >= 2 ? 'Two ways! What do your two ways have in common?' : 'Yes! That is one way. Now find a different one.';
        if (found.size >= 2) markDone('ch');
      } });
      v.append(h('div', {}, st.el, h('div', { class: 'step', style: 'margin-top:12px' }, h('div', { class: 'row' }, btn), fb, list)));
      return v;
    }
    function storyView() {
      const v = h('div', { class: 's-main' });
      v.append(h('div', { class: 'q', html: '<span class="who">Same story, different things.</span> Read both stories. Which words stay the same? Which words change?<span class="ask">When the same story describes different things, that is an analogy.</span>' }));
      const grid = h('div', { class: 'story-grid wide' });
      STORIES.forEach((st) => grid.append(h('div', { class: 'story' }, h('h3', {}, st.title), h('ol', {}, st.lines.map((l) => h('li', { html: l }))))));
      v.append(grid);
      v.append(h('div', { class: 'wide story' },
        h('h3', {}, 'Your turn: tell the same story about something that is not food.'),
        h('div', { class: 'frame', html: FRAME }),
        h('textarea', { class: 'mine-story', placeholder: 'There is a whole …', 'aria-label': 'Your story' }),
        h('p', { class: 'private-note' }, 'What you type stays on this computer. It is not saved or sent anywhere.')));
      return v;
    }
    function build(k) {
      if (k === 'cmp') return compareView();
      if (k === 'ch') return challengeView();
      if (k === 'story') return storyView();
      return problemView(P[k]);
    }
    function show(k) {
      if (!order.includes(k)) k = 'ana';
      if (!views[k]) { views[k] = build(k); host.append(views[k]); }
      order.forEach((o) => { if (views[o]) views[o].hidden = o !== k; tabs[o].classList.toggle('on', o === k); });
      if (location.hash !== '#' + k) history.replaceState(null, '', '#' + k);
    }
    show(location.hash.slice(1) || 'ana');
  }

  /* ================= board ================= */
  function board() {
    const stage = $('#stage'), dotsEl = $('#dots'), back = $('#back'), next = $('#next');
    const slides = [];
    const add = (name, make) => slides.push({ name, make, el: null });

    add('Start', () => h('div', { class: 'b-body', style: 'align-content:center;justify-items:center;text-align:center' },
      h('div', {},
        h('h1', { class: 'b-title', style: 'font-size:clamp(40px,6vw,96px)' }, 'A Part of a Part'),
        h('p', { class: 'b-sub' }, 'Today’s tool: a pan of brownies'))));

    add('Notice and wonder', () => {
      const col = h('div', { class: 'b-pan-col' });
      const pan = new Pan(col, { interactive: false });
      pan.build([1, 2], [1, 3]);
      return h('div', {},
        h('h2', { class: 'b-title' }, 'What do you notice? What do you wonder?'),
        h('div', { class: 'b-notice' }, col,
          h('div', { class: 'b-text' },
            h('p', {}, 'I notice …'),
            h('p', {}, 'I wonder …'))));
    });

    const problemSlide = (prob) => () => {
      const col = h('div', { class: 'b-pan-col' });
      const pan = new Pan(col);
      const pred = predictUI(prob, true);
      const st = stepsUI(pan, prob, { getPrediction: pred.get });
      return h('div', { style: 'display:flex;flex-direction:column;height:100%;min-height:0' },
        h('h2', { class: 'b-title', html: `${prob.who}: ${prob.text}` }),
        h('p', { class: 'b-sub', style: 'font-weight:800;color:var(--ink)' }, prob.ask),
        h('div', { class: 'b-body b-two' }, col, h('div', {}, pred.el, h('div', { style: 'height:1.4vh' }), st.el)));
    };
    add('Ana', problemSlide(P.ana));
    add('Ben', problemSlide(P.ben));

    add('Who ate more?', () => {
      const fa = h('figure', {}, h('figcaption', {}, 'Ana’s pan')), fbn = h('figure', {}, h('figcaption', {}, 'Ben’s pan'));
      const ana = new Pan(fa, { interactive: false }), ben = new Pan(fbn, { interactive: false });
      ana.build([1, 2], [1, 3]); ben.build([1, 3], [1, 2]);
      const ra = h('div', { class: 'res' }), rb = h('div', { class: 'res' });
      fa.append(ra); fbn.append(rb);
      ben.svg.classList.add('spin');
      let turned = false;
      const turnBtn = h('button', { type: 'button', class: 'btn gold', onclick: () => {
        turned = !turned; ben.svg.style.transform = turned ? 'rotate(90deg)' : '';
        turnBtn.textContent = turned ? 'Turn it back' : 'Turn Ben’s pan';
      } }, 'Turn Ben’s pan');
      const showBtn = h('button', { type: 'button', class: 'btn', onclick: () => {
        const on = !ana.grid; ana.set({ grid: on }); ben.set({ grid: on });
        ra.innerHTML = on ? `${frac(1, 6)} of the pan` : ''; rb.innerHTML = on ? `${frac(1, 6)} of the pan` : '';
      } }, 'Cut both whole pans the same way');
      return h('div', { style: 'display:flex;flex-direction:column;height:100%;min-height:0' },
        h('h2', { class: 'b-title' }, 'Who ate more of the whole pan, Ana or Ben?'),
        h('div', { class: 'b-cmp', style: 'flex:1' }, fa, fbn),
        h('div', { class: 'b-row-btns' }, showBtn, turnBtn));
    });

    add('Shortcut?', () => {
      const rows = [[[1, 2], [1, 3]], [[1, 3], [1, 2]], [[3, 4], [1, 2]], [[2, 3], [3, 4]]];
      const names = ['Ana', 'Ben', 'Problem 3', 'Problem 4'];
      const cells = [];
      const tbody = h('tbody', {}, rows.map(([[a, b], [c, d]], i) => {
        const td = h('td', { class: 'hide', html: frac(a * c, b * d), onclick: (e) => e.currentTarget.classList.toggle('hide') });
        cells.push(td);
        return h('tr', {}, h('td', {}, names[i]), h('td', { html: frac(a, b) }), h('td', { html: frac(c, d) }), td);
      }));
      const why = h('div', { class: 'why hidden-block', html:
        `The bottom numbers cut the whole pan: 2 strips × 3 pieces = 6 equal pieces.<br>The top numbers pick the eaten piece: 1 strip × 1 piece = 1 of them.<br>So ${frac(1, 3)} of ${frac(1, 2)} = ${frac('1 × 1', '2 × 3')} = ${frac(1, 6)}.` });
      return h('div', {},
        h('h2', { class: 'b-title' }, 'Is there a shortcut? Will it always work?'),
        h('table', { class: 'b-table' }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Left'), h('th', {}, 'Eaten of what’s left'), h('th', {}, 'Of the whole pan'))), tbody),
        h('div', { class: 'b-row-btns' },
          h('button', { type: 'button', class: 'btn ghost', onclick: () => cells.forEach((c) => c.classList.remove('hide')) }, 'Show all answers'),
          h('button', { type: 'button', class: 'btn', onclick: () => why.classList.toggle('hidden-block') }, 'Why does it work?')),
        why);
    });

    add('Same story', () => {
      const lists = STORIES.map((st) => h('ol', {}, st.lines.map((l) => h('li', { class: 'hidden', html: l }))));
      let shown = 0;
      const more = h('button', { type: 'button', class: 'btn', onclick: () => {
        if (shown < 5) { lists.forEach((ol) => ol.children[shown].classList.remove('hidden')); shown++; }
        if (shown >= 5) { more.disabled = true; more.textContent = 'That’s the whole story'; }
      } }, 'Next line');
      const all = h('button', { type: 'button', class: 'btn ghost', onclick: () => { lists.forEach((ol) => [...ol.children].forEach((li) => li.classList.remove('hidden'))); shown = 5; more.disabled = true; more.textContent = 'That’s the whole story'; } }, 'Show both stories');
      return h('div', {},
        h('h2', { class: 'b-title' }, 'Same story, different things'),
        h('div', { class: 'b-stories' }, STORIES.map((st, i) => h('div', { class: 'story' }, h('h3', {}, st.title), lists[i]))),
        h('div', { class: 'b-row-btns' }, more, all));
    });

    add('Analogy', () => h('div', {},
      h('h2', { class: 'b-title' }, 'An analogy is the same story describing different things.'),
      h('p', { class: 'b-sub', style: 'color:var(--ink);font-weight:800' }, 'Your turn: tell the same story about something that is not food.'),
      h('div', { class: 'b-frame', html: FRAME })));

    add('Cool-down', () => h('div', {},
      h('h2', { class: 'b-title' }, 'Cool-down (on your paper)'),
      h('div', { class: 'b-cols' },
        h('div', { class: 'b-card', html: `<h4>1</h4>Half of a pan is left. Maya eats ${frac(1, 4)} of what is left.<br>Draw it. How much of the <b>whole</b> pan does Maya eat?` }),
        h('div', { class: 'b-card', html: '<h4>2</h4>Tell the part-of-a-part story about something that is not food.' }))));

    add('Free pan', () => {
      const col = h('div', { class: 'b-pan-col' });
      const pan = new Pan(col);
      const st = stepsUI(pan, null);
      return h('div', { style: 'display:flex;flex-direction:column;height:100%;min-height:0' },
        h('h2', { class: 'b-title' }, 'Free pan'),
        h('div', { class: 'b-body b-two' }, col, st.el));
    });

    let cur = 0;
    const dots = slides.map((sl, i) => h('button', { type: 'button', 'aria-label': sl.name, title: sl.name, onclick: () => go(i) }));
    const lbl = h('span', { class: 'lbl' });
    dotsEl.append(...dots, lbl);
    function go(i) {
      cur = Math.max(0, Math.min(slides.length - 1, i));
      const sl = slides[cur];
      if (!sl.el) { sl.el = h('div', { style: 'height:100%;display:flex;flex-direction:column;min-height:0' }, sl.make()); }
      stage.replaceChildren(sl.el);
      dots.forEach((d, j) => d.classList.toggle('on', j === cur));
      lbl.textContent = `${cur + 1} / ${slides.length} · ${sl.name}`;
      back.disabled = cur === 0; next.disabled = cur === slides.length - 1;
      history.replaceState(null, '', '#' + (cur + 1));
    }
    back.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur + 1));
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(cur + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(cur - 1);
    });
    go((parseInt(location.hash.slice(1), 10) || 1) - 1);
  }

  window.PartOfAPart = { Pan };
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.page === 'board') board(); else student();
  });
})();
