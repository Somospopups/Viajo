// Genera la lista de paradas del feed global (/live) a partir de data.js.
// Uso: node relay/genstops.js  (imprime el array JSON a embeber en src/index.js)
const fs = require('fs');
const path = require('path');

const RAW = path.join(__dirname, '..', 'data.js');
const s = fs.readFileSync(RAW, 'utf8');
const body = s.slice(s.indexOf('=') + 1);
const D = JSON.parse(body.slice(0, body.lastIndexOf('}') + 1));

const stopLines = {};
for (const l of D.lineas) {
  for (const r of l.r) {
    for (const ix of D.R[r.t] || []) {
      const k = D.P[ix].k;
      (stopLines[k] = stopLines[k] || new Set()).add(l.i);
    }
  }
}
const meta = {};
for (const p of D.P) meta[p.k] = { k: p.k, la: p.la, lo: p.lo };

const TARGET = 18;
const MIN_KM = 0.7;
const km = (a, b) => {
  const dla = (a.la - b.la) * 111;
  const dlo = (a.lo - b.lo) * 111 * Math.cos((a.la * Math.PI) / 180);
  return Math.sqrt(dla * dla + dlo * dlo);
};

const uncovered = new Set(D.lineas.map((l) => l.i));
const chosen = [];
const used = new Set();

while (uncovered.size) {
  let best = null;
  let bestN = -1;
  for (const k of Object.keys(stopLines)) {
    if (used.has(k) || !meta[k]) continue;
    let n = 0;
    for (const ln of stopLines[k]) if (uncovered.has(ln)) n++;
    if (n > bestN) {
      bestN = n;
      best = k;
    }
  }
  if (!best) break;
  used.add(best);
  chosen.push(best);
  for (const ln of stopLines[best]) uncovered.delete(ln);
}

while (chosen.length < TARGET) {
  let best = null;
  let bestS = -1;
  for (const k of Object.keys(stopLines)) {
    if (used.has(k) || !meta[k]) continue;
    let mind = 1e9;
    for (const c of chosen) mind = Math.min(mind, km(meta[k], meta[c]));
    if (mind < MIN_KM) continue;
    let extra = 0;
    for (const ln of stopLines[k]) if (uncovered.has(ln)) extra++;
    const score = stopLines[k].size + extra * 5 + mind;
    if (score > bestS) {
      bestS = score;
      best = k;
    }
  }
  if (!best) break;
  used.add(best);
  chosen.push(best);
}

const covered = new Set();
for (const k of chosen) for (const ln of stopLines[k]) covered.add(ln);
console.error('paradas=' + chosen.length + ' lineas=' + covered.size + '/' + new Set(D.lineas.map((l) => l.i)).size);
console.log(JSON.stringify(chosen));
