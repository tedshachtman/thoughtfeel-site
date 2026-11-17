const relay = 'https://thoughtfeel-space.fly.dev/deck/';
let session;

export function close() {
  if (!session) return;
  session.channel?.close();
  session.events?.close();
  session.abort?.abort();
  session = undefined;
}

export function connect(room, role, onMessage, onStatus = () => {}) {
  close();
  if (!/^[A-Z]{4}$/.test(room) || !['board', 'remote'].includes(role)) {
    throw new Error('Invalid room or role');
  }
  const localOnly = new URLSearchParams(location.search).get('transport') === 'local';
  const s = session = {
    role, onStatus, localOnly, url: relay + room, sequence: 0,
    client: Array.from(crypto.getRandomValues(new Uint32Array(3))).join('-'),
    recent: new Map(), queue: [], sending: false
  };
  function receive(message) {
    if (session !== s || !message || message.from === role) return;
    if (message.client && Number.isSafeInteger(message.sequence)) {
      if ((s.recent.get(message.client) ?? -1) >= message.sequence) return;
      s.recent.set(message.client, message.sequence);
      if (s.recent.size > 128) s.recent.delete(s.recent.keys().next().value);
    }
    onMessage(message);
  }
  try {
    s.channel = new BroadcastChannel('evidence-lesson-' + room);
    s.channel.onmessage = e => receive(e.data);
  } catch { /* The HTTPS relay works without same-device broadcast. */ }
  if (localOnly) {
    queueMicrotask(() => { if (session === s) onStatus(!!s.channel); });
  } else {
    s.events = new EventSource(s.url + '/events?as=' + role);
    s.events.onmessage = event => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      receive(message);
    };
    s.events.onopen = () => onStatus(true);
    s.events.onerror = () => onStatus(false);
  }
  return close;
}

async function flush(s) {
  if (s.sending) return;
  s.sending = true;
  while (s.queue.length && session === s) {
    const message = s.queue.shift();
    const controller = s.abort = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3600);
    try {
      const response = await fetch(s.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message), signal: controller.signal, cache: 'no-store',
        credentials: 'omit', referrerPolicy: 'no-referrer'
      });
      if (!response.ok) throw new Error('Relay unavailable');
    } catch {
      // SSE reconnect and board heartbeats determine availability. A failed POST
      // may already have reached a same-browser peer over BroadcastChannel.
    } finally {
      clearTimeout(timeout);
    }
  }
  s.sending = false;
}

export function send(payload) {
  const s = session;
  if (!s) return null;
  const sequence = ++s.sequence;
  const message = { ...payload, from: s.role, client: s.client, sequence, id: s.client + '/' + sequence };
  s.channel?.postMessage(message);
  if (!s.localOnly) {
    // A later heartbeat replaces queued idle state. Preserve command confirmations.
    if (message.state && !message.ack && s.queue.at(-1)?.state && !s.queue.at(-1).ack) s.queue.pop();
    s.queue.push(message);
    void flush(s);
  }
  return message.id;
}
