/* Cosecha los horarios de TODAS las rutas desde la API de TU BONDI Córdoba.
   Guarda un JSON por (ruta, parada) en _raw/horarios/<linea>_<cliente>_<ruta>_<codigo>.json

   Uso:
     node tools/harvest-horarios.js                 # 4 paradas por ruta, tope 40 intentos
     node tools/harvest-horarios.js --objetivo=6     # más paradas por ruta
     node tools/harvest-horarios.js --solo=10_411_1  # una ruta (para probar)

   Es idempotente: los archivos ya existentes se cuentan como cubiertos y no se
   vuelven a pedir, así que se puede cortar y relanzar. Respeta la API (~1 req/s).
   Resultados contradictorios de las sondas:
     - el parámetro `sentido` DEBE ser el de la propia ruta (I o V)
     - solo algunas paradas tienen horarios publicados (~1 de cada 3),
       por eso se recorren en orden: extremos (terminales), luego el resto. */
'use strict';
const fs = require('fs');
const path = require('path');
const { resolveRaw } = require('./raw-dir');

const RAW = resolveRaw();
const HDIR = path.join(RAW, 'horarios');
fs.mkdirSync(HDIR, { recursive: true });

const BASE = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = BASE + '/urbano.php?conf=cbaciudad';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sa', 'do', 'fe'];

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const a = args.find((x) => x.startsWith('--' + n + '='));
  return a ? a.slice(n.length + 3) : d;
};
const OBJETIVO = +getArg('objetivo', 4);
const TOPE = +getArg('tope', 40);
const SOLO = getArg('solo', null);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = '';
let llamadas = 0;

async function req(url, intentos) {
  for (let i = 0; i < (intentos || 3); i++) {
    try {
      const h = { 'User-Agent': UA, Referer: PAGE, Origin: 'https://micronauta4.dnsalias.net' };
      if (cookie) h.Cookie = cookie;
      const r = await fetch(url, { headers: h, signal: AbortSignal.timeout(15000) });
      llamadas++;
      const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
      if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
      const t = await r.text();
      if (t.length) return t;
      // sesión vencida o respuesta vacía: renovamos y reintentamos
      await req(PAGE, 1);
      await sleep(500);
    } catch (e) {
      await sleep(800);
    }
  }
  return '';
}

function tieneDatos(t) {
  try {
    const j = JSON.parse(t);
    return DIAS.some((d) => Array.isArray(j[d]) && j[d].length);
  } catch (e) {
    return false;
  }
}

/* orden de ataque: terminales, después muestreo parejo, después el resto */
function ordenParadas(stops) {
  const n = stops.length;
  const out = [];
  const add = (i) => { if (i >= 0 && i < n && !out.includes(i)) out.push(i); };
  add(0); add(n - 1);
  [0.25, 0.75, 0.5, 0.1, 0.9, 0.35, 0.65].forEach((f) => add(Math.round(f * (n - 1))));
  for (let i = 0; i < n; i++) add(i);
  return out;
}

(async () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8').replace(/^window\.DATA=/, '').replace(/;\s*$/, '')
  );
  const sentido = {};
  data.lineas.forEach((l) => l.r.forEach((r) => { sentido[r.t] = r.s; }));

  const keys = Object.keys(data.R).filter((k) => data.R[k].length > 0 && (!SOLO || k === SOLO));
  console.log(`_raw: ${RAW}`);
  console.log(`rutas: ${keys.length} · objetivo ${OBJETIVO} paradas/ruta · tope ${TOPE} intentos · sentido por ruta`);

  const t0 = Date.now();
  let rutasOk = 0, nuevos = 0, totalClaves = 0;

  for (const key of keys) {
    const [linea, cliente] = key.split('_');
    const sent = sentido[key] || 'I';
    const stops = data.R[key];
    const order = ordenParadas(stops);
    let hits = 0, intentos = 0;

    for (const i of order) {
      if (hits >= OBJETIVO || intentos >= TOPE) break;
      const code = data.P[stops[i]].k;
      const fp = path.join(HDIR, `${key}_${code}.json`);
      if (fs.existsSync(fp) && fs.statSync(fp).size > 0) { hits++; continue; }

      intentos++;
      const url = `${BASE}/urbano2_cmd.php?cmd=ver_horarios&linea=${linea}&codigo=${code}&cliente=${cliente}&sentido=${sent}&conf=cbaciudad`;
      const t = await req(url);
      if (tieneDatos(t)) {
        fs.writeFileSync(fp, t);
        hits++;
        nuevos++;
      }
      await sleep(400);
    }

    totalClaves += hits;
    if (hits > 0) rutasOk++;
    const pct = Math.round(((keys.indexOf(key) + 1) / keys.length) * 100);
    const seg = Math.round((Date.now() - t0) / 1000);
    console.log(
      `[${String(pct).padStart(3)}%] ${key.padEnd(12)} sentido=${sent} -> ${hits} paradas (${intentos} pedidos) · ` +
      `global: ${rutasOk}/${keys.length} rutas · ${totalClaves} claves · ${llamadas} llamadas · ${seg}s`
    );
  }

  console.log('---');
  console.log({
    rutasConHorario: rutasOk,
    rutasTotales: keys.length,
    clavesNuevas: nuevos,
    clavesTotales: totalClaves,
    llamadas,
    minutos: Math.round((Date.now() - t0) / 60000),
  });
})();
