import {boardCopy as c} from './deck.js';

const sprite = (name, cls = '') => `<i aria-hidden="true" class="sprite s-${name} ${cls}"></i>`;
const picture = (name, cls = '') => `<img class="pixel-art ${cls}" alt="" src="./art/${name}.png" draggable="false">`;
const key = n => `data-key="${n}"`;
const label = txt => `<span class="paper-label">${txt}</span>`;
const box = (content, cls = '', attrs = '') => `<div class="paper ${cls}" ${attrs}>${content}</div>`;
const artFrame = (name, cls = '') => `<div class="art-frame ${cls}">${picture(name)}${name==='bait'?`<span class="shop-sign">${c.storeSign}</span>`:''}</div>`;
const icon = i => sprite(i ? 'people' : 'hand');
const marked = (text, part, active, attrs = '') => `<span class="phrase ${active ? 'washed' : ''} tone${part}" ${attrs}>${text}</span>`;
const badge = (name, i, attrs = '', check = false) => `<span class="badge tone${i}" ${attrs}>${icon(i)}<span>${name}</span>${check ? '<b>✓</b>' : ''}</span>`;
const tag = (text, cls='') => `<span class="post ${cls}">${text}</span>`;
const chips = (hot = -1, cls = '') => `<div class="chips ${cls}">${c.steps.map((w,i) => `<div class="chip ${i === hot || hot === 3 ? 'on' : ''}"><b>${i+1}</b><span>${w}</span></div>`).join('')}</div>`;
const circle = (parts, show, draw) => parts[0] + `<span class="circled ${draw ? 'drawing' : ''}">${parts[1]}${show ? `<svg viewBox="0 0 200 76" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M 174 11 C 136 -1 63 2 25 13 C -4 22 -2 48 21 59 C 53 77 152 76 182 59 C 209 43 196 16 160 10"/></svg>${draw ? sprite('pen','writing-pen') : ''}` : ''}</span>` + parts[2];
const claim = (html, cls = '') => box(label(c.labels[0]) + html, `claim-card ${cls}`, key('claim'));
const evidence = (html, vignette) => box(artFrame(vignette) + `<div>${label(c.labels[1])}${html}</div>`, 'evidence-card', key('evidence'));
const reader = (question, pose='reader') => `<div class="reader" ${key('reader')}>${sprite(pose)}${box(question,'bubble')}</div>`;
const screen = (body, cls = '', sky = 'dawn') => `<article class="lesson ${cls}" style="--scene:url('./art/${sky}.png')">${body}</article>`;
const scenePeople = (walking=false) => `<div class="family ${walking ? 'walking' : ''}">${sprite(walking?'dad-walk':'dad-rod','dad')}${sprite(walking?'boy-walk':'boy-bucket','boy')}</div>`;

function title(s) {
  return screen(picture('night','landscape') + (s ? picture('dawn','landscape sunrise') + '<i class="pond-layer pond-ripples ambient-ripple"></i>' : '') + scenePeople() +
    box(`<h1>${c.title}</h1><div class="byline">${c.teacher}</div>`,'title-panel'), 'panorama opening');
}
function outline(s) {
  const cards = c.labels.map((name,i) => box(i===2 && s<2 ? c.question : label(name) + '<span class="lines"></span>',
    `outline-card ${i===2 ? (s<2?'missing':'solved') : ''}`,key(i===2 && s===2?'answer':'outline'+i))).join('');
  return screen(`<section class="outline-stack">${cards}</section>${s ? reader(c.readerQuestion,s===2?'reader-nod':'reader-walk') : ''}${s===2?sprite('sparkle','understood'):''}`, 'outline-page');
}
function steps(s) {
  return screen(`<h1 class="ribbon">${c.stepsHeading}</h1><div class="step-row">${c.steps.slice(0,s).map((w,i)=>box(
    `<div class="step-art">${sprite('step'+(i+1))}</div><div class="step-index">${i+1}</div><p>${w}</p>`, 'step-card',key('card'+i))).join('')}</div>`, 'steps-page');
}
function model(s, animated) {
  const e = c.modelEvidence, m = c.modelMeaning;
  const evidencePart = i => {
    const locked = s >= 7+i;
    return `<span class="match">${locked ? `<span class="pin-line">${badge(c.modelParts[i],i,`data-land="m${i}"`,s===9)}<span class="pin-answer">${c.modelAnswers[i]}</span></span>` : ''}
      ${marked(e[i][1],i,locked,`data-wash="m${i}"`)}</span>`;
  };
  // Keep the same evidence phrases on stable lines as each pin arrives.
  const lines = `<div class="model-line">${e[0][0]}${evidencePart(0)}${e[0][2]}</div><div class="model-line">${e[1][0]}${evidencePart(1)}${e[1][2]}</div><div class="model-end">${e[2]}</div>`;
  const evidenceArt = s>=8?'dinner':s>=7?'yawn':s>=3?'fishing':'kitchen';
  const ev = box(`<div class="model-window">${artFrame(evidenceArt)}${s===3 && animated?picture('kitchen','dissolve-out'):''}</div><div class="model-lines">${label(c.labels[1])}${lines}</div>`, 'model-evidence',key('evidence'));
  const meaning = `<div class="definition" ${key('meaning')}>${m[0]}${marked(m[1],0,s>=5,'data-source="meaning0"')}${m[2]}${marked(m[3],1,s>=5,'data-source="meaning1"')}${m[4]}</div>`;
  const rack = `<div class="rack ${s===6 ? 'lift' : ''}">${c.modelParts.map((name,i)=>badge(name,i,s<7+i ? `data-source="m${i}" data-land="split${i}"` : 'style="visibility:hidden" aria-hidden="true"')).join('')}</div>`;
  return screen(chips(s>=6?2:s>=4?1:s===3?0:-1) + claim(circle(c.modelClaim,s>=3,s===3 && animated)) +
    (s>=1?ev:'') + (s===2?reader(c.sacrificeQuestion):'') + (s>=4?box(meaning + (s>=5 && s<8?rack:''),'meaning-card',key('meaningCard')):'') +
    (s===9?box(c.both,'model-result',key('both')):''), 'model-page');
}
function finger(s) {
  const q = c.correct;
  const pin = (i, words) => marked(words,i,s>=5,`data-wash="f${i}"`) + (s>=5?`<span class="inline-stamp tone${i}" data-land="f${i}" aria-label="${c.modelParts[i]}">${icon(i)}</span>`:'');
  const third = `<span class="${s>=5?'underlined':''}">${q[0]}</span>${q[1]}${pin(0,q[2])}${q[3]}${pin(1,q[4])}${q[5]}`;
  const cards = [...c.fingers,third].map((sent,i)=>`<div class="finger-col"><div class="finger-shell ${s>=5 && i===2?'chosen':''} ${s===6 && i<2?'quiet':''}">${s===6 && i<2?box(label(c.labels[i]),'ghost',key('ghost'+i)):''}
    ${box(`<b class="numeral">${i+1}</b>${s>=i+1 ? `<p>${sent}</p>` : '<div class="pond-pattern"></div>'}${s>=5 && i===2 ? `<div class="answer-key">${c.modelParts.map((w,j)=>badge(w,j)).join('')}</div>`:''}`,
    'finger-card '+(s>i?'shown':'covered'),key('finger'+i+(s>i?'front':'back')))}</div>
    <div class="finger-vote">${sprite('finger'+(i+1))}${(s>=5 && i===2)||(s===6 && i<2)?tag(c.verdicts[i],i===2?'yes':''):''}</div></div>`).join('');
  return screen(chips() + `<h1 class="ribbon">${c.fingerHeading}</h1><div class="finger-row ${s>=5?'revealed':''}">${cards}</div>`, 'finger-page','morning');
}
function partner(s, animated) {
  const m=c.partnerMeaning;
  const definition = box(`<div class="partner-definition">${m[0]}${marked(m[1],0,true,'data-source="pdef0"')}${m[2]}${marked(m[3],1,true,'data-source="pdef1"')}${m[4]}</div>`,'partner-meaning',key('partner-def'));
  const rack = `<div class="partner-rack ${s===4?'lift':''}">${c.partnerParts.map((name,i)=>badge(name,i,`data-source="p${i}" data-land="psplit${i}"`)).join('')}</div>`;
  const strips = c.strips.map((a,i)=>{
    const lock = s>=6 && i!==1;
    const workPin = lock ? `<span class="inline-stamp tone0" data-land="work${i}">${icon(0)}</span>` : '';
    const words = i===1?a[0]:a[0]+marked(a[1],0,lock,`data-wash="work${i}"`)+workPin+a[2];
    return box(`<div class="strip-scene ${lock?'help-lit':''}">${artFrame(['fire','memory','bucket'][i])}<b class="strip-letter">${c.stripLetters[i]}</b>
      ${lock?badge(c.less,1,`data-land="help${i}"`):''}</div>
      <div class="strip-words">${words}</div>${lock?badge(c.partnerParts[0],0):''}${s>=5 && i===1 ? tag(c.noWork):''}`, 'strip '+(s>=5 && i===1?'rejected':''), key('strip'+i));
  }).join('');
  return screen(chips(s>=3?2:s===2?1:s===1?0:-1)+claim(circle(c.partnerClaim,s>=1,s===1&&animated))+
    (s===2?definition:'')+(s>=2 && s<6?rack:'')+(s>=3?`<div class="strips">${strips}</div>`:'')+
    (s===4?box(c.partnerQuestion,'partner-footer',key('question')):'')+(s>=6?box(c.frame,'partner-footer',key('frame')):''),'partner-page','morning');
}
function writing(s) {
  return screen(chips(-1,'large-chips')+(s>=1?claim(c.workClaim):'')+(s>=2?evidence(c.workEvidence,'bait'):'')+
    (s>=3?box(c.directions.map((w,i)=>`<div class="direction">${sprite(['pen','step2','pen'][i])}<b>${i+1}.</b> ${w}</div>`).join(''),'direction-list',key('directions')):'')+
    (s>=4?box(`<strong>${c.finished}</strong> ${c.extra}`,'finish-card',key('finished')):''), 'writing-page','morning');
}
function camp() {
  return screen(chips()+`<div class="camp-grid"><section>${claim(c.workClaim)}${evidence(c.workEvidence,'bait')}</section>
    <section class="camp-clock paper"><div class="camp-frame">${picture('camp')}${picture('camp-morning','camp-light')}${sprite('flame7','camp-flame')}</div><time>7:00</time></section></div>`,'camp-page','morning');
}
function closing(s) {
  const card = s<3?box(`<h1>${c.share}</h1><div class="checklist">${c.checks.map(w=>`<div>☐ ${w}</div>`).join('')}</div>`,'share-card'):
    box(`<h1>${c.close}</h1>`,'close-card',key('closing'));
  return screen(picture('morning','landscape')+(s>=3?picture('gold','landscape final-sun'):'')+scenePeople(s>=3)+
    (s<3?chips():'')+card+(s===1||s===2?box(c.note,'sticky-card',key('sticky')):'')+
    (s>=3?chips(3,'close-chips'):'')+(s===4?box(c.thanks,'thanks',key('thanks')):''), 'panorama closing');
}

const views = [title, outline, steps, model, finger, partner, writing, camp, closing];
let previousSlide = -1;
const stage = () => document.getElementById('stage');
const selectors = (root, s) => [...root.querySelectorAll(s)];
const run = (el, frames, duration=480, delay=0) => el?.animate(frames,{duration,delay,easing:'cubic-bezier(.2,.74,.25,1)',fill:'backwards'});
const fade = [{opacity:0},{opacity:1}];
function rect(el, board) {
  if (!el) return null;
  const frame = board.getBoundingClientRect(), r = el.getBoundingClientRect();
  const scale = board.offsetWidth/frame.width;
  return {x:(r.left-frame.left)*scale,y:(r.top-frame.top)*scale,w:r.width*scale,h:r.height*scale};
}
function origin(el,board) {
  const bounds=rect(el,board);
  if(bounds && el.matches('.badge')) {
    bounds.badge=el.cloneNode(true);
    bounds.size=getComputedStyle(el).fontSize;
  }
  return bounds;
}
function sweep(el, delay) {
  if (!el) return;
  el.animate([{backgroundSize:'0% 100%'},{backgroundSize:'100% 100%'}],{delay,duration:390,fill:'backwards',easing:'ease-out'});
}
function flight(board, source, target, sweepTarget, delay=0) {
  if (!target||!source) return;
  const dest = rect(target,board);
  const travel = 640;
  // When words pin down to an icon, let the labeled badge travel first.
  const compact = target.matches('.inline-stamp') && source.badge;
  const ghost = compact ? source.badge.cloneNode(true) : target.cloneNode(true);
  ghost.setAttribute('aria-hidden','true');
  ghost.removeAttribute('data-land');
  ghost.classList.add('flying-pin');
  const x = source.x + source.w/2 - dest.x - dest.w/2;
  const y = source.y + source.h/2 - dest.y - dest.h/2;
  const startScale = compact ? 1 : Math.max(.73,Math.min(1.4,source.h/dest.h));
  const width=compact ? source.w : dest.w, height=compact ? source.h : dest.h;
  Object.assign(ghost.style,{
    left:(dest.x+(dest.w-width)/2)+'px',top:(dest.y+(dest.h-height)/2)+'px',
    width:width+'px',height:height+'px',fontSize:compact ? source.size : getComputedStyle(target).fontSize
  });
  board.append(ghost);
  const flightAnim = ghost.animate([
    {transform:`translate(${x}px,${y}px) scale(${startScale})`,opacity:.75},
    {offset:.54, transform:`translate(${x*.40}px,${y*.46-65}px) scale(1.07) rotate(${x>=0?4:-4}deg)`,opacity:1},
    {offset:.89, transform:compact?'translate(0,-7px) scale(.53)':'translate(0,-7px) scale(1.02)',opacity:1},
    {transform:compact?'scale(.25)':'none',opacity:compact?0:1}
  ],{duration:travel,delay,fill:'both',easing:'cubic-bezier(.35,.05,.2,1)'});
  flightAnim.onfinish=()=>ghost.remove();
  run(target,[{opacity:0,offset:0},{opacity:0,offset:.92},{opacity:1}],travel,delay);
  sweep(sweepTarget,delay+travel-140);
}
function animateState(board, slide, step, previousKeys, sources) {
  const find = s=>board.querySelector(s), all=s=>selectors(board,s);
  const entries=all('[data-key]').filter(el=>!previousKeys.has(el.dataset.key));
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(still) { entries.forEach(el=>run(el,fade,180));return; }
  const enter = [{opacity:0,translate:'0 18px'},{opacity:1,translate:'0 0'}];
  entries.forEach((el,i)=>{
    let movement=enter, delay=0;
    if(el.matches('.strip,.outline-card')) delay=Math.min(3,i)*85;
    if(el.matches('.finger-card.shown')) movement=[{opacity:.25,transform:'perspective(1000px) rotateY(-82deg)'},{opacity:1,transform:'perspective(1000px) rotateY(0)'}];
    if(el.matches('.reader')) movement=[{opacity:0,translate:'70px 0'},{opacity:1,translate:'0 0'}];
    if(el.matches('.ghost')) movement=[{opacity:0,translate:'22px 10px'},{opacity:1,translate:'0 0'}];
    run(el,movement,el.matches('.reader')?750:500,delay);
  });
  const bounce = [{translate:'0 0'},{translate:'0 -12px',offset:.45},{translate:'0 0'}];
  function fly(sourceKey,landKey,washKey,delay=0) {
    const src = sources[sourceKey] ?? origin(find(`[data-source="${sourceKey}"]`),board);
    flight(board,src,find(`[data-land="${landKey}"]`),washKey && find(`[data-wash="${washKey}"]`),delay);
  }
  if(slide===0 && step===1) run(find('.sunrise'),fade,3000);
  function walk(el, alternate, duration) {
    if(!el) return;
    const tile=document.createElement('i');
    tile.className='sprite s-'+alternate;
    el.parentElement.append(tile);
    const next=getComputedStyle(tile).backgroundPosition;
    tile.remove();
    const current=getComputedStyle(el).backgroundPosition;
    el.animate([{backgroundPosition:current},{backgroundPosition:next,offset:.5},{backgroundPosition:current}],{duration:duration/3,iterations:3,easing:'steps(1,end)'});
  }
  if(slide===1 && step===1) {
    run(find('.missing'),[{scale:'1'},{scale:'1.045'},{scale:'1'}],650);
    walk(find('.s-reader-walk'),'reader-walk2',650);
  }
  if(slide===2 && step===4) all('.step-card').forEach(el=>run(el,bounce));
  if(slide===3) {
    if(step===5) [0,1].forEach(i=>{sweep(find(`[data-source="meaning${i}"]`),i*180);fly('meaning'+i,'split'+i,null,i*180)});
    if(step===6) all('.rack .badge').forEach(el=>run(el,bounce,740));
    if(step===7||step===8) {const index=step-7;fly('m'+index,'m'+index,'m'+index);}
    if(step===9) all('.pin-line .badge').forEach(el=>{run(el,bounce);const flash=document.createElement('i');flash.className='sprite s-sparkle pin-spark';el.append(flash);run(flash,[{opacity:0,scale:'.5'},{opacity:1,scale:'1.2'},{opacity:0,scale:'1.3'}],640).onfinish=()=>flash.remove()});
  }
  if(slide===4 && step===4) all('.finger-vote .sprite').forEach(el=>run(el,[{rotate:'0deg'},{rotate:'-10deg'},{rotate:'7deg'},{rotate:'0deg'}],520));
  if(slide===4 && step===5) {
    all('.answer-key .badge').forEach((el,i)=>flight(board,origin(el,board),find(`[data-land="f${i}"]`),find(`[data-wash="f${i}"]`),i*210));
    run(find('.chosen'),[{translate:'0 7px'},{translate:'0 0'}],450);
  }
  if(slide===4 && step>=5) all('.finger-vote .post').filter((el,i,a)=>step===5||i<a.length-1).forEach(el=>run(el,enter,400));
  if(slide===5) {
    if(step===2) [0,1].forEach(i=>fly('pdef'+i,'psplit'+i,null,i*190));
    if(step===4) all('.partner-rack .badge').forEach(el=>run(el,bounce,740));
    if(step===5) {
      const mid=rect(find('.strip:nth-child(2)'),board);
      all('.partner-rack .badge').forEach((el,i)=>{
        const src=rect(el,board), dx=mid.x+mid.w/2-src.x-src.w/2+(i?110:-110),dy=mid.y+48-src.y;
        run(el,[{transform:'none'},{offset:.49,transform:`translate(${dx}px,${dy}px) scale(.78)`},{offset:.56,transform:`translate(${dx-8}px,${dy-8}px) scale(.78)`},{transform:'none'}],780);
      });
      run(find('.rejected'),[{translate:'0 0'},{translate:'-9px 0'},{translate:'8px 0'},{translate:'0 0'}],340,370);
    }
    if(step===6) [0,2].forEach((i,j)=>{fly('p0','work'+i,'work'+i,j*220);fly('p1','help'+i,null,140+j*220)});
  }
  if(slide===8 && step===3) {
    run(find('.final-sun'),fade,1500);
    walk(find('.s-dad-walk'),'dad-walk2',1450);
    walk(find('.s-boy-walk'),'boy-walk2',1450);
    run(find('.family'),[{translate:'165px 90px'},{translate:'100px 50px',offset:.42},{translate:'0 0'}],1450);
    all('.close-chips .chip').forEach((el,i)=>run(el,[{background:'#e6dfd2'},{background:'#ffe9ae'}],300,i*300));
  }
}
export function renderBoard(slide, step, animate=false) {
  const board=stage();
  const previousKeys=new Set(previousSlide===slide ? selectors(board,'[data-key]').map(el=>el.dataset.key) : []);
  const sources={};
  if(animate && previousSlide===slide) selectors(board,'[data-source]').forEach(el=>{sources[el.dataset.source]=origin(el,board)});
  board.replaceChildren();
  board.insertAdjacentHTML('afterbegin',views[slide](step,animate));
  if(animate) animateState(board,slide,step,previousKeys,sources);
  previousSlide=slide;
}
export function updateTimer(remainingMs, running) {
  const board=stage(), fire=board.querySelector('.camp-flame');
  if(!fire) return;
  const secs=Math.max(0,Math.ceil(remainingMs/1000));
  const ratio=Math.min(1,secs/420);
  board.querySelector('.camp-clock time').textContent=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');
  const frame=secs<=60?0:Math.min(7,Math.ceil((secs-60)/360*7));
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phase = motion && running ? [0,1,0,2][Math.floor(remainingMs/400)%4] : Number(fire.dataset.phase ?? 0);
  const pose = 's-flame'+frame+(phase ? '-'+phase : '');
  if(fire.dataset.pose!==pose) {
    fire.className='sprite camp-flame '+pose;
    fire.dataset.pose=pose;
    fire.dataset.phase=String(phase);
  }
  fire.style.animationPlayState=motion && running?'running':'paused';
  board.querySelector('.camp-light').style.opacity=String(1-ratio);
}
