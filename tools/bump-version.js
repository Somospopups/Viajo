/* Sube la versión de la app en las tres fuentes de verdad:
     core.js  -> var APP_VERSION = 'vNNN'
     index.html -> los seis ?v=NNN
     sw.js    -> var VERSION = 'vNNN' + los seis ?v=NNN del caché
   Uso: node tools/bump-version.js 191 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const n = String(process.argv[2] || '').replace(/\D/g, '');
if (!n) { console.error('Falta el número. Uso: node tools/bump-version.js 191'); process.exit(1); }

const pasos = [
  { f: 'core.js', re: /var APP_VERSION = 'v\d+';/g, to: "var APP_VERSION = 'v" + n + "';" },
  { f: 'index.html', re: /\?v=\d+/g, to: '?v=' + n },
  { f: 'sw.js', re: /var VERSION = 'v\d+';/g, to: "var VERSION = 'v" + n + "';" },
  { f: 'sw.js', re: /\?v=\d+/g, to: '?v=' + n }
];

const cache = {};
let total = 0;
for (const p of pasos) {
  if (cache[p.f] == null) cache[p.f] = fs.readFileSync(path.join(root, p.f), 'utf8');
  const antes = cache[p.f];
  const hits = (antes.match(p.re) || []).length;
  cache[p.f] = antes.replace(p.re, p.to);
  total += hits;
  console.log(p.f + ': ' + hits + ' · ' + p.re);
}
const vals = new Set();
for (const f of Object.keys(cache)) {
  fs.writeFileSync(path.join(root, f), cache[f]);
  (cache[f].match(/\?v=(\d+)/g) || []).forEach((m) => vals.add(m));
  const m = cache[f].match(/APP_VERSION = 'v(\d+)'|VERSION = 'v(\d+)'/);
  if (m) vals.add('v' + (m[1] || m[2]));
}
const mal = [...vals].filter((v) => v.replace(/\D/g, '') !== n);
console.log('→ v' + n + ' aplicada (' + total + ' reemplazos) · versiones encontradas en los archivos: ' +
  ([...vals].join(', ') || 'ninguna') + (mal.length ? ' · ⚠ DESFASE: ' + mal.join(', ') : ' ✓'));

