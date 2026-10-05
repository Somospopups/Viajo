// bondi-live · relay de posiciones en vivo de colectivos (TU BONDI / MICRONAUTA)
// La fuente bloquea el navegador (CORS solo permite micronauta4.dnsalias.net),
// exige sesión PHPSESSID y aguanta ~1,5 pedidos por segundo: este Worker mantiene
// estado por parada y lo refresca de a lotes suaves para no saturarla.
//
//  GET /health
//  GET /live               -> estado global (paradas de GLOBAL_STOPS) + lote en segundo plano
//  GET /live?codes=A,B     -> detalle: refresca esas paradas y las devuelve (máx 8)
//  GET /arribos?codes=A,B  -> arribos crudos por parada (máx 8) + alimenta el estado

const UP = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = UP + '/urbano.php?conf=cbaciudad';
const CMD = UP + '/urbano2_cmd.php';
const ORIGIN = 'https://micronauta4.dnsalias.net';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const CONF = 'cbaciudad';

// Paradas del feed global: generadas con `node genstops.js` (cubren todas las líneas
// y están repartidas geográficamente). 18 códigos = ciclo completo ~30 s.
const GLOBAL_STOPS = [
  'CE71', 'PO08', 'CE25', 'CU40', 'IA34', 'NC20', 'PS03', 'BG13', 'CU66',
  'GU14', 'EQ05', 'GF15', 'OB21', 'PS02', 'BW12', 'BP05', 'DF02', 'VG12',
];

const BATCH = 18;        // códigos refrescados por pedido (todos los stale: con
                         // llamadas cada 10 s el ciclo entero baja de 40 s a ~24 s
                         // y los bondis dejan de verse atrasados en el mapa)
const CONC = 4;          // concurrencia contra la fuente (más = timeouts allá)
const UP_TIMEOUT = 15000;
const FRESH_MS = 24000;  // no se vuelve a pedir un código más nuevo que esto
const STALE_MAX = 180000;
const MAX_CODES = 8;
const LIVE_CACHE = 4;    // segundos de cache del feed global
const AR_CACHE = 8;

const state = new Map(); // código -> { ts, buses: [...] }
let cookie = '';
let cookieAt = 0;

const form = (o) => new URLSearchParams(o).toString();

function setCookies(h) {
  let list = [];
  if (typeof h.getSetCookie === 'function') list = h.getSetCookie();
  else if (h.get('set-cookie')) list = [h.get('set-cookie')];
  const pairs = list.map((c) => c.split(';')[0]).filter(Boolean);
  if (pairs.length) cookie = pairs.join('; ');
}

async function ensureSession() {
  if (cookie && Date.now() - cookieAt < 600000) return;
  const r = await fetch(PAGE, {
    headers: { 'User-Agent': UA, Referer: 'https://tubondi.com/' },
    redirect: 'follow',
    signal: AbortSignal.timeout(UP_TIMEOUT),
  });
  setCookies(r.headers);
  cookieAt = Date.now();
  await r.text().catch(() => '');
}

async function upArribos(code) {
  const call = () =>
    fetch(CMD + '?cmd=proximos_arribos', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        Referer: PAGE,
        Origin: ORIGIN,
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookie,
      },
      body: form({
        codigo: code,
        conf: CONF,
        show80min: 'true',
        onlygps: 'true',
        onlygps_array: '[]',
      }),
      signal: AbortSignal.timeout(UP_TIMEOUT),
    });

  try {
    await ensureSession();
    let r = await call();
    if (r.status === 408) {
      cookie = '';
      cookieAt = 0;
      await ensureSession();
      r = await call();
    }
    if (!r.ok) return null;
    const j = await r.json();
    return j && Array.isArray(j.proximos_arribos) ? j : null;
  } catch (e) {
    return null;
  }
}

function toBuses(j, code) {
  const arr = (j && j.proximos_arribos) || [];
  const stop = (j && j.parada && j.parada.codigo) || code;
  const out = [];
  for (const a of arr) {
    if (!a || !(parseInt(a.coche, 10) > 0)) continue;
    const p = a.a;
    if (!Array.isArray(p) || p.length < 4) continue;
    const lat = p[2];
    const lon = p[3];
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    out.push({
      serie: String(a.serie || ''),
      coche: String(a.coche),
      cliente: a.cliente,
      linea: String(a.linea || ''),
      ruta: String(a.ruta || ''),
      sentido: a.sentido || '',
      lat,
      lon,
      color: a.color || '',
      dist: typeof a.dist_parada === 'number' ? a.dist_parada : null,
      proximo: a.proximo || '',
      parada: stop,
      ts: 0,
    });
  }
  return out;
}

const inflight = new Map(); // código -> promesa en vuelo (no repetir pedidos)

function upOne(code) {
  const onFlight = inflight.get(code);
  if (onFlight) return onFlight;
  const p = upArribos(code);
  inflight.set(code, p);
  const done = () => inflight.delete(code);
  p.then(done, done);
  return p;
}

async function refreshCodes(codes) {
  const list = codes.filter((c) => typeof c === 'string' && /^[A-Za-z0-9]{1,8}$/.test(c)).slice(0, 24);
  const raw = new Array(list.length).fill(null);
  let i = 0;
  const worker = async () => {
    while (i < list.length) {
      const n = i++;
      raw[n] = await upOne(list[n]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONC, list.length) }, worker));
  const now = Date.now();
  let ok = 0;
  list.forEach((c, idx) => {
    if (!raw[idx]) return;
    ok++;
    const buses = toBuses(raw[idx], c).map((b) => Object.assign(b, { ts: now }));
    state.set(c, { ts: now, buses });
  });
  return { ok, total: list.length, raw, codes: list, ts: now };
}

function pickStale(limit) {
  const now = Date.now();
  return GLOBAL_STOPS.filter((c) => {
    const s = state.get(c);
    return !s || now - s.ts > FRESH_MS;
  })
    .sort((a, b) => ((state.get(a) || {}).ts || 0) - ((state.get(b) || {}).ts || 0))
    .slice(0, limit);
}

let inflightBatch = null;
async function refreshBatch(codes) {
  if (inflightBatch) return inflightBatch; // otro request ya está refrescando: lo esperamos
  inflightBatch = refreshCodes(codes).then(
    (r) => { inflightBatch = null; return r; },
    () => { inflightBatch = null; return null; }
  );
  return inflightBatch;
}

/* sonda a la fuente, cacheada 30 s: para /health (no satura la API) */
let upProbe = { ts: 0, ok: false, ms: 0, n: -1 };
async function probeUp() {
  if (Date.now() - upProbe.ts < 30000) return upProbe;
  const t0 = Date.now();
  const j = await upArribos('CE71');
  upProbe = {
    ts: Date.now(),
    ok: !!(j && Array.isArray(j.proximos_arribos)),
    ms: Date.now() - t0,
    n: j && Array.isArray(j.proximos_arribos) ? j.proximos_arribos.length : -1,
  };
  return upProbe;
}

function merge(codes) {
  const map = new Map();
  let newest = 0;
  let oldest = Infinity;
  for (const c of codes) {
    const s = state.get(c);
    if (!s) continue;
    newest = Math.max(newest, s.ts);
    oldest = Math.min(oldest, s.ts);
    for (const b of s.buses) {
      const k = b.serie || 'c' + b.coche;
      const prev = map.get(k);
      if (!prev || b.ts > prev.ts || (b.ts === prev.ts && (b.dist || 1e9) < (prev.dist || 1e9))) map.set(k, b);
    }
  }
  const now = Date.now();
  const buses = [...map.values()].sort((a, b) => (a.dist || 0) - (b.dist || 0));
  return {
    ok: newest > 0 && now - newest < STALE_MAX,
    ts: newest || 0,
    oldTs: oldest === Infinity ? 0 : oldest,
    n: buses.length,
    codes: codes.filter((c) => state.has(c)).length,
    buses,
  };
}

function corsHeaders(extra) {
  const h = new Headers(extra || undefined);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return h;
}

function json(obj, status, cacheSec) {
  const h = corsHeaders();
  h.set('Content-Type', 'application/json; charset=utf-8');
  if (cacheSec) h.set('Cache-Control', 'public, max-age=' + cacheSec);
  else h.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(obj), { status: status || 200, headers: h });
}

function codesOf(url, required) {
  const raw = url.searchParams.get('codes') || '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s, i, a) => /^[A-Za-z0-9]{1,8}$/.test(s) && a.indexOf(s) === i)
    .slice(0, MAX_CODES);
  if (!list.length && required) return null;
  return list;
}

async function cached(key, sec, fn) {
  if (typeof caches === 'undefined' || !caches.default) return fn();
  const c = caches.default;
  const req = new Request('https://bondi-live.invalid' + key);
  try {
    const hit = await c.match(req);
    if (hit) return hit;
  } catch (e) {}
  const res = await fn();
  if (res && res.status === 200) {
    try {
      await c.put(req, res.clone());
    } catch (e) {}
  }
  return res;
}

/* estado global + lote incremental en segundo plano */
async function globalLive(ctx) {
  const start = async () => {
    const stale = pickStale(BATCH);
    if (!stale.length) return;
    await refreshBatch(stale);
  };

  if (state.size === 0) {
    await start(); // arranque frío: devolvemos con datos ya
  } else {
    const p = start();
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(p.catch(() => {}));
    else await p;
  }
  return json(merge(GLOBAL_STOPS), 200, LIVE_CACHE);
}

async function detailLive(codes) {
  const res = await refreshCodes(codes);
  const out = merge(codes);
  out.refreshed = res ? res.ok : 0;
  return json(out, 200, AR_CACHE);
}

async function arribosResponse(codes) {
  const res = await refreshCodes(codes);
  const stops = {};
  let ok = 0;
  if (res) {
    codes.forEach((c, i) => {
      const j = res.raw[i];
      if (!j) return;
      ok++;
      stops[c] = {
        parada: { codigo: (j.parada && j.parada.codigo) || c, descripcion: (j.parada && j.parada.descripcion) || '' },
        proximos: j.proximos_arribos || [],
        ts: res.ts,
      };
    });
  }
  return json({ ok: ok > 0, ts: res ? res.ts : Date.now(), okStops: ok, stops }, 200, AR_CACHE);
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });

    if (url.pathname === '/health') {
      const up = await probeUp();
      const cf = req.cf || {};
      return json({
        ok: true,
        ts: Date.now(),
        stops: state.size,
        colo: cf.colo || null,
        country: cf.country || null,
        up,
      });
    }

    if (url.pathname === '/live') {
      const codes = codesOf(url, false);
      if (!codes || !codes.length) return await globalLive(ctx);
      return await cached('/live?codes=' + codes.join(','), AR_CACHE, () => detailLive(codes));
    }

    if (url.pathname === '/arribos') {
      const codes = codesOf(url, true);
      if (!codes) return json({ ok: false, error: 'codes' }, 400);
      return await cached('/arribos?codes=' + codes.join(','), AR_CACHE, () => arribosResponse(codes));
    }

    return json({ ok: false, error: 'not found' }, 404);
  },
};
