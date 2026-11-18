// Skulpt owns parsing, arithmetic, control flow and stack frames. Our two world
// operations expose an opaque plot and a suspension at the point of tasting it.
(() => {
  class PyError extends Error {
    constructor(message, line) { super(message); this.line = line; }
  }
  const calls = 'The wisp only knows ripe( ) and len( ).';
  const syntax = 'The slate cannot read this line.';
  // The host serves scripts under a self-only policy. Interpret Skulpt's emitted
  // ES5 module as data instead of asking the browser to compile a string.
  Sk.evaluateSlateModule = code => new eval5.Interpreter({Sk, Date, Math, Object, Array, Error}).evaluate(code);
  let steps = 0, current = 1;
  Sk.configure({__future__: Sk.python3, debugging: true, breakpoints: (_, line) => {
    current = line;
    if (++steps > 10000) throw new PyError('The wisp is going round and round. This loop never ends.', line);
    return false;
  }});
  const allowed = new Set('Assign AugAssign Return While For If List Tuple Dict Set Str IfExp Pass Continue Break Expr Name Num NameConstant BinOp UnaryOp BoolOp Compare Subscript Index Call'.split(' '));
  function inspect(node) {
    if (!node || !node._astname) return;
    const kind = node._astname;
    if (['Import','ImportFrom'].includes(kind) || (kind === 'Call' && (!['len','ripe'].includes(node.func.id?.v) || node.keywords.length))) throw new PyError(calls,node.lineno);
    if (!allowed.has(kind) || (kind === 'Name' && (node.id.v.startsWith('_') || node.ctx === Sk.astnodes.Store && ['len','ripe'].includes(node.id.v)))) throw new PyError(syntax,node.lineno);
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(inspect); else inspect(v);
    }
  }
  function translate(e) {
    if (e instanceof PyError) return e;
    if (e.nativeError instanceof PyError) return e.nativeError;
    const line = e.traceback?.[0]?.lineno || current;
    const msg = e.args?.v?.[0]?.v || '';
    if(e.tp$name==='IndentationError') return new PyError(/expected an indented block/.test(msg)?'The line after this one must be pushed in (four spaces).':'This line is pushed in too far.',line);
    if (/NameError|UnboundLocal/.test(e.tp$name)) return new PyError('The wisp does not know what "'+(msg.match(/'([^']+)'/)||[])[1]+'" is yet.',line);
    if (e.tp$name === 'ZeroDivisionError') return new PyError('Nothing can be divided by 0.',line);
    return new PyError(syntax,line);
  }
  function parse(source) {
    const lines = source.split('\n').map(s=>s.split('#')[0].trimEnd());
    const first = lines.findIndex(s=>s.trim());
    if (first<0) throw new PyError('The slate is empty.',1);
    lines.forEach((s,i)=>{
      if (/^\s*(?:from\s+\S+\s+import|import\s+)/.test(s)) throw new PyError(calls,i+1);
      if (s.includes('?')) throw new PyError('This line still has a ? in it. Show the wisp by hand on the field, or write the line yourself.',i+1);
      if (/(^|[^/])\/(?!\/)/.test(s)) throw new PyError('Use // to divide. It gives a whole number, and plots are whole.',i+1);
      if (/^\s*(def|if|else|elif|while)\b/.test(s) && !s.includes(':')) throw new PyError('This line needs a : at the end.',i+1);
    });
    if (!/^def\s+ripe_line\s*\(\s*row\s*\)\s*:$/.test(lines[first])) throw new PyError('The way needs a first line: def ripe_line(row):',first+1);
    let indent=0, prev=first;
    for(let i=first+1;i<lines.length;i++) {
      if(!lines[i].trim()) continue;
      const n=lines[i].search(/\S/);
      if(lines[prev].endsWith(':') && n<=indent) throw new PyError('The line after this one must be pushed in (four spaces).',prev+1);
      if(!lines[prev].endsWith(':') && n>indent) throw new PyError('This line is pushed in too far.',i+1);
      indent=n;prev=i;
    }
    if(lines[prev].endsWith(':')) throw new PyError('The line after this one must be pushed in (four spaces).',prev+1);
    try {
      const tree=Sk.parse('slate',source+'\n'), ast=Sk.astFromParse(tree.cst,'slate',tree.flags);
      if(ast.body.length!==1) throw new PyError(syntax,ast.body[1].lineno);
      ast.body[0].body.forEach(inspect);
      steps=0;
      return Sk.importMainWithBody('slate',false,source+'\n',true).$d;
    } catch(e) {throw translate(e);}
  }
  function* run(fn,n) {
    const plots=Array.from({length:n},()=>new Sk.builtin.object());
    const row=new Sk.builtin.list(plots);
    row.mp$subscript=i=>{
      if(!Sk.builtin.checkInt(i)) throw new PyError('A plot number must be a whole number.',current);
      const k=i.v;
      if(k<0||k>=n) throw new PyError('There is no plot '+k+'. The row runs from 0 to '+(n-1)+'.',current);
      return plots[k];
    };
    fn.ripe=new Sk.builtin.func(plot=>{
      const ask=plots.indexOf(plot);
      if(ask<0) throw new PyError('ripe( ) needs a plot, like row[mid].',current);
      const pause=new Sk.misceval.Suspension();
      pause.data={type:'taste',ask};pause.resume=()=>Sk.ffi.remapToPy(pause.data.answer);
      return pause;
    });
    let env={};steps=0;
    try {
      let result=Sk.misceval.callsimOrSuspendArray(fn.ripe_line,[row]);
      while(result instanceof Sk.misceval.Suspension) {
        if(result.data.type==='taste') {
          const locals={...result.$loc,...result.$tmps};
          env=Object.fromEntries(['lo','hi','mid'].map(k=>[k,locals[k]?.v]));
          result.data.answer=yield {ask:result.data.ask,env,line:result.$lineno};
          steps=0;
        }
        result=result.resume();
      }
      if(result===Sk.builtin.none.none$) throw new PyError('The way finished without saying where the line is. It needs a return.',current);
      return {value:Sk.ffi.remapToJs(result),env};
    } catch(e){throw translate(e);}
  }
  window.PY={parse,run,PyError};
})();
