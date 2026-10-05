/* Assets nativos de la APK Android (íconos + splash) generados desde icons/ y logo.svg.
   Uso: node tools/gen-android-assets.js */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');
const SRC_SQUARE = path.join(root, 'icons', 'icon-512.png');
const SRC_MASK = path.join(root, 'icons', 'icon-maskable-512.png');
const LOGO = path.join(root, 'logo.svg');
const DENS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const BG = '#33CCFF';

/* ============================ ÍCONOS ============================ */
async function icons() {
  const { data, info } = await sharp(SRC_MASK).raw().toBuffer({ resolveWithObject: true });
  const i = (2 * info.width + 2) * info.channels;
  const hex = '#' + [data[i], data[i + 1], data[i + 2]]
    .map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

  fs.writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">' +
    hex + '</color>\n</resources>\n');

  for (const [density, size] of Object.entries(DENS)) {
    const dir = path.join(res, 'mipmap-' + density);
    fs.mkdirSync(dir, { recursive: true });
    await sharp(SRC_SQUARE).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(SRC_MASK).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    await sharp(SRC_MASK).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  return hex;
}

/* ============================ SPLASH ============================ */
function gradSvg(w, h) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<defs><radialGradient id="g" cx="50%" cy="20%" r="120%">' +
    '<stop offset="0%" stop-color="#5FDBFF"/><stop offset="45%" stop-color="#33CCFF"/>' +
    '<stop offset="100%" stop-color="#0FA9DE"/></radialGradient></defs>' +
    '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/></svg>';
}

async function splash() {
  const files = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'splash.png') files.push(p);
  });
  walk(res);

  const logoSrc = fs.readFileSync(LOGO);

  for (const file of files) {
    const meta = await sharp(file).metadata();
    const w = meta.width, h = meta.height;
    const lw = Math.round(Math.min(w, h) * 0.34);
    const logo = await sharp(logoSrc)
      .resize(lw, lw, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
    const bg = await sharp(Buffer.from(gradSvg(w, h))).png().toBuffer();
    await sharp(bg).composite([{ input: logo, gravity: 'center' }]).png().toFile(file);
  }
  return files.length;
}

(async function main() {
  const hex = await icons();
  const n = await splash();
  console.log('Assets Android listos: íconos (5 densidades, fondo ' + hex + ') + ' + n + ' splash.');
})();
