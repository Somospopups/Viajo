/* Diagnóstico de georreferenciación: ¿los datos de TU BONDI caen sobre la calle?

   Compara contra OpenStreetMap (referencia independiente de los tiles):
     1. paradas de data.js vs paradas de OSM  → ¿hay un corrimiento sistemático?
     2. paradas de data.js vs vías de OSM     → ¿quedan al costado de la calle?
     3. bondis en vivo vs vías de OSM          → ¿andan sobre la calle?

   Overpass limita por IP: consultas de a una cláusula, con espera y reintentos.
   Uso: node tools/diag-georef.js */
'use strict';
const fs = require('fs');
const path = require('path');
const UA = 'bondi-georef-diag/1.0 (github.com/Somospopups/Viajo)';
const ESPEJOS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LAT0 = -31.42, LON0 = -64.19;
const MX = 94930, MY = 111320;
const px = (lat, lon) => [(lon - LON0) * MX, (lat - LAT0) * MY];

function distPointSeg(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  if (!l2) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
const minDistToWays = (p, ways) => {
  let best = Infinity;
  for (const g of ways) for (let i = 1; i < g.length; i++) {
    const d = distPointSeg(p, g[i - 1], g[i]);
    if (d < best) best = d;
  }
  return best;
};
function nearest(p, nodes) {
  let best = Infinity, bp = null;
  for (const n of nodes) {
    const d = Math.hypot(p[0] - n[0], p[1] - n[1]);
    if (d < best) { best = d; bp = n; }
  }
  return { d: best, p: bp };
}
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? Math.round(s[Math.floor(s.length / 2)]) : null; };
const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s.length ? Math.round(s[Math.floor(s.length * q)]) : null; };

async function overpass(q, intentos) {
  let last = null;
  for (let i = 0; i < (intentos || 4); i++) {
    for (const url of ESPEJOS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, Accept: 'application/json' },
          body: 'data=' + encodeURIComponent(q),
          signal: AbortSignal.timeout(60000),
        });
        if (r.ok) return r.json();
        last = new Error(url.split('/')[2] + ' ' + r.status);
        if (r.status === 429 || r.status >= 500) continue; // siguiente espejo
        break;
      } catch (e) { last = e; }
    }
    await sleep(9000 + i * 6000); // vuelta completa: esperamos y reintentamos
  }
  throw last || new Error('overpass sin respuesta');
}

(async () => {
  const D = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8').replace(/^window\.DATA=/, '').replace(/;\s*$/, '')
  );
  const B = D.bbox;

  /* bondis en vivo (varias pasadas: el relay arranca en frío) */
  const buses = [], seen = {};
  for (let i = 0; i < 3 && buses.length < 30; i++) {
    try {
      const j = await (await fetch('https://bondi-live.somospopups.workers.dev/live?cb=' + (Date.now() + i), { cache: 'no-store' })).json();
      (j.buses || []).forEach((b) => {
        if (typeof b.lat !== 'number') return;
        const id = String(b.serie || b.coche);
        if (seen[id]) return;
        seen[id] = 1;
        buses.push({ lat: b.lat, lon: b.lon, linea: b.linea });
      });
    } catch (e) { console.log('relay:', e.message); }
    await sleep(1200);
  }
  console.log('bondis en vivo:', buses.length);

  console.log('\n[1/3] paradas de OSM…');
  const osmStops = (await overpass(`[out:json];node["highway"="bus_stop"](${B.min_lat},${B.min_lon},${B.max_lat},${B.max_lon});out;`))
    .elements.map((e) => px(+e.lat, +e.lon));
  console.log('   ', osmStops.length, 'paradas de OSM');

  const paradas = D.P.filter((p) => p.la > B.min_lat && p.la < B.max_lat && p.lo > B.min_lon && p.lo < B.max_lon);
  const paso = Math.max(1, Math.floor(paradas.length / 250));
  const samp = [];
  for (let i = 0; i < paradas.length; i += paso) samp.push(paradas[i]);

  const dStop = [], vx = [], vy = [];
  for (const p of samp) {
    const a = px(p.la, p.lo);
    const n = nearest(a, osmStops);
    if (!isFinite(n.d) || n.d > 800) continue;
    dStop.push(n.d);
    vx.push(n.p[0] - a[0]); // OSM − API (metros)
    vy.push(n.p[1] - a[1]);
  }
  console.log('\n== [1] paradas TU BONDI vs paradas de OSM ==');
  console.log('   n=' + dStop.length,
    '· dist mediana', med(dStop) + ' m', '· p75', pct(dStop, 0.75) + ' m', '· p90', pct(dStop, 0.9) + ' m');
  console.log('   vector (OSM − API): dx', med(vx) + ' m · dy', med(vy) + ' m',
    '\n   → si dx/dy ~0, los datos de TU BONDI están bien georreferenciados',
    '\n   → si hay un valor chico constante, hay un corrimiento real que hay que restar');

  /* vías: una consulta por zona muestreada (una cláusula por vez) */
  const zonas = [];
  const pasoB = Math.max(1, Math.floor(buses.length / 3));
  for (let i = 0; i < buses.length && zonas.length < 3; i += pasoB) zonas.push(buses[i]);

  console.log('\n[2/3] vías de OSM cerca de los bondis…');
  const ways = [];
  for (const b of zonas) {
    try {
      const j = await overpass(`[out:json];way["highway"](around:300,${b.lat},${b.lon});out geom;`);
      j.elements.forEach((e) => {
        const g = (e.geometry || []).map((g2) => px(+g2.lat, +g2.lon));
        if (g.length > 1) ways.push(g);
      });
      console.log('   zona', b.lat.toFixed(4), b.lon.toFixed(4), '→', j.elements.length, 'vías (acum', ways.length + ')');
    } catch (e) { console.log('   zona falló:', e.message); }
    await sleep(6000);
  }

  if (ways.length) {
    const dBuses = buses.map((b) => minDistToWays(px(b.lat, b.lon), ways));
    console.log('\n== [3] bondis en vivo vs vías de OSM ==');
    console.log('   n=' + dBuses.length, '· mediana', med(dBuses) + ' m', '· p75', pct(dBuses, 0.75) + ' m', '· p90', pct(dBuses, 0.9) + ' m',
      '\n   → un bondi sobre la calle queda a <25 m del eje; un corrimiento real se ve como 80 m+');

    const dStopRoad = samp.map((p) => minDistToWays(px(p.la, p.lo), ways));
    console.log('\n== [2] paradas TU BONDI vs vías de OSM ==');
    console.log('   n=' + dStopRoad.length, '· mediana', med(dStopRoad) + ' m', '· p75', pct(dStopRoad, 0.75) + ' m');
  }
})();
