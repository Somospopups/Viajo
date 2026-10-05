/* Genera los PNG del icono de la PWA a partir de logo.svg.
   Uso:  node tools/gen-icons.js   (requiere sharp, ver README)
   Sale todo en icons/. */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'icons');
const logo = fs.readFileSync(path.join(ROOT, 'logo.svg'), 'utf8')
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');

/* fondo = mismo radial del splash (#splash en style.css) + sombra del bondi */
function sheet(S, L) {
  const x = Math.round((S - L) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="f" cx="50%" cy="20%" r="125%">
      <stop offset="0" stop-color="#5FDBFF"/>
      <stop offset=".45" stop-color="#33CCFF"/>
      <stop offset="1" stop-color="#0FA9DE"/>
    </radialGradient>
    <filter id="s" x="-30%" y="-30%" width="160%" height="180%">
      <feDropShadow dx="0" dy="${(S / 40).toFixed(1)}" stdDeviation="${(S / 45).toFixed(1)}" flood-color="#003046" flood-opacity=".38"/>
    </filter>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#f)"/>
  <g filter="url(#s)">
    <svg x="${x}" y="${x}" width="${L}" height="${L}" viewBox="0 0 128 128">${logo}</svg>
  </g>
</svg>`;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.72 },
  { file: 'icon-512.png', size: 512, scale: 0.72 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.58 }, /* zona segura del 80 % */
  { file: 'apple-touch-icon.png', size: 180, scale: 0.78 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const ic of ICONS) {
    const L = Math.round(ic.size * ic.scale);
    await sharp(Buffer.from(sheet(ic.size, L)))
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, ic.file));
    console.log('ok', ic.file, ic.size + 'x' + ic.size);
  }
})().catch((e) => { console.error(e); process.exit(1); });
