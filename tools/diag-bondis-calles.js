/* ¿Los bondis en vivo caen sobre una calle de OSM?
   Por cada bondi muestreado pide las vías en un radio de 220 m (una cláusula
   por vez, con espera: Overpass limita por IP) y mide la distancia mínima al
   eje de cualquier vía.  Si están sobre la calle -> <25 m típico.
   Si hay un corrimiento real de los datos -> 80 m+ de forma sistemática.

   Uso: node tools/diag-bondis-calles.js */
'use strict';
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
const minDist = (p, ways) => {
  let best = Infinity;
  for (const g of ways) for (let i = 1; i < g.length; i++) {
    const d = distPointSeg(p, g[i - 1], g[i]);
    if (d < best) best = d;
  }
  return best;
};

async function overpass(q) {
  let last = null;
  for (let v = 0; v < 3; v++) {
    for (const url of ESPEJOS) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA, Accept: 'application/json' },
          body: 'data=' + encodeURIComponent(q),
          signal: AbortSignal.timeout(45000),
        });
        if (r.ok) return r.json();
        last = new Error(url.split('/')[2] + ' ' + r.status);
        if (r.status === 429 || r.status >= 500) continue;
        break;
      } catch (e) { last = e; }
    }
    await sleep(8000);
  }
  throw last || new Error('sin respuesta');
}

(async () => {
  /* bondis en vivo (el relay arranca en frío: varias pasadas) */
  const buses = [], seen = {};
  for (let i = 0; i < 3 && buses.length < 40; i++) {
    try {
      const j = await (await fetch('https://bondi-live.somospopups.workers.dev/live?cb=' + (Date.now() + i), { cache: 'no-store' })).json();
      (j.buses || []).forEach((b) => {
        if (typeof b.lat !== 'number') return;
        const id = String(b.serie || b.coche);
        if (seen[id]) return;
        seen[id] = 1;
        buses.push(b);
      });
    } catch (e) { console.log('relay:', e.message); }
    await sleep(1200);
  }
  console.log('bondis en vivo:', buses.length);

  const paso = Math.max(1, Math.floor(buses.length / 6));
  const mues = [];
  for (let i = 0; i < buses.length && mues.length < 6; i += paso) mues.push(buses[i]);

  const d = [];
  for (const b of mues) {
    try {
      const j = await overpass(`[out:json];way["highway"](around:220,${b.lat},${b.lon});out geom;`);
      const ways = j.elements
        .map((e) => (e.geometry || []).map((g) => px(+g.lat, +g.lon)))
        .filter((g) => g.length > 1);
      const m = ways.length ? minDist(px(b.lat, b.lon), ways) : Infinity;
      if (isFinite(m)) d.push(m);
      console.log(
        `  L${b.linea} · ${b.lat.toFixed(5)},${b.lon.toFixed(5)}`.padEnd(34),
        '→', String(Math.round(m)).padStart(4), 'm a la calle más cercana',
        '·', j.elements.length, 'vías'
      );
    } catch (e) {
      console.log('  zona falló:', e.message);
    }
    await sleep(5000);
  }

  if (d.length) {
    const s = d.slice().sort((a, b) => a - b);
    const med = s[Math.floor(s.length / 2)];
    console.log('\n== bondis en vivo vs calles de OSM ==');
    console.log('   n=' + d.length, '· mediana', Math.round(med) + ' m', '· mín', Math.round(s[0]) + ' m', '· máx', Math.round(s[s.length - 1]) + ' m');
    console.log('   → <25 m: los datos en vivo están bien y el problema es otra cosa');
    console.log('   → >70 m: hay un corrimiento real de las coordenadas en vivo');
  }
})();
