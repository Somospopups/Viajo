/* Resuelve el directorio `_raw` del pipeline de datos (cosecha de TU BONDI).
   Prioridad:
     1. RAW_DIR (variable de entorno)
     2. <repo>/_raw            (si el pipeline corre dentro de Viajo)
     3. <repo hermano>/bondi-cba/_raw  (cosecha histórica)
   Si no existe ninguno, crea <repo>/_raw. */
'use strict';
const fs = require('fs');
const path = require('path');

function resolveRaw() {
  const cands = [];
  if (process.env.RAW_DIR) cands.push(process.env.RAW_DIR);
  cands.push(path.join(__dirname, '..', '_raw'));
  cands.push(path.join(__dirname, '..', '..', 'bondi-cba', '_raw'));
  for (const c of cands) {
    if (fs.existsSync(path.join(c, 'lineasyrutas.json'))) return c;
  }
  const made = path.join(__dirname, '..', '_raw');
  fs.mkdirSync(path.join(made, 'horarios'), { recursive: true });
  return made;
}

module.exports = { resolveRaw };
