import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../public-metrics.js', import.meta.url), 'utf8');
const config = { url: 'https://campaign.supabase.co', publishableKey: 'sb_publishable_test' };
const types = ['cesta_basica', 'brinquedo', 'kit_higiene', 'agua'];
const snapshot = (revision = 1) => ({ id: 1, revision, updated_at: '2026-10-28T01:00:00Z', deliveries_completed: 0,
  inventory: types.map(item_tipo => ({ item_tipo, nome: item_tipo, unidade: 'unidades', arrecadado: 3, entregue: 1, meta: 4 })),
  finance: { entradas_centavos: 1234, saidas_centavos: 456, saldo_centavos: 778 } });
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function harness(fetchImpl, boot = false) {
  let time = 0, next = 0;
  const timers = new Map(), sockets = [], calls = [], statuses = [], summaries = [], listeners = new Map();
  const windowListeners = new Map();
  const window = boot ? { addEventListener: (name, fn, options) => windowListeners.set(name, { fn, options }) } : undefined;
  const document = { querySelectorAll: () => [], hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const add = (fn, ms, repeat = false) => { const id = ++next; timers.set(id, { fn, ms, at: time + ms, repeat }); return id; };
  class Socket {
    constructor(url) { this.url = url; this.sent = []; this.closed = false; sockets.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.closed = true; this.onclose?.(); }
    open() { this.onopen(); }
    message(value) { this.onmessage({ data: JSON.stringify(value) }); }
    join() { this.open(); this.message({ topic: 'realtime:public-campaign', event: 'phx_reply', payload: { status: 'ok', response: { postgres_changes: [{ id: 1 }] } } }); }
  }
  const context = vm.createContext({ module: { exports: {} }, URL, AbortController, document, window, WebSocket: Socket,
    fetch: (url, options) => { calls.push({ url, options }); return fetchImpl ? fetchImpl(url, options, calls.length) : Promise.resolve({ ok: true, json: async () => [snapshot()] }); },
    setTimeout: (fn, ms) => add(fn, ms), setInterval: (fn, ms) => add(fn, ms, true), clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id) });
  vm.runInContext(source, context);
  return { api: context.module.exports, sockets, calls, statuses, summaries, timers, document,
    fireWindow(name, event) { const listener = windowListeners.get(name); if (listener.options?.once) windowListeners.delete(name); listener.fn(event); },
    start() { return this.api.startClient(config, row => summaries.push(row), state => statuses.push(state)); },
    visibility(hidden) { document.hidden = hidden; listeners.get('visibilitychange')(); },
    async tick(ms) { const end = time + ms; while (true) { const due = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a,b) => a[1].at - b[1].at)[0]; if (!due) break; const [id, timer] = due; time = timer.at; if (timer.repeat) timer.at += timer.ms; else timers.delete(id); timer.fn(); await settle(); } time = end; await settle(); }
  };
}

test('validates whitelist, exact cents and signed balances without private fields', () => {
  const { api } = harness(); const input = snapshot(); input.email = 'private'; input.inventory[0].contact = 'private'; input.finance.receipt = 'private';
  const row = api.validateSummary(input); assert.equal(JSON.stringify(row).includes('private'), false); assert.equal(row.finance.saldo_centavos, 778);
  input.finance = { entradas_centavos: 0, saidas_centavos: 456, saldo_centavos: -456 }; assert.equal(api.validateSummary(input).finance.saldo_centavos, -456);
});
test('rejects malformed snapshots, duplicate items, unsafe counts and inconsistent money', () => {
  const { api } = harness();
  for (const change of [row => row.id = 2, row => row.updated_at = 'bad', row => row.revision = 1.2, row => row.inventory[1] = row.inventory[0], row => row.inventory[0].entregue = 9, row => row.finance.saldo_centavos = 777, row => row.finance.entradas_centavos = Infinity, row => row.inventory[0].arrecadado = Number.MAX_SAFE_INTEGER + 1]) {
    const row = snapshot(); change(row); assert.throws(() => api.validateSummary(row));
  }
});
test('requires HTTPS public configuration and rejects privileged/JWT credentials', () => {
  const { api } = harness(); assert.equal(api.validateConfig(config).url, config.url);
  for (const input of [{...config,url:'http://campaign.supabase.co'}, {...config,url:'https://campaign.supabase.co/path'}, {...config,publishableKey:'sb_secret_bad'}, {...config,publishableKey:'ey.jwt.secret'}]) assert.throws(() => api.validateConfig(input));
});
test('uses apikey only, joins only summary and refetches rather than rendering WAL', async () => {
  const h = harness((url, options, n) => Promise.resolve({ ok: true, json: async () => [snapshot(n)] })); const stop = h.start(); await settle(); h.sockets[0].join(); await settle();
  assert.equal(h.calls[0].options.headers.apikey, config.publishableKey); assert.equal(h.calls[0].options.headers.Authorization, undefined);
  assert.match(h.sockets[0].url, /vsn=1.0.0/); assert.equal(h.sockets[0].url.includes('access_token'), false);
  assert.equal(h.sockets[0].sent[0].payload.config.postgres_changes[0].table, 'campaign_public_summary'); assert.equal(h.statuses.at(-1), 'live');
  h.sockets[0].message({ topic: 'realtime:public-campaign', event: 'postgres_changes', payload: snapshot(999) }); await h.tick(80);
  assert.equal(h.summaries.at(-1).revision, 3); assert.equal(h.summaries.some(row => row.revision === 999), false); stop(); assert.equal(h.timers.size, 0);
});
test('debounces bursts and rejects revision regression while keeping last valid values', async () => {
  let revision = 5; const h = harness(() => Promise.resolve({ ok: true, json: async () => [snapshot(revision)] })); const stop = h.start(); await settle(); h.sockets[0].join(); await settle(); const before = h.calls.length;
  revision = 4; for (let i=0; i<5; i++) h.sockets[0].message({ topic:'realtime:public-campaign',event:'postgres_changes' }); await h.tick(80);
  assert.equal(h.calls.length, before+1); assert.equal(h.summaries.at(-1).revision, 5); assert.equal(h.statuses.at(-1), 'stale'); stop();
});
test('REST failure shows stale, retries while WS is live and accepts recovery', async () => {
  let failed = false; const h = harness(() => Promise.resolve({ ok: !failed, json: async () => [snapshot()] })); const stop = h.start(); await settle(); h.sockets[0].join(); await settle();
  failed = true; h.sockets[0].message({ topic:'realtime:public-campaign',event:'postgres_changes' }); await h.tick(80); assert.equal(h.statuses.at(-1),'stale');
  failed = false; await h.tick(15000); assert.equal(h.statuses.at(-1),'live'); stop();
});
test('hung REST is aborted at 10 seconds then polling can recover', async () => {
  const h = harness((url, options, n) => n === 1 ? new Promise((resolve,reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) : Promise.resolve({ok:true,json:async()=>[snapshot()]}));
  const stop = h.start(); await h.tick(10000); assert.equal(h.calls[0].options.signal.aborted,true); assert.equal(h.statuses.at(-1),'stale'); await h.tick(5000); assert.equal(h.summaries.length,1); stop();
});
test('WS opening/join timeout reconnects with bounded backoff and polling fallback', async () => {
  const h = harness(); const stop = h.start(); await settle(); await h.tick(10000); assert.equal(h.sockets[0].closed,true); assert.equal(h.statuses.at(-1),'polling'); await h.tick(1000); assert.equal(h.sockets.length,2); h.sockets[1].open(); await h.tick(10000); assert.equal(h.sockets[1].closed,true); stop();
});
test('malformed JSON objects and denied join trigger reconnection', async () => {
  for (const value of [null, [], 'text', {topic:'realtime:public-campaign',event:'phx_reply',payload:{status:'error'}}]) {
    const h = harness(); const stop = h.start(); await settle(); h.sockets[0].open(); h.sockets[0].message(value); assert.equal(h.sockets[0].closed,true); await h.tick(1000); assert.equal(h.sockets.length,2); stop();
  }
});
test('heartbeat acknowledgements sustain connection and missing acknowledgement reconnects', async () => {
  const h = harness(); const stop = h.start(); await settle(); h.sockets[0].join(); await settle(); await h.tick(25000);
  const heartbeat = h.sockets[0].sent.at(-1); assert.equal(heartbeat.event,'heartbeat'); h.sockets[0].message({topic:'phoenix',event:'phx_reply',ref:heartbeat.ref,payload:{status:'ok'}}); await h.tick(25000); assert.equal(h.sockets[0].closed,false); await h.tick(25000); assert.equal(h.sockets[0].closed,true); stop();
});
test('hidden tabs pause sockets and resume with current REST data; stop cleans resources', async () => {
  const h = harness(); const stop = h.start(); await settle(); h.visibility(true); assert.equal(h.statuses.at(-1),'paused'); assert.equal(h.sockets[0].closed,true); const before=h.calls.length; await h.tick(15000); assert.equal(h.calls.length,before); h.visibility(false); await settle(); assert.equal(h.calls.length,before+1); assert.equal(h.sockets.length,2); stop(); assert.equal(h.timers.size,0);
});
test('published pages share client, preserve shirt assets and do not collect private forms', () => {
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8'); const dashboard=readFileSync(new URL('../impacto.html',import.meta.url),'utf8'); const landing=readFileSync(new URL('../script.js',import.meta.url),'utf8');
  for(const page of [index,dashboard]) { assert.match(page,/public-metrics.js/); assert.match(page,/data-public-status/); assert.match(page,/data-public-updated/); assert.match(page,/Leite e Fralda/); }
  assert.match(index,/href="impacto.html"/); assert.match(dashboard,/natalsolidariosistema.vercel.app/); assert.doesNotMatch(landing,/localStorage|data-order-form|data-demo-form/);
  for(const asset of ['camisa.jpg','frente.jpg','verso.jpg']) assert.match(landing,new RegExp(asset));
  assert.match(source,/pageshow/); assert.match(source,/event.persisted/);
});


test('BFCache pageshow restarts client after pagehide stopped previous connection', async () => {
  const h = harness(url => Promise.resolve({ok:true,json:async()=>url==='public-config.json'?config:[snapshot()]}), true);
  await settle(); assert.equal(h.sockets.length,1); h.fireWindow('pagehide', {persisted:true}); await settle(); assert.equal(h.sockets[0].closed,true); assert.equal(h.timers.size,0);
  h.fireWindow('pageshow', {persisted:true}); await settle(); assert.equal(h.sockets.length,2); h.fireWindow('pagehide', {persisted:false}); await settle(); assert.equal(h.timers.size,0);
});
