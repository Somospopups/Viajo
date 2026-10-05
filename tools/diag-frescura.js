/* ¿Qué tan fresco es el feed y de qué depende?
   Muestrea /live del relay cada 4 s durante ~1 min y calcula, por muestra:
     - edad del ts más nuevo (lo que muestra el badge) y del más viejo
     - edad mediana por bondi
     - cuántas paradas globales están refrescadas (por edad)
   Así vemos si el "mapa corridido" viene de datos viejos y si refrescar más
   seguido lo arregla.
   Uso: node tools/diag-frescura.js */
'use strict';
const RELAY = 'https://bondi-live.somospopups.workers.dev';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

(async () => {
  console.log('muestreo de /live cada 4 s (16 muestras)…\n');
  console.log('  #  tsNuevo  tsViejo  mediana  p90    n bondis');
  console.log('  ' + '-'.repeat(52));
  const edadesAll = [];
  for (let i = 0; i < 16; i++) {
    const t0 = Date.now();
    let j = null;
    try {
      const r = await fetch(RELAY + '/live?cb=' + (t0 + i), { cache: 'no-store' });
      j = await r.json();
    } catch (e) { console.log('  error:', e.message); }
    if (j && Array.isArray(j.buses)) {
      const now = Date.now();
      const edades = j.buses.map((b) => now - (b.ts || 0)).sort((a, b) => a - b);
      edadesAll.push(...edades);
      console.log(
        '  ' + String(i + 1).padStart(2),
        String(Math.round((now - (j.ts || 0)) / 1000)).padStart(6) + 's',
        String(Math.round((now - (j.oldTs || 0)) / 1000) / 1000 >= 0 ? (now - (j.oldTs || 0)) / 1000 : 0).padStart(7).slice(0, 7) + 's',
        String(Math.round(med(edades) / 1000)).padStart(6) + 's',
        String(Math.round((edades[Math.floor(edades.length * 0.9)] || 0) / 1000)).padStart(5) + 's',
        String(j.buses.length).padStart(9),
        j.oldTs ? '' : '  (oldTs=0)'
      );
    }
    await sleep(Math.max(0, 4000 - (Date.now() - t0)));
  }
  const s = edadesAll.slice().sort((a, b) => a - b);
  console.log('\n== resumen de TODAS las lecturas ==');
  console.log('   n=' + s.length,
    '· mediana', Math.round(s[Math.floor(s.length / 2)] / 1000) + ' s',
    '· p75', Math.round(s[Math.floor(s.length * 0.75)] / 1000) + ' s',
    '· p90', Math.round(s[Math.floor(s.length * 0.9)] / 1000) + ' s',
    '· máx', Math.round(s[s.length - 1] / 1000) + ' s');
  console.log('   → a 11 m/s (40 km/h) eso son', Math.round(s[Math.floor(s.length / 2)] / 1000 * 11), 'm de error mediano',
    'y', Math.round(s[s.length - 1] / 1000 * 11), 'm en el peor caso');
})();
