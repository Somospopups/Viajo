/* Genera data.js a partir de _raw/ (líneas, trazas, paradas y horarios).
   Uso: node tools/build-data.js        (TOL=14 por defecto, o env TOL=n)
   El directorio _raw lo resuelve tools/raw-dir.js. */
const fs = require('fs');
const path = require('path');
const { resolveRaw } = require('./raw-dir');

const RAW = resolveRaw();
const OUT = path.join(__dirname, '..', 'data.js');
const LAT0 = -31.4201,
  LON0 = -64.1888;
const MX = 94930, MY = 111320; // metros por grado

const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
const files = fs.readdirSync(RAW);

// ---------- 1) lineas ----------
const lineasRaw = readJSON('lineasyrutas.json');

// ---------- 2) trazas ----------
function simplify(points, tol) {
  // points: [[lon,lat,curso],...]  tol en metros
  if (points.length < 3) return points.map((p) => [+p[0].toFixed(6), +p[1].toFixed(6)]);
  const pts = points.map((p) => ({ x: (p[0] - LON0) * MX, y: (p[1] - LAT0) * MY, lon: p[0], lat: p[1] }));
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const A = pts[a],
      B = pts[b];
    const dx = B.x - A.x,
      dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1e-9;
    let maxD = -1,
      idx = -1;
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const d = Math.abs((P.x - A.x) * dy - (P.y - A.y) * dx) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (maxD > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push([+pts[i].lon.toFixed(6), +pts[i].lat.toFixed(6)]);
  return dedupe(out);
}
function dedupe(arr) {
  const out = [];
  for (const p of arr) {
    const l = out[out.length - 1];
    if (!l || l[0] !== p[0] || l[1] !== p[1]) out.push(p);
  }
  return out;
}
function lengthKm(pts) {
  let m = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = (pts[i][0] - pts[i - 1][0]) * MX,
      dy = (pts[i][1] - pts[i - 1][1]) * MY;
    m += Math.hypot(dx, dy);
  }
  return +(m / 1000).toFixed(2);
}

const TOL = +(process.env.TOL || 14);
const traza = {};
const rawTraza = {};
let nSel = 0;
for (const f of files.filter((x) => x.startsWith('sel_') && x.endsWith('.json'))) {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
  } catch (e) {
    continue;
  }
  if (!d || !Array.isArray(d.traza) || d.traza.length < 2) continue;
  const key = f.slice(4, -5); // linea_cliente_ruta
  rawTraza[key] = d.traza.map((p) => [p[0], p[1]]);
  traza[key] = simplify(d.traza, TOL);
  nSel++;
}

// ---------- 3) paradas ----------
const stopMap = new Map();
let queries = 0;
for (const f of files.filter((x) => x.startsWith('pc_') && x.endsWith('.json'))) {
  let d;
  try {
    d = JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'));
  } catch (e) {
    continue;
  }
  queries++;
  const arr = (d.data && d.data.paradas) || [];
  for (const p of arr) {
    if (!p.codigo || stopMap.has(p.codigo)) continue;
    stopMap.set(p.codigo, { k: p.codigo, n: (p.parada_nombre || '').trim(), la: +(+p.lat).toFixed(6), lo: +(+p.lon).toFixed(6) });
  }
}
const P = [...stopMap.values()];

// ---------- 4) asociar paradas a rutas ----------
const CELL = 0.004;
const grid = new Map();
const gkey = (la, lo) => `${Math.floor(la / CELL)}_${Math.floor(lo / CELL)}`;
P.forEach((s, i) => {
  const k = gkey(s.la, s.lo);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(i);
});
function nearStops(la, lo, maxDeg) {
  const out = [];
  const cl = Math.floor(la / CELL),
    co = Math.floor(lo / CELL);
  for (let a = cl - 1; a <= cl + 1; a++)
    for (let b = co - 1; b <= co + 1; b++) {
      const arr = grid.get(`${a}_${b}`);
      if (arr) out.push(...arr);
    }
  return out;
}
const R = {};
const MAXM = 55;
for (const key of Object.keys(rawTraza)) {
  const t = rawTraza[key];
  const best = new Map(); // stopIdx -> {d, i}
  for (let i = 0; i < t.length; i++) {
    const la = t[i][1],
      lo = t[i][0];
    for (const si of nearStops(la, lo, CELL)) {
      const s = P[si];
      const dx = (s.lo - lo) * MX,
        dy = (s.la - la) * MY;
      const d = Math.hypot(dx, dy);
      if (d <= MAXM) {
        const cur = best.get(si);
        if (!cur || d < cur.d) best.set(si, { d, i });
      }
    }
  }
  const list = [...best.entries()].sort((a, b) => a[1].i - b[1].i).map(([si]) => si);
  if (list.length) R[key] = list;
}

// ---------- 5) lineas ----------
const lineas = lineasRaw.lineas.map((l) => ({
  i: String(l.linea_id),
  n: String(l.linea_nombre).replace(/_/g, '').trim(),
  c: l.color,
  e: +l.cliente,
  g: +l.grupo,
  r: l.rutas.map((r) => ({
    i: r.ruta_id,
    s: r.sentido,
    n: r.ruta_nombre,
    t: `${l.linea_id}_${l.cliente}_${r.ruta_id}`,
    k: traza[`${l.linea_id}_${l.cliente}_${r.ruta_id}`] ? lengthKm(traza[`${l.linea_id}_${l.cliente}_${r.ruta_id}`]) : 0,
    p: (R[`${l.linea_id}_${l.cliente}_${r.ruta_id}`] || []).length,
  })),
}));
const grupos = (lineasRaw.grupos || []).map((g) => ({ i: g.grupo_id, n: g.nombre, t: g.troncal, e: +g.cliente_id }));

// ---------- 6) horarios reales por parada ----------
const HDIR = path.join(RAW, 'horarios');
const horarios = {};
const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sa', 'do', 'fe'];
if (fs.existsSync(HDIR)) {
  for (const f of fs.readdirSync(HDIR).filter((x) => x.endsWith('.json'))) {
    let j;
    try {
      j = JSON.parse(fs.readFileSync(path.join(HDIR, f), 'utf8'));
    } catch (e) {
      continue;
    }
    const sigs = new Map();
    for (const d of DIAS) {
      const arr = (j[d] || []).map((h) => {
        const [a, b] = h.split(':');
        return +a * 60 + +b;
      });
      const sig = arr.join(',');
      if (!sigs.has(sig)) sigs.set(sig, { d: [], t: arr });
      sigs.get(sig).d.push(d);
    }
    horarios[f.replace(/\.json$/, '')] = [...sigs.values()].map((g) => [g.d.join(','), g.t]);
  }
}

const DATA = {
  gen: new Date().toISOString().slice(0, 16),
  bbox: { min_lat: -31.5603, max_lat: -31.3071, min_lon: -64.31, max_lon: -64.0572 },
  lineas,
  grupos,
  traza,
  P,
  R,
  H: horarios,
};

const json = JSON.stringify(DATA);
fs.writeFileSync(OUT, 'window.DATA=' + json + ';\n', 'utf8');

const withTraza = Object.keys(traza).length;
const conParadas = Object.keys(R).length;
const totalParadasAsig = Object.values(R).reduce((a, b) => a + b.length, 0);
console.log({
  _raw: RAW,
  TOL,
  lineas: lineas.length,
  rutasConTraza: withTraza,
  selLeidos: nSel,
  paradasConsultas: queries,
  paradasUnicas: P.length,
  rutasConParadas: conParadas,
  asignaciones: totalParadasAsig,
  clavesHorario: Object.keys(horarios).length,
  bytes: fs.statSync(OUT).size,
});
