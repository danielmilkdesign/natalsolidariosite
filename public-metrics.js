(function () {
  'use strict';
  const ITEM_TYPES = ['cesta_basica', 'brinquedo', 'kit_higiene', 'agua'];
  const safeCount = value => Number.isSafeInteger(value) && value >= 0;

  function validateSummary(row) {
    if (!row || row.id !== 1 || !safeCount(row.revision) || typeof row.updated_at !== 'string' || !Number.isFinite(Date.parse(row.updated_at)) || !safeCount(row.deliveries_completed)) throw new Error('Resumo público inválido.');
    if (!Array.isArray(row.inventory) || row.inventory.length !== ITEM_TYPES.length) throw new Error('Inventário público inválido.');
    const inventory = ITEM_TYPES.map(type => {
      const matches = row.inventory.filter(item => item && item.item_tipo === type);
      const item = matches[0];
      if (matches.length !== 1 || !safeCount(item.arrecadado) || !safeCount(item.entregue) || item.entregue > item.arrecadado || !safeCount(item.meta) || !item.meta || typeof item.nome !== 'string' || typeof item.unidade !== 'string') throw new Error('Indicador público inválido.');
      return { item_tipo: type, nome: item.nome, unidade: item.unidade, arrecadado: item.arrecadado, entregue: item.entregue, meta: item.meta };
    });
    const money = row.finance;
    if (!money || !safeCount(money.entradas_centavos) || !safeCount(money.saidas_centavos) || !Number.isSafeInteger(money.saldo_centavos) || money.saldo_centavos !== money.entradas_centavos - money.saidas_centavos) throw new Error('Totais financeiros inválidos.');
    return { id: 1, revision: row.revision, updated_at: row.updated_at, inventory, finance: { entradas_centavos: money.entradas_centavos, saidas_centavos: money.saidas_centavos, saldo_centavos: money.saldo_centavos }, deliveries_completed: row.deliveries_completed };
  }

  function validateConfig(config) {
    const url = new URL(config && config.url);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password || typeof config.publishableKey !== 'string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) throw new Error('Configuração pública indisponível.');
    return { url: url.origin, publishableKey: config.publishableKey };
  }

  function startClient(input, onSummary, onStatus) {
    const config = validateConfig(input);
    const topic = 'realtime:public-campaign';
    let socket, heartbeat, joinTimeout, reconnect, refreshTimeout, invalidation, stopped = false;
    let live = false, fetching = false, fetchAgain = false, healthy = false, latestRevision = -1;
    let attempt = 0, sequence = 0, heartbeatRef = null;
    let request;
    const hidden = () => typeof document !== 'undefined' && document.hidden;
    const status = () => onStatus(!healthy ? 'stale' : live ? 'live' : 'polling');

    async function refresh() {
      if (stopped || hidden()) return;
      if (fetching) { fetchAgain = true; return; }
      fetching = true;
      request = new AbortController();
      const timeout = setTimeout(() => request.abort(), 10000);
      try {
        const response = await fetch(config.url + '/rest/v1/campaign_public_summary?id=eq.1&select=*', { headers: { apikey: config.publishableKey }, cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error('Resumo não disponível.');
        const rows = await response.json();
        if (stopped) return;
        if (!Array.isArray(rows) || rows.length !== 1) throw new Error('Resumo ainda não publicado.');
        const next = validateSummary(rows[0]);
        if (next.revision < latestRevision) throw new Error('Resposta anterior à última atualização.');
        latestRevision = next.revision;
        healthy = true;
        onSummary(next);
        status();
      } catch (error) {
        if (!stopped) { healthy = false; status(); }
      } finally {
        clearTimeout(timeout);
        fetching = false;
        if (fetchAgain && !stopped) { fetchAgain = false; refresh(); }
      }
    }

    function queueRefresh() {
      clearTimeout(invalidation);
      invalidation = setTimeout(refresh, 80);
    }
    function clearSocket() {
      clearInterval(heartbeat); clearTimeout(joinTimeout);
      heartbeatRef = null; live = false;
      if (socket) { const old = socket; socket = null; old.close(); }
    }
    function retry() {
      clearSocket();
      if (stopped || hidden()) return;
      status();
      clearTimeout(reconnect);
      reconnect = setTimeout(connect, Math.min(30000, 1000 * (2 ** Math.min(attempt++, 5))));
    }
    function connect() {
      if (stopped || hidden() || socket) return;
      clearTimeout(reconnect);
      try {
        // Publishable keys identify the connection; they are not user JWTs.
        const endpoint = config.url.replace(/^https:/, 'wss:') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(config.publishableKey) + '&vsn=1.0.0';
        const current = new WebSocket(endpoint);
        socket = current;
        joinTimeout = setTimeout(retry, 10000);
        current.onopen = () => {
          if (stopped || socket !== current) return;
          current.send(JSON.stringify({ topic, event: 'phx_join', payload: { config: { postgres_changes: [{ event: '*', schema: 'public', table: 'campaign_public_summary', filter: 'id=eq.1' }] } }, ref: String(++sequence) }));
          heartbeat = setInterval(() => {
            if (heartbeatRef !== null) { retry(); return; }
            heartbeatRef = String(++sequence);
            current.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: heartbeatRef }));
          }, 25000);
        };
        current.onmessage = event => {
          if (stopped || socket !== current) return;
          let message;
          try { message = JSON.parse(event.data); } catch { retry(); return; }
          if (!message || typeof message !== 'object' || Array.isArray(message)) { retry(); return; }
          if (message.topic === 'phoenix' && message.event === 'phx_reply' && message.ref === heartbeatRef && message.payload?.status === 'ok') heartbeatRef = null;
          if (message.topic !== topic) return;
          if (message.event === 'phx_reply') {
            if (message.payload?.status !== 'ok') { retry(); return; }
            const subscriptions = message.payload.response?.postgres_changes;
            if (Array.isArray(subscriptions) && subscriptions.length) {
              clearTimeout(joinTimeout); attempt = 0; live = true; status(); refresh();
            }
          }
          if (message.event === 'system') {
            if (message.payload?.status !== 'ok') { retry(); return; }
            clearTimeout(joinTimeout); attempt = 0; live = true; status(); refresh();
          }
          if (message.event === 'postgres_changes') queueRefresh();
          if (message.event === 'phx_error' || message.event === 'phx_close') retry();
        };
        current.onclose = () => { if (socket === current && !stopped) retry(); };
        current.onerror = () => { if (socket === current && !stopped) retry(); };
      } catch { retry(); }
    }
    function visibility() {
      if (hidden()) { clearTimeout(reconnect); clearSocket(); onStatus('paused'); }
      else { refresh(); connect(); }
    }
    function stop() {
      stopped = true; request?.abort();
      clearSocket(); clearTimeout(reconnect); clearTimeout(invalidation); clearInterval(refreshTimeout);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility);
    }
    onStatus('connecting');
    refresh(); connect();
    refreshTimeout = setInterval(() => { if (!live || !healthy) refresh(); }, 15000);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
    return stop;
  }

  function renderSummary(summary) {
    const count = new Intl.NumberFormat('pt-BR');
    const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    function text(attribute, key, value) {
      document.querySelectorAll('[' + attribute + '="' + key + '"]').forEach(element => { element.textContent = value; });
    }
    summary.inventory.forEach(item => {
      const percent = Math.round(item.arrecadado / item.meta * 100);
      text('data-public-count', item.item_tipo, count.format(item.arrecadado));
      text('data-public-delivered', item.item_tipo, count.format(item.entregue));
      text('data-public-goal', item.item_tipo, count.format(item.meta));
      text('data-public-percent', item.item_tipo, count.format(percent));
      text('data-public-remaining', item.item_tipo, count.format(Math.max(0, item.meta - item.arrecadado)));
      document.querySelectorAll('[data-public-progress="' + item.item_tipo + '"]').forEach(element => {
        const visiblePercent = Math.min(100, percent);
        element.setAttribute('aria-busy', 'false'); element.setAttribute('aria-valuenow', String(visiblePercent));
        element.setAttribute('aria-valuetext', count.format(item.arrecadado) + ' de ' + count.format(item.meta) + ' arrecadados');
        const bar = element.querySelector('span'); if (bar) bar.style.width = visiblePercent + '%';
      });
    });
    for (const key of ['entradas_centavos', 'saidas_centavos', 'saldo_centavos']) text('data-public-money', key, brl.format(summary.finance[key] / 100));
    document.querySelectorAll('[data-public-routes]').forEach(element => { element.textContent = count.format(summary.deliveries_completed); });
    document.querySelectorAll('[data-public-updated]').forEach(element => {
      element.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Manaus' }).format(new Date(summary.updated_at));
      element.setAttribute('datetime', summary.updated_at);
    });
  }
  function renderStatus(state) {
    const labels = { connecting: 'Conectando aos dados da campanha…', live: 'Conectado em tempo real', polling: 'Atualização automática a cada 15 s · reconectando ao tempo real', stale: 'Não foi possível atualizar. Aguardando reconexão; os dados exibidos podem estar desatualizados.', paused: 'Atualização pausada enquanto esta aba está oculta.' };
    document.querySelectorAll('[data-public-status]').forEach(element => { element.textContent = labels[state]; element.dataset.state = state; });
  }
  async function boot() {
    try {
      const response = await fetch('public-config.json', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const config = await response.json();
      const stop = startClient(config, renderSummary, renderStatus);
      window.addEventListener('pagehide', stop, { once: true });
    } catch { renderStatus('stale'); }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { validateSummary, validateConfig, startClient };
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    boot();
    window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
  }
}());
