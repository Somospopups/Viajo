/* ¿Los tiles de ArcGIS (el mapa de fondo) están corrididos respecto de la realidad?

   Geocodifica las MISMAS direcciones con:
     - ArcGIS World Geocoding  (misma casa de datos que World_Street_Map)
     - Nominatim / OSM         (misma referencia contra la que ya medimos)
   y mide la diferencia en metros. Si ArcGIS devuelve todo corrido en la misma
   dirección, el mapa de fondo está corrido (y los bondis, aunque estén bien,
   se ven "fuera de la calle" que dibuja el mapa).

   Uso: node tools/diag-tiles.js */
'use strict';
const UA = 'bondi-georef-diag/1.0 (github.com/Somospopups/Viajo)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LAT0 = -31.42, LON0 = -64.19;
const MX = 94930, MY = 111320;
const px = (lat, lon) => [(lon - LON0) * MX, (lat - LAT0) * MY];
const metros = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]));

const DIRECCIONES = [
  'Av. Colón 869, Córdoba, Argentina',
  'Bv. Illia 340, Córdoba, Argentina',
  'Av. Rafael Núñez 480, Córdoba, Argentina',
  'Plaza San Martín, Córdoba, Argentina',
  'Av. Julio A. Roca 1200, Córdoba, Argentina',
];

async function arcgis(q) {
  const u = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'
    + '?SingleLine=' + encodeURIComponent(q) + '&f=json&maxLocations=1&outFields=Match_addr';
  const j = await (await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) })).json();
  const c = (j.candidates || [])[0];
  return c ? { lat: c.location.y, lon: c.location.x, dir: c.address, score: c.score } : null;
}

async function osm(q) {
  const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar'
    + '&q=' + encodeURIComponent(q);
  const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('nominatim ' + r.status);
  const j = await r.json();
  return j[0] ? { lat: +j[0].lat, lon: +j[0].lon, dir: j[0].display_name.slice(0, 60) } : null;
}

(async () => {
  const dx = [], dy = [], dist = [];
  console.log('dirección'.padEnd(46), 'ArcGIS − OSM (metros)');
  console.log('-'.repeat(78));
  for (const q of DIRECCIONES) {
    let a = null, o = null, err = '';
    try { a = await arcgis(q); } catch (e) { err = 'arcgis: ' + e.message; }
    await sleep(1100);
    try { o = await osm(q); } catch (e) { err += ' osm: ' + e.message; }
    await sleep(1100);
    if (!a || !o) { console.log(q.padEnd(46), '—', err || 'sin resultado'); continue; }
    const pa = px(a.lat, a.lon), po = px(o.lat, o.lon);
    const d = metros(pa, po);
    dx.push(Math.round(pa[0] - po[0]));
    dy.push(Math.round(pa[1] - po[1]));
    dist.push(d);
    console.log(
      (q.replace(/, Argentina$/, '')).padEnd(46),
      String(d).padStart(4), 'm',
      ` (dx ${pa[0] - po[0] >= 0 ? '+' : ''}${Math.round(pa[0] - po[0])} · dy ${pa[1] - po[1] >= 0 ? '+' : ''}${Math.round(pa[1] - po[1])})`,
      '→', (a.dir || '').slice(0, 28)
    );
  }
  if (dist.length) {
    const med = (v) => { const s = v.slice().sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    console.log('\n== resumen ==');
    console.log('   distancia mediana ArcGIS vs OSM:', med(dist) + ' m');
    console.log('   dx mediano:', med(dx) + ' m · dy mediano:', med(dy) + ' m');
    console.log('   → si las distancias son grandes Y el vector es parecido en todas,');
    console.log('     los tiles de ArcGIS están corridados y hay que corregirlos o cambiar de mapa.');
    console.log('   → si son <20 m, el mapa de fondo está bien y el problema es otra cosa.');
  }
})();
