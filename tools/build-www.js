/* Genera www/ (assets que van dentro de la APK) a partir de los archivos web.
   Uso: node tools/build-www.js   ·   después: npx cap sync android */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');
const FILES = ['index.html', 'style.css', 'core.js', 'bici.js', 'views.js', 'main.js',
  'data.js', 'logo.svg', 'manifest.webmanifest'];
const DIRS = ['vendor', 'icons'];

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

for (const f of FILES) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) { console.warn('  (omitido, no existe) ' + f); continue; }
  fs.copyFileSync(src, path.join(www, f));
}
for (const d of DIRS) {
  fs.cpSync(path.join(root, d), path.join(www, d), { recursive: true });
}

/* El puente nativo se inyecta solo en la versión Android. */
const htmlPath = path.join(www, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace('<script src="vendor/leaflet.js"></script>',
  '<script src="bridge.js"></script>\n<script src="vendor/leaflet.js"></script>');
fs.writeFileSync(htmlPath, html);

/* Bundle de @capacitor/* para que la WebView pueda usarlo sin bundler. */
require('esbuild').buildSync({
  entryPoints: [path.join(root, 'tools', 'bridge-src.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  outfile: path.join(www, 'bridge.js'),
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning'
});

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(0);
console.log('www/ listo: index.html + ' + FILES.length + ' archivos, bridge.js ' +
  kb(path.join(www, 'bridge.js')) + ' KB, data.js ' + kb(path.join(www, 'data.js')) + ' KB');
