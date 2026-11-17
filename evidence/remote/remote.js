import { slides, prompts } from '../deck.js';
import { connect, send } from '../transport.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const room = (params.get('room') || '').trim().toUpperCase();

if (!/^[A-Z]{4}$/.test(room)) {
  $('pair').hidden = false;
  $('pair').addEventListener('submit', event => {
    event.preventDefault();
    params.set('room', $('room').value.toUpperCase());
    location.search = params.toString();
  });
} else {
  startRemote();
}

function startRemote() {
  const cacheKey = 'evidence.last.' + room;
  let state, receivedAt, heardAt = -Infinity, command, commandTimeout, wakeLock;
  let online = false, verified = false, syncId;
  $('remote').hidden = false;
  $('position').textContent = 'Room ' + room;
  for (const [index, slide] of slides.entries()) {
    $('slideSelect').add(new Option((index + 1) + ' · ' + slide.name, String(index)));
  }
  for (const [title, body] of prompts) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const text = document.createElement('p');
    summary.textContent = title;
    text.textContent = body;
    details.append(summary, text);
    $('promptCards').append(details);
  }
  function valid(snapshot) {
    return Number.isInteger(snapshot?.slide) && slides[snapshot.slide]
      && Number.isInteger(snapshot.step) && snapshot.step >= 0 && snapshot.step < slides[snapshot.slide].steps.length
      && Number.isFinite(snapshot.timer?.remainingMs) && typeof snapshot.timer.running === 'boolean';
  }
  function show(snapshot) {
    const { slide, step, timer } = snapshot;
    const changed = !state || slide !== state.slide || step !== state.step;
    state = snapshot;
    receivedAt = performance.now();
    if (changed) {
      $('position').textContent = 'Slide ' + (slide + 1) + ' of ' + slides.length + ' · Step ' + (step + 1) + ' of ' + slides[slide].steps.length;
      $('name').textContent = slides[slide].name;
      $('script').textContent = slides[slide].steps[step];
      $('timer').hidden = slide !== 7;
      $('prompts').hidden = slide !== 7;
      let upcoming = slides[slide].steps[step + 1] ?? slides[slide + 1]?.steps[0];
      if (upcoming === '' && slide === 6) upcoming = prompts[0].join(': ');
      $('preview').hidden = !upcoming;
      $('upcoming').textContent = upcoming || '';
      $('content').scrollTop = 0;
    }
    $('toggleTimer').textContent = timer.running ? 'Pause' : 'Start';
    drawTime();
    controls();
  }
  function drawTime() {
    if (!state || state.slide !== 7) return;
    const elapsed = state.timer.running && online ? performance.now() - receivedAt : 0;
    const seconds = Math.ceil(Math.max(0, state.timer.remainingMs - elapsed) / 1000);
    $('clock').textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }
  function controls() {
    const locked = !online || !state || !!command;
    $('link').classList.toggle('online', online);
    const linkLabel = online ? 'Board connected' : 'Board disconnected';
    $('link').setAttribute('aria-label', linkLabel);
    $('link').title = linkLabel;
    $('banner').hidden = online;
    $('banner').textContent = state ? 'Reconnecting…' : 'Connecting to board…';
    $('back').disabled = locked || (state.slide === 0 && state.step === 0);
    $('next').disabled = locked || (state.slide === slides.length - 1 && state.step === slides.at(-1).steps.length - 1);
    $('jump').disabled = $('go').disabled = $('reset').disabled = $('add').disabled = locked;
    $('toggleTimer').disabled = locked || (!state.timer.running && state.timer.remainingMs <= 0);
  }
  function askForState() { syncId = send({cmd:'sync'}); }
  function issue(payload) {
    if (!online || command) return;
    void keepAwake();
    command = send(payload);
    controls();
    commandTimeout = setTimeout(() => {
      command = null;
      online = verified = false;
      controls();
      askForState();
    }, 4500);
  }
  function receive(message) {
    if (!valid(message.state)) return;
    const confirmed = command && command === message.ack;
    if (confirmed) {
      clearTimeout(commandTimeout);
      command = null;
    }
    if (message.ack && message.ack === syncId) verified = true;
    if (verified || confirmed) {
      heardAt = performance.now();
      online = true;
    }
    const stepChanged = state && (state.slide !== message.state.slide || state.step !== message.state.step);
    show(message.state);
    try { sessionStorage.setItem(cacheKey, JSON.stringify(state)); } catch { /* Private browsing. */ }
    if (confirmed && stepChanged) navigator.vibrate?.(10);
  }
  function refreshSteps() {
    const slide = Number($('slideSelect').value);
    $('stepSelect').replaceChildren(...slides[slide].steps.map((line, index) => {
      const preview = line || (slide === 7 ? 'Conferring prompts' : 'Before class');
      return new Option((index + 1) + ' · ' + preview, String(index));
    }));
  }
  $('jump').onclick = () => {
    $('slideSelect').value = String(state.slide);
    refreshSteps();
    $('stepSelect').value = String(state.step);
    $('menu').showModal();
  };
  $('slideSelect').onchange = refreshSteps;
  $('go').onclick = event => {
    event.preventDefault();
    $('menu').close();
    issue({ cmd:'goto', slide:Number($('slideSelect').value), step:Number($('stepSelect').value) });
  };
  $('next').onclick = () => issue({cmd:'next'});
  $('back').onclick = () => issue({cmd:'back'});
  $('toggleTimer').onclick = () => issue({cmd:'timer', action:state.timer.running ? 'pause' : 'start'});
  $('add').onclick = () => issue({cmd:'timer', action:'add', seconds:60});
  $('reset').onclick = () => issue({cmd:'timer', action:'reset'});

  async function keepAwake() {
    if (!navigator.wakeLock || wakeLock || document.hidden) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; }, {once:true});
    } catch { /* System power-saving settings can deny the request. */ }
  }
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey));
    if (valid(cached)) show(cached);
  } catch { /* Start without a saved script. */ }
  controls();
  connect(room, 'remote', receive, ready => {
    if (ready) askForState();
    else if (online) {
      // A local board can still confirm while the network is down.
      online = verified = false;
      controls();
      askForState();
    }
  });
  askForState();
  void keepAwake();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (performance.now() - heardAt > 11500) online = verified = false;
      controls();
      askForState();
      void keepAwake();
    }
  });
  setInterval(() => {
    if (performance.now() - heardAt > 11500) {
      online = verified = false;
      controls();
      askForState();
    }
  }, 4000);
  setInterval(drawTime, 250);
}
