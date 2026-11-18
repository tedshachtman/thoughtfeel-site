// Board renderer. Every (slide, step) is drawn from scratch as plain HTML on a 1920 × 1080 stage, so Back and
// jumps always land on a correct picture. Animations only play when Ted moves forward one step.
// Design rule: one thing in focus at a time. Whatever the class should look at is bright; the rest steps back.
import {boardCopy as c} from './deck.js';

const S = (n, cls = '') => `<i aria-hidden="true" class="sprite s-${n} ${cls}"></i>`;
const IMG = (n, cls = '') => `<img class="px ${cls}" alt="" src="./art/${n}.png" draggable="false">`;
const K = k => `data-key="${k}"`;
const screen = (body, cls = '', sky = 'dawn') => `<article class="lesson ${cls}" style="--sky:url('./art/${sky}.png')">${body}</article>`;
const panel = (tab, body, cls = '', key = '') => `<section class="panel ${cls}" ${key ? K(key) : ''}>${tab ? `<span class="tab">${tab}</span>` : ''}${body}</section>`;
const icon = (i, state = 'idle') => S((i ? 'people' : 'hand') + '-' + state, 'ico');
const badge = (i, text, {state = 'idle', attrs = '', cls = ''} = {}) =>
  `<span class="badge t${i} ${cls}" ${attrs}>${icon(i, state)}<span>${text}</span></span>`;
const stamp = (i, attrs = '') => `<span class="stamp t${i}" ${attrs}>${icon(i, 'locked')}</span>`;
const wash = (text, i, on, attrs = '') => `<mark class="w t${i}${on ? ' on' : ''}" ${attrs}>${text}</mark>`;
const OVAL = 'M 174 11 C 136 -1 63 2 25 13 C -4 22 -2 48 21 59 C 53 77 152 76 182 59 C 209 43 196 16 160 10';
const circled = (word, show, draw) => `<span class="circ">${word}${show ?
  `<svg viewBox="0 0 200 76" preserveAspectRatio="none" aria-hidden="true"><path class="${draw ? 'draw' : ''}" pathLength="1" d="${OVAL}"/></svg>` : ''}</span>`;

// The three steps, always in the same words and the same place. The current one is lit; finished ones get a check.
function tracker(now, all = false) {
  return `<ol class="tracker">${c.steps.map((w, i) => {
    const done = all || i < now;
    return `<li class="${i === now ? 'now' : ''}${done ? ' done' : ''}"><b>${done ? '✓' : i + 1}</b><span>${w}</span></li>`;
  }).join('')}</ol>`;
}
const stepCards = () => `<h1 class="ribbon" ${K('h')}>${c.stepsHeading}</h1><div class="step-row">${c.steps.map((w, i) =>
  `<div class="step-card" ${K('sc' + i)}><div class="big-ico">${S('step' + (i + 1))}</div><b class="num">${i + 1}</b><p>${w}</p></div>`).join('')}</div>`;
const family = walk => `<div class="family${walk ? ' walking' : ''}">${S(walk ? 'dad-walk' : 'dad-rod', 'dad')}${S(walk ? 'boy-walk' : 'boy-bucket', 'boy')}</div>`;

function title(s) {
  return screen(IMG('night', 'bg') + (s ? IMG('dawn', 'bg sunrise') : '') + family(false) +
    `<div class="title-card" ${K('title')}><h1>${c.title}</h1><p>${c.teacher}</p></div>`, 'pano');
}

function outline(s) {
  const card = (tab, cls, key, inner = '<i class="lines"></i>') => `<div class="ol-card ${cls}" ${K(key)}>${tab ? `<span class="tab">${tab}</span>` : ''}${inner}</div>`;
  const third = s < 2 ? card('', 'missing', 'olq', '<span class="q">?</span>') : card(c.labels[2], 'solved', 'ol2');
  const reader = s === 1 ? `<div class="reader-pop" ${K('reader')}>${S('reader-walk', 'reader')}<div class="bubble">${c.readerQuestion}</div></div>`
    : s === 2 ? `<div class="reader-pop" ${K('reader2')}>${S('reader-nod', 'reader')}${S('sparkle', 'spark')}</div>`
    : s >= 3 ? `<div class="panel starters" ${K('starters')}><span class="tab">${c.startersHeading}</span><ul>${c.starters.map(w => `<li>${w}</li>`).join('')}</ul><p>${c.afterStarter} <span class="blank">___</span></p></div>` : '';
  return screen(`<div class="ol-stack">${card(c.labels[0], '', 'ol0')}${card(c.labels[1], '', 'ol1')}${third}</div>${reader}`, 'outline');
}

function steps(s) {
  return screen(`<h1 class="ribbon" ${K('h')}>${c.stepsHeading}</h1><div class="step-row">${c.steps.map((w, i) => i < s
    ? `<div class="step-card" ${K('sc' + i)}><div class="big-ico">${S('step' + (i + 1))}</div><b class="num">${i + 1}</b><p>${w}</p></div>`
    : '<div class="step-card empty"></div>').join('')}</div>`, 'steps');
}

function model(s, anim) {
  // What the class looks at in each step: the claim, the evidence, the reader, or the meaning.
  const focus = [['claim'], ['ev'], ['reader'], ['claim'], ['mean'], ['mean'], ['mean', 'ev'], ['ev'], ['ev'], ['claim', 'ev', 'mean']][s];
  const dim = n => focus.includes(n) ? '' : ' dim';
  const now = s >= 6 ? 2 : s >= 4 ? 1 : s >= 3 ? 0 : -1;
  const claim = panel('CLAIM', `<p>${c.modelClaim[0]}${circled(c.modelClaim[1], s >= 3, s === 3 && anim)}${c.modelClaim[2]}</p>`, 'claim' + dim('claim'), 'claim');
  const e = c.modelEvidence;
  const line = i => {
    const lock = s >= 7 + i;
    const b = lock ? badge(i, c.modelParts[i], {state: s === 9 ? 'locked' : 'idle', attrs: `data-land="m${i}"`}) : '';
    return `<div class="ev-line slot">${e[i][0]}<span class="anchor">${b}${wash(e[i][1], i, lock, `data-wash="m${i}"`)}</span>${e[i][2]}</div>`;
  };
  const art = s >= 8 ? 'dinner' : s >= 7 ? 'yawn' : s >= 3 ? 'fishing' : 'kitchen';
  const ev = s >= 1 ? panel('EVIDENCE', `<div class="ev-text">${line(0)}${line(1)}<div class="ev-line">${e[2]}</div></div><div class="vig">${IMG(art)}</div>`,
    'evidence' + dim('ev'), 'ev') : '';
  const m = c.modelMeaning;
  let lower = '';
  if (s >= 5 && s < 9) lower = `<div class="rack${s === 6 ? ' lift' : ''}">${[0, 1].map(i => s >= 7 + i
    ? badge(i, c.modelParts[i], {cls: 'gone'})
    : badge(i, c.modelParts[i], {attrs: `data-source="m${i}" data-land="r${i}"`})).join('')}</div>`;
  if (s === 9) lower = `<div class="both" ${K('both')}>${S('sparkle', 'spk')}${c.both}</div>`;
  const mean = s >= 4 ? panel('WHAT IT MEANS', `<p>${m[0]}${wash(m[1], 0, s >= 5, 'data-source="mw0"')}${m[2]}${wash(m[3], 1, s >= 5, 'data-source="mw1"')}${m[4]}</p>${lower}`,
    'meaning' + dim('mean'), 'mean') : '';
  const reader = s === 2 ? `<div class="reader-pop low" ${K('reader')}>${S('reader', 'reader')}<div class="bubble">${c.sacrificeQuestion}</div></div>` : '';
  return screen(tracker(now, s === 9) + claim + ev + mean + reader, 'model');
}

function finger(s) {
  const q = c.correct;
  const on = s >= 4;
  const sentence = i => i < 2 ? c.fingers[i]
    : `<span class="${on ? 'ul' : ''}">${q[0]}</span>${q[1]}${on ? stamp(0, 'data-land="f0"') : ''}${wash(q[2], 0, on, 'data-wash="f0"')}${q[3]}${on ? stamp(1, 'data-land="f1"') : ''}${wash(q[4], 1, on, 'data-wash="f1"')}${q[5]}`;
  const tag = i => s >= 4 && i === 2 ? `<span class="tag yes" ${K('tag2')}>${c.verdicts[2]}</span>`
    : s >= 5 && i < 2 ? `<span class="tag no" ${K('tag' + i)}>${c.verdicts[i]}</span>` : '';
  const cards = [0, 1, 2].map(i => {
    const shown = s > i;
    const cls = `${shown ? 'shown' : 'covered'}${on && i === 2 ? ' chosen' : ''}${s >= 5 && i < 2 ? ' wrong' : ''}`;
    return `<div class="fcol"><div class="fcard ${cls}" ${K('f' + i + (shown ? 's' : 'c'))}><b class="num">${i + 1}</b>${shown ? `<p>${sentence(i)}</p>` : ''}</div>
      <div class="fvote">${S('finger' + (i + 1), 'fhand')}${tag(i)}</div></div>`;
  }).join('');
  return screen(`<h1 class="ribbon" ${K('h')}>${c.fingerHeading}</h1><div class="cards3">${cards}</div>`, 'finger', 'morning');
}

function partner(s, anim) {
  // 0 claim · 1 partners name the big idea · 2 circle · 3 partners say the meaning · 4 meaning → two parts
  // 5 strips · 6 which one doesn't fit · 7 B rejected · 8 parts land on A and C · 9 each partner explains, then a share
  const now = s >= 5 ? 2 : s >= 3 ? 1 : s >= 1 ? 0 : -1;
  const claim = panel('CLAIM', `<p>${c.partnerClaim[0]}${circled(c.partnerClaim[1], s >= 2, s === 2 && anim)}${c.partnerClaim[2]}</p>`, 'claim', 'claim');
  const rack = s >= 4 ? panel('HELPFUL MEANS', `<div class="rack col">${[0, 1].map(i =>
    badge(i, c.partnerParts[i], {attrs: `data-source="p${i}" data-land="pr${i}"`})).join('')}</div>`, 'rackp', 'rack') : '';
  let lower = '';
  if (s === 4) {
    const m = c.partnerMeaning;
    lower = panel('WHAT IT MEANS', `<p>${m[0]}${wash(m[1], 0, true, 'data-source="pw0"')}${m[2]}${wash(m[3], 1, true, 'data-source="pw1"')}${m[4]}</p>`, 'pmeaning', 'pmean');
  }
  if (s >= 5) lower = `<div class="strips">${c.strips.map((st, i) => {
    const lock = s >= 8 && i !== 1, rejected = s >= 7 && i === 1;
    const text = st.parts.map(p => typeof p === 'string' ? p
      : (lock ? stamp(p[1], `data-land="s${i}${p[1]}"`) : '') + wash(p[0], p[1], lock, `data-wash="s${i}${p[1]}"`)).join('');
    return `<div class="strip${rejected ? ' rejected' : ''}${lock ? ' good' : ''}" ${K('strip' + i)}><div class="sart">${IMG(st.art)}<b class="letter">${st.letter}</b></div>
      <p>${text}</p>${rejected ? `<span class="tag no" ${K('nowork')}>${c.noWork}</span>` : ''}</div>`;
  }).join('')}</div>`;
  const ribbon = s === 3 ? `<div class="ribbon bottom" ${K('without')}>${c.withoutHelpful}</div>`
    : s === 6 ? `<div class="ribbon bottom" ${K('ask')}>${c.partnerQuestion}</div>`
    : s >= 9 ? `<div class="ribbon bottom frame" ${K('frame')}>${c.frame}</div>` : '';
  return screen(tracker(now) + `<div class="ptop${s >= 4 ? ' with-rack' : ''}">${claim}${rack}</div>` + lower + ribbon, 'partner', 'morning');
}

function writing(s) {
  // 0 recap · 1 claim · 2 evidence · 3 partners say the meaning · 4 your job · 5 finished
  if (s === 0) return screen(stepCards(), 'steps recap', 'morning');
  return screen(tracker(-1) +
    panel('CLAIM', `<p>${c.workClaim}</p>`, 'claim', 'claim') +
    (s >= 2 ? panel('EVIDENCE', `<div class="ev-text"><p>${c.workEvidence}</p></div><div class="vig">${IMG('bait')}<span class="shop-sign">${c.storeSign}</span></div>`, 'evidence', 'ev') : '') +
    (s === 3 ? `<div class="ribbon without" ${K('without')}>${c.withoutHard}</div>` : '') +
    (s >= 4 ? panel('YOUR JOB', `<ol class="dirs">${c.directions.map((w, i) => `<li><b>${i + 1}</b><span>${w}</span></li>`).join('')}</ol>`, 'dirsp', 'dirs') : '') +
    (s >= 5 ? `<div class="ribbon finished" ${K('fin')}><b>${c.finished}</b> ${c.extra}</div>` : ''), 'writing', 'morning');
}

function camp() {
  return screen(`<div class="camp-grid"><div class="camp-left">
      ${panel('CLAIM', `<p>${c.workClaim}</p>`, 'claim')}
      ${panel('EVIDENCE', `<p>${c.workEvidence}</p>`, 'evidence')}
      <ol class="mini-steps">${c.steps.map((w, i) => `<li><b>${i + 1}</b><span>${w}</span></li>`).join('')}</ol>
    </div>
    <div class="panel camp-clock"><div class="camp-frame">${IMG('camp')}${IMG('camp-morning', 'camp-light')}${S('flame7', 'camp-flame')}</div><time>6:00</time></div>
  </div>`, 'camp', 'morning');
}

function closing(s) {
  // 0 partners check and share · 1 remember · 2 thanks
  const top = s < 1
    ? `<div class="panel share" ${K('share')}><h2>${c.share}</h2><ul>${c.checks.map(w => `<li><i class="box"></i>${w}</li>`).join('')}</ul></div>`
    : `<div class="panel close-card" ${K('close')}><h2>${c.close}</h2>${tracker(-1, true)}</div>`;
  const thanks = s === 2 ? `<div class="ribbon thanks" ${K('thx')}>${c.thanks}</div>` : '';
  return screen(IMG('morning', 'bg') + (s >= 1 ? IMG('gold', 'bg final-sun') : '') + family(s >= 1) + top + thanks, 'pano closing');
}

const views = [title, outline, steps, model, finger, partner, writing, camp, closing];

// ---------- animation ----------
const EASE = 'cubic-bezier(.2,.75,.25,1)';
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const run = (el, frames, duration = 450, delay = 0, extra = {}) => el?.animate(frames, {duration, delay, easing: EASE, fill: 'backwards', ...extra});
function rect(el, board) {
  const b = board.getBoundingClientRect(), r = el.getBoundingClientRect(), k = board.offsetWidth / b.width;
  return {x: (r.left - b.left) * k, y: (r.top - b.top) * k, w: r.width * k, h: r.height * k};
}
function sweep(el, delay = 0) {
  el?.animate([{backgroundSize: '0% 100%'}, {backgroundSize: '100% 100%'}], {duration: 420, delay, fill: 'backwards', easing: 'ease-out'});
}
// A badge travels in an arc. "grow": the destination badge starts at the source's place and size.
// "shrink": a copy of the source badge flies to a small stamp and turns into it.
function flight(board, from, toEl, {delay = 0, dur = 820, mode = 'grow', node = null, wash = null} = {}) {
  if (!from || !toEl) return;
  const lesson = board.firstElementChild, to = rect(toEl, board);
  const g = (mode === 'grow' ? toEl : node).cloneNode(true);
  for (const a of ['data-key', 'data-land', 'data-source']) g.removeAttribute(a);
  g.classList.add('ghost');
  const base = mode === 'grow' ? to : from;
  Object.assign(g.style, {position: 'absolute', left: base.x + 'px', top: base.y + 'px', width: base.w + 'px', height: base.h + 'px',
    right: 'auto', bottom: 'auto', margin: '0', zIndex: '60', boxSizing: 'border-box'});
  lesson.append(g);
  const dx = (from.x + from.w / 2) - (to.x + to.w / 2), dy = (from.y + from.h / 2) - (to.y + to.h / 2);
  let frames;
  if (mode === 'grow') {
    const sx = from.w / to.w, sy = from.h / to.h;
    frames = [{transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})`, opacity: .6},
      {offset: .55, transform: `translate(${dx * .45}px,${dy * .45 - 90}px) scale(1.1)`, opacity: 1},
      {offset: .85, transform: 'translate(0,-10px) scale(1.04)'}, {transform: 'none', opacity: 1}];
  } else {
    const k = to.h / from.h;
    frames = [{transform: 'none', opacity: 1},
      {offset: .55, transform: `translate(${-dx * .55}px,${-dy * .55 - 90}px) scale(1.06)`, opacity: 1},
      {offset: .9, transform: `translate(${-dx}px,${-dy}px) scale(${k})`, opacity: .9}, {transform: `translate(${-dx}px,${-dy}px) scale(${k * .8})`, opacity: 0}];
  }
  g.animate(frames, {duration: dur, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both'}).onfinish = () => g.remove();
  toEl.animate([{opacity: 0}, {opacity: 0, offset: .92}, {opacity: 1}], {duration: dur, delay, fill: 'backwards'});
  if (wash) sweep(wash, delay + dur - 160);
}
function play(board, slide, step, keys, before) {
  // Transitions only: new things fade in, badges travel to where they belong, the circle draws.
  // Nothing already on the board shakes, bounces, wiggles or pops.
  const $ = q => board.querySelector(q), $$ = q => [...board.querySelectorAll(q)];
  const fresh = $$('[data-key]').filter(el => !keys.has(el.dataset.key));
  if (still()) { fresh.forEach(el => run(el, [{opacity: 0}, {opacity: 1}], 200)); return; }
  fresh.forEach((el, i) => {
    let frames = [{opacity: 0, transform: 'translateY(26px)'}, {opacity: 1, transform: 'none'}], delay = 0, dur = 480;
    if (el.matches('.step-card,.strip,.ol-card')) delay = i * 110;
    if (el.matches('.reader-pop')) { frames = [{opacity: 0, transform: 'translateX(160px)'}, {opacity: 1, transform: 'none'}]; dur = 700; }
    run(el, frames, dur, delay);
  });
  const here = q => { const el = $(q); return el && rect(el, board); };
  if (slide === 0 && step === 1) run($('.sunrise'), [{opacity: 0}, {opacity: 1}], 3000);
  if (slide === 6 && step === 0) return;
  if (slide === 3) {
    if (step === 5) [0, 1].forEach(i => { sweep($(`[data-source="mw${i}"]`), i * 260); flight(board, before['mw' + i], $(`[data-land="r${i}"]`), {delay: 250 + i * 260, dur: 700}); });
    if (step === 7 || step === 8) { const i = step - 7; flight(board, before['m' + i], $(`[data-land="m${i}"]`), {wash: $(`[data-wash="m${i}"]`)}); run($('.vig img'), [{opacity: .2}, {opacity: 1}], 500, 150); }
  }
  if (slide === 4 && step === 4) [0, 1].forEach(i => { run($(`[data-land="f${i}"]`), [{opacity: 0}, {opacity: 1}], 400, 300 + i * 300); sweep($(`[data-wash="f${i}"]`), 300 + i * 300); });
  if (slide === 5) {
    if (step === 4) [0, 1].forEach(i => flight(board, here(`[data-source="pw${i}"]`), $(`[data-land="pr${i}"]`), {delay: 650 + i * 280, dur: 750}));
    if (step === 8) [0, 2].forEach((s, j) => [0, 1].forEach(i => {
      const src = $(`[data-source="p${i}"]`);
      flight(board, rect(src, board), $(`[data-land="s${s}${i}"]`), {mode: 'shrink', node: src, delay: j * 500 + i * 220, dur: 760, wash: $(`[data-wash="s${s}${i}"]`)});
    }));
  }
  if (slide === 8 && step === 1) {
    run($('.final-sun'), [{opacity: 0}, {opacity: 1}], 1800);
    run($('.family'), [{transform: 'translate(120px,40px)'}, {transform: 'none'}], 1600);
  }
}

let shown = -1;
export function renderBoard(slide, step, animate = false) {
  const board = document.getElementById('stage');
  const same = shown === slide;
  const keys = new Set(same ? [...board.querySelectorAll('[data-key]')].map(el => el.dataset.key) : []);
  const before = {};
  if (animate && same) board.querySelectorAll('[data-source]').forEach(el => { before[el.dataset.source] = rect(el, board); });
  board.innerHTML = views[slide](step, animate);
  if (animate && !same && !still()) run(board.firstElementChild, [{opacity: 0}, {opacity: 1}], 380);
  if (animate) play(board, slide, step, keys, before);
  shown = slide;
}

export function updateTimer(remainingMs, running) {
  const board = document.getElementById('stage'), fire = board.querySelector('.camp-flame');
  if (!fire) return;
  const secs = Math.max(0, Math.ceil(remainingMs / 1000));
  board.querySelector('.camp-clock time').textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
  // Eight flame sizes: full for most of the time, embers in the last minute.
  const size = secs <= 60 ? 0 : Math.min(7, Math.ceil((secs - 60) / 300 * 7));
  const motion = !still() && running;
  const flicker = motion ? [0, 1, 0, 2][Math.floor(remainingMs / 400) % 4] : 0;
  const pose = 's-flame' + size + (flicker ? '-' + flicker : '');
  if (fire.dataset.pose !== pose) { fire.className = 'sprite camp-flame ' + pose; fire.dataset.pose = pose; }
  board.querySelector('.camp-light').style.opacity = String(1 - Math.min(1, secs / 360));
}
