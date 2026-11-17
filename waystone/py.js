// A small Python, enough for a way: def, assignment, while, if / elif / else, return, break, continue, pass,
// whole numbers, + - * // %, comparisons, and / or / not, len(row), row[i], ripe(plot).
// run() is a generator: it stops at every ripe() so the game can fly a wisp there, then carries on with the answer.
(() => {
  class PyError extends Error { constructor(msg, line) { super(msg); this.line = line; } }
  const KW = new Set(['def', 'while', 'if', 'elif', 'else', 'return', 'break', 'continue', 'pass', 'and', 'or', 'not', 'True', 'False']);
  const tokens = (s, line) => {
    const out = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ' || c === '\t') { i++; continue; }
      if (c === '#') break;
      if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9]/.test(s[j])) j++; out.push({ t: 'num', v: +s.slice(i, j) }); i = j; continue; }
      if (/[A-Za-z_]/.test(c)) { let j = i; while (j < s.length && /[A-Za-z_0-9]/.test(s[j])) j++; const w = s.slice(i, j); out.push(KW.has(w) ? { t: w } : { t: 'name', v: w }); i = j; continue; }
      const two = s.slice(i, i + 2);
      if (['//', '<=', '>=', '==', '!='].includes(two)) { out.push({ t: two }); i += 2; continue; }
      if ('+-*%<>=()[]:,'.includes(c)) { out.push({ t: c }); i++; continue; }
      if (c === '?') throw new PyError('This line still has a ? in it. Show the wisp by hand on the field, or write the line yourself.', line);
      if (c === '/') throw new PyError('Use // to divide. It gives a whole number, and plots are whole.', line);
      throw new PyError('The slate cannot read "' + c + '" here.', line);
    }
    return out;
  };
  const parseExpr = (tk, line) => {
    let p = 0;
    const peek = () => tk[p] && tk[p].t, eat = (t) => { if (peek() !== t) throw new PyError(t === ')' || t === ']' ? 'A bracket is not closed.' : 'Something is missing on this line.', line); return tk[p++]; };
    const BIN = { or: 1, and: 2, '<': 4, '<=': 4, '>': 4, '>=': 4, '==': 4, '!=': 4, '+': 5, '-': 5, '*': 6, '//': 6, '%': 6 };
    const atom = () => {
      const t = tk[p++]; if (!t) throw new PyError('This line stops too soon.', line);
      let e;
      if (t.t === 'num') e = { k: 'num', v: t.v };
      else if (t.t === 'True' || t.t === 'False') e = { k: 'num', v: t.t === 'True' };
      else if (t.t === 'name') e = { k: 'name', v: t.v };
      else if (t.t === '(') { e = expr(0); eat(')'); }
      else if (t.t === '-') return { k: 'neg', a: unary() };
      else throw new PyError('The slate did not expect "' + t.t + '" here.', line);
      for (;;) {
        if (peek() === '(') { p++; const args = []; if (peek() !== ')') { args.push(expr(0)); while (peek() === ',') { p++; args.push(expr(0)); } } eat(')'); if (e.k !== 'name') throw new PyError('Only ripe( ) and len( ) can be called.', line); e = { k: 'call', f: e.v, args }; }
        else if (peek() === '[') { p++; const i = expr(0); eat(']'); e = { k: 'index', a: e, i }; }
        else break;
      }
      return e;
    };
    const unary = () => (peek() === 'not' ? (p++, { k: 'not', a: expr(3) }) : atom());
    const expr = (min) => {
      let a = unary();
      for (;;) { const op = peek(), pr = BIN[op]; if (!pr || pr < min) break; p++; a = { k: 'bin', op, a, b: expr(pr + 1) }; }
      return a;
    };
    const e = expr(0);
    if (p < tk.length) throw new PyError(tk[p].t === '=' ? 'Use == to compare two things. A single = gives a name a value.' : 'There is something extra at the end of this line.', line);
    return e;
  };
  const parse = (src) => {
    const lines = src.replace(/\t/g, '    ').split('\n').map((text, i) => ({ text, n: i + 1, ind: text.match(/^ */)[0].length })).filter((l) => l.text.trim() && !l.text.trim().startsWith('#'));
    let p = 0;
    const block = (ind) => {
      const out = [];
      while (p < lines.length && lines[p].ind === ind) out.push(stmt(ind));
      if (p < lines.length && lines[p].ind > ind) throw new PyError('This line is pushed in too far.', lines[p].n);
      return out;
    };
    const body = (ind, ln) => { if (p >= lines.length || lines[p].ind <= ind) throw new PyError('The line after this one must be pushed in (four spaces).', ln); return block(lines[p].ind); };
    const stmt = (ind) => {
      const L = lines[p++], tk = tokens(L.text, L.n), t0 = tk[0] && tk[0].t, colon = () => { if (!tk.length || tk[tk.length - 1].t !== ':') throw new PyError('This line needs a : at the end.', L.n); return tk.slice(1, -1); };
      if (t0 === 'def') { colon(); const name = tk[1] && tk[1].v, arg = tk[3] && tk[3].v; if (!name || !arg) throw new PyError('The first line should read: def ripe_line(row):', L.n); return { k: 'def', name, arg, body: body(ind, L.n), n: L.n }; }
      if (t0 === 'while') return { k: 'while', c: parseExpr(colon(), L.n), body: body(ind, L.n), n: L.n };
      if (t0 === 'if') {
        const node = { k: 'if', arms: [[parseExpr(colon(), L.n), body(ind, L.n), L.n]], other: null, n: L.n };
        while (p < lines.length && lines[p].ind === ind) {
          const M = lines[p], mt = tokens(M.text, M.n), m0 = mt[0] && mt[0].t;
          if (m0 === 'elif') { p++; if (mt[mt.length - 1].t !== ':') throw new PyError('This line needs a : at the end.', M.n); node.arms.push([parseExpr(mt.slice(1, -1), M.n), body(ind, M.n), M.n]); }
          else if (m0 === 'else') { p++; if (mt.length !== 2 || mt[1].t !== ':') throw new PyError('Write else: by itself.', M.n); node.other = body(ind, M.n); break; }
          else break;
        }
        return node;
      }
      if (t0 === 'elif' || t0 === 'else') throw new PyError('This ' + t0 + ' has no if above it at the same depth.', L.n);
      if (t0 === 'return') return { k: 'return', e: tk.length > 1 ? parseExpr(tk.slice(1), L.n) : null, n: L.n };
      if (t0 === 'break' || t0 === 'continue' || t0 === 'pass') return { k: t0, n: L.n };
      if (t0 === 'name' && tk[1] && tk[1].t === '=') return { k: 'set', name: tk[0].v, e: parseExpr(tk.slice(2), L.n), n: L.n };
      return { k: 'expr', e: parseExpr(tk, L.n), n: L.n };
    };
    if (!lines.length) throw new PyError('The slate is empty.', 1);
    if (lines[0].ind !== 0) throw new PyError('The first line should not be pushed in.', lines[0].n);
    const top = block(0), fn = top.find((s) => s.k === 'def');
    if (!fn) throw new PyError('The way needs a first line: def ripe_line(row):', 1);
    return fn;
  };
  // row: how many plots. The generator yields {ask: i, line} and expects true/false back. Returns the value returned.
  function* run(fn, count, maxSteps = 4000) {
    const env = { [fn.arg]: { row: true } }; let steps = 0;
    const BRK = {}, CNT = {};
    const tick = (n) => { if (++steps > maxSteps) throw new PyError('The wisp is going round and round. This loop never ends.', n); };
    function* ev(e, n) {
      switch (e.k) {
        case 'num': return e.v;
        case 'name': if (!(e.v in env)) throw new PyError('The wisp does not know what "' + e.v + '" is yet.', n); return env[e.v];
        case 'neg': return -(yield* ev(e.a, n));
        case 'not': return !(yield* ev(e.a, n));
        case 'index': { const a = yield* ev(e.a, n), i = yield* ev(e.i, n); if (!a || !a.row) throw new PyError('Only the row has plots to look up.', n); if (typeof i !== 'number' || i !== Math.floor(i)) throw new PyError('A plot number must be a whole number.', n); if (i < 0 || i >= count) throw new PyError('There is no plot ' + i + '. The row runs from 0 to ' + (count - 1) + '.', n); return { plot: i }; }
        case 'call': {
          const args = []; for (const a of e.args) args.push(yield* ev(a, n));
          if (e.f === 'len') { if (!args[0] || !args[0].row) throw new PyError('len( ) counts the plots in the row.', n); return count; }
          if (e.f === 'ripe') { const a = args[0]; if (!a || a.plot === undefined) throw new PyError('ripe( ) needs a plot, like row[mid].', n); return Boolean(yield { ask: a.plot, line: n, env }); }
          throw new PyError('The wisp only knows ripe( ) and len( ).', n);
        }
        case 'bin': {
          const a = yield* ev(e.a, n);
          if (e.op === 'and') return a ? yield* ev(e.b, n) : a;
          if (e.op === 'or') return a ? a : yield* ev(e.b, n);
          const b = yield* ev(e.b, n);
          if (typeof a === 'object' || typeof b === 'object') throw new PyError('A plot is not a number. Use its number, like mid.', n);
          switch (e.op) {
            case '+': return a + b; case '-': return a - b; case '*': return a * b;
            case '//': if (!b) throw new PyError('Nothing can be divided by 0.', n); return Math.floor(a / b);
            case '%': if (!b) throw new PyError('Nothing can be divided by 0.', n); return ((a % b) + b) % b;
            case '<': return a < b; case '<=': return a <= b; case '>': return a > b; case '>=': return a >= b; case '==': return a === b; case '!=': return a !== b;
          }
        }
      }
    }
    function* ex(list) {
      for (const s of list) {
        tick(s.n);
        if (s.k === 'set') env[s.name] = yield* ev(s.e, s.n);
        else if (s.k === 'expr') yield* ev(s.e, s.n);
        else if (s.k === 'return') return { ret: s.e ? yield* ev(s.e, s.n) : null };
        else if (s.k === 'break') return BRK; else if (s.k === 'continue') return CNT;
        else if (s.k === 'if') {
          let done = false, r;
          for (const [c, b, n] of s.arms) if (yield* ev(c, n)) { r = yield* ex(b); done = true; break; }
          if (!done && s.other) r = yield* ex(s.other);
          if (r) return r;
        } else if (s.k === 'while') {
          while (yield* ev(s.c, s.n)) { tick(s.n); const r = yield* ex(s.body); if (r === BRK) break; if (r && r !== CNT) return r; }
        }
      }
    }
    const r = yield* ex(fn.body);
    if (!r || r.ret === null || r.ret === undefined) throw new PyError('The way finished without saying where the line is. It needs a return.', fn.n);
    return { value: r.ret, env };
  }
  const api = { parse, run, PyError };
  if (typeof module !== 'undefined') module.exports = api; else window.PY = api;
})();
