import { slides } from './deck.js';
import { renderBoard, updateTimer } from './view.js';
import { connect, send } from './transport.js';
import { assets } from './assets.js';

const stage = document.querySelector('#stage');
const overlay = document.querySelector('#connect');
const position = document.querySelector('#position');
const initialMs = 7 * 60000;
let slide = 0, step = 0, pausedMs = initialMs, deadline = null;
const roomKey = 'evidence-room-v1';
function chooseRoom() {
  try {
    const saved = localStorage.getItem(roomKey);
    if (/^[A-Z]{4}$/.test(saved)) return saved;
  } catch {}
  const room = Array.from(crypto.getRandomValues(new Uint8Array(4)), n => String.fromCharCode(65 + n % 26)).join('');
  try { localStorage.setItem(roomKey, room); } catch {}
  return room;
}
const room = chooseRoom();
const remaining = () => deadline === null ? pausedMs : Math.max(0, deadline - Date.now());
function publish(ack) {
  send({ack,state:{slide,step,timer:{running:deadline !== null && remaining() > 0,remainingMs:remaining()}}});
}
function paintTimer() {
  if (deadline !== null && remaining() === 0) {
    pausedMs = 0;
    deadline = null;
    publish();
  }
  if (slide === 7) updateTimer(remaining(),deadline !== null);
}
function draw(animate) {
  renderBoard(slide,step,animate);
  position.textContent = (slide + 1) + ' / ' + slides.length;
  paintTimer();
}
function go(s,k,animate=false) {
  if (!Number.isInteger(s) || !slides[s] || !Number.isInteger(k) || k < 0 || k >= slides[s].steps.length) return;
  if (s === slide && k === step) return;
  if (slide === 7 && s !== 7) { pausedMs = remaining(); deadline = null; }
  slide=s;
  step=k;
  draw(animate);
}
function apply(m) {
  switch (m.cmd) {
    case 'next':
      if (step+1 < slides[slide].steps.length) go(slide,step+1,true);
      else if (slide+1 < slides.length) go(slide+1,0,true);
      break;
    case 'back':
      if (step) go(slide,step-1);
      else if (slide) go(slide-1,slides[slide-1].steps.length-1);
      break;
    case 'goto': go(m.slide,m.step ?? 0); break;
    case 'timer':
      if (slide !== 7) break;
      if (m.action === 'start' && deadline === null && pausedMs > 0) deadline = Date.now()+pausedMs;
      if (m.action === 'pause') { pausedMs = remaining(); deadline = null; }
      if (m.action === 'reset') { pausedMs = initialMs; deadline = null; }
      if (m.action === 'add') { if (deadline !== null) deadline += 60000; else pausedMs += 60000; }
      paintTimer();
      break;
  }
  publish(m.id);
}
function resize() {
  stage.style.setProperty('--scale',Math.min(innerWidth/1920,innerHeight/1080));
}
addEventListener('resize',resize);
resize();
draw(false);
connect(room,'board',apply,online=>{if(online) publish()});
publish();
setInterval(publish,5000);
setInterval(()=>{if (deadline !== null) paintTimer();},200);

const remoteURL = new URL('remote/',location.href);
remoteURL.searchParams.set('room',room);
if (new URLSearchParams(location.search).get('transport')==='local') remoteURL.searchParams.set('transport','local');
document.querySelector('#phone').href=remoteURL;
document.querySelector('#room').textContent=room;
function toggleOverlay() {
  if (overlay.open) { overlay.close(); return; }
  const qr = qrcode(0,'M');
  qr.addData(remoteURL.href);
  qr.make();
  document.querySelector('#qr').innerHTML=qr.createSvgTag({scalable:true,margin:12});
  overlay.showModal();
}
document.querySelector('#dismiss').onclick=()=>overlay.close();
let jumpUntil=0;
addEventListener('keydown',event=>{
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
  const key=event.key.toLowerCase();
  if (key==='c') { event.preventDefault(); toggleOverlay(); return; }
  if (overlay.open) return;
  if (key==='g') {jumpUntil=Date.now()+2000;return;}
  if (Date.now()<jumpUntil && /^[1-9]$/.test(key)) {apply({cmd:'goto',slide:Number(key)-1,step:0});jumpUntil=0;return;}
  if (key==='f') {
    (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(()=>{});
    return;
  }
  const cmd=['arrowright',' ','pagedown','enter'].includes(key) ? 'next' : ['arrowleft','pageup'].includes(key) ? 'back' : '';
  if(cmd){event.preventDefault();apply({cmd});}
});
stage.addEventListener('click',event=>{
  const bounds=stage.getBoundingClientRect();
  apply({cmd:event.clientX < bounds.left+bounds.width/3 ? 'back' : 'next'});
});

async function ready() {
  // Decoded images remain available even if a classroom connection drops mid-slide.
  const pictures=assets.filter(p=>p.endsWith('.png')).map(src=>{
    const img=new Image(); img.src=src; return img;
  });
  await Promise.all([...pictures.map(img=>img.decode()),document.fonts.load('52px "Atkinson Hyperlegible"'),document.fonts.load('bold 76px "Atkinson Hyperlegible"')]);
  window.lessonPictures=pictures;
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('./sw.js',{type:'module',updateViaCache:'none'});
    const worker = registration.installing;
    if (worker) {
      await new Promise((resolve,reject)=>{
        function check() {
          if (worker.state === 'redundant') reject(new Error('Offline download failed'));
          if (worker.state === 'activated') resolve();
        }
        worker.addEventListener('statechange',check);
        check();
      });
    }
    await navigator.serviceWorker.ready;
  }
  const dot=document.querySelector('#ready');
  dot.classList.add('loaded');
  dot.title='Ready for offline use';
  dot.setAttribute('aria-label',dot.title);
}
ready().catch(()=>{
  const dot=document.querySelector('#ready');
  dot.title='Some resources could not be loaded. Reconnect and reload before class.';
  dot.setAttribute('aria-label',dot.title);
});
