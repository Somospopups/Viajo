/* Prueba los cmd= de coches de la fuente oficial:
     consultacocheporruta  -> coches de una ruta
     consultacoche         -> coches de una lista (¿podría refrescar todo el parque?)
     hora_actual           -> hora del servidor (sirve para medir frescura)
   Si consultacoche acepta una lista larga y devuelve posición GPS, el relay
   podría refrescar ~90 bondis en 2-4 llamadas en vez de 24 paradas.

   Uso: node tools/probe-coches.js */
'use strict';
const UP = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = UP + '/urbano.php?conf=cbaciudad';
const CMD = UP + '/urbano2_cmd.php';
const ORIGIN = 'https://micronauta4.dnsalias.net';
const UA = 'Mozilla/5.0 (Linux; Android 10; SM-A505M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';

let cookie = '';
function setCookies(res) {
  const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const parts = sc.length ? sc : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  for (const p of parts) {
    const kv = p.split(';')[0].trim();
    const name = kv.split('=')[0];
    cookie = [...cookie.split('; ').filter((c) => c && c.split('=')[0] !== name), kv].join('; ');
  }
}
async function sesion() {
  const r = await fetch(PAGE, { headers: { 'User-Agent': UA, Referer: ORIGIN + '/', Origin: ORIGIN } });
  setCookies(r);
  await r.text();
}
async function cmd(extra) {
  const t0 = Date.now();
  const r = await fetch(CMD, {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: PAGE, Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams(Object.assign({ conf: 'cbaciudad' }, extra)).toString(),
    signal: AbortSignal.timeout(20000),
  });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) { /* nada */ }
  return { ms: Date.now() - t0, status: r.status, json: j, texto: t };
}
const resumen = (j) => {
  if (!j || typeof j !== 'object') return String(j || '').slice(0, 120);
  const claves = Object.keys(j);
  const salida = { claves };
  for (const k of claves) {
    const v = j[k];
    if (Array.isArray(v)) salida[k] = 'array(' + v.length + ')' + (v.length ? ' · primeras claves: ' + Object.keys(v[0] || {}).slice(0, 14).join(',') : '');
    else if (v && typeof v === 'object') salida[k] = 'obj{' + Object.keys(v).slice(0, 10).join(',') + '}';
    else salida[k] = v;
  }
  return salida;
};

(async () => {
  await sesion();
  console.log('sesión ok\n');

  /* hora del servidor */
  try {
    const h = await cmd({ cmd: 'hora_actual' });
    console.log('hora_actual      ->', h.status, h.ms + 'ms', JSON.stringify(h.json).slice(0, 120));
  } catch (e) { console.log('hora_actual ERR', e.message); }

  /* coches de una ruta */
  console.log('\n== consultacocheporruta (ruta 68 · cliente 411) ==');
  try {
    const r = await cmd({
      cmd: 'consultacocheporruta', ruta: '68', cliente: '411', coche: '0',
      parada_seleccionada: '', operacion: '11453497440268610775',
    });
    console.log('  ', r.status, r.ms + 'ms');
    console.log('  ', JSON.stringify(resumen(r.json)));
    if (r.json && Array.isArray(r.json.coches) && r.json.coches[0]) {
      console.log('   primer coche:', JSON.stringify(r.json.coches[0]).slice(0, 400));
    } else if (r.json && Array.isArray(r.json)) {
      console.log('   es array plano, primero:', JSON.stringify(r.json[0]).slice(0, 400));
    } else if (!r.json) console.log('   (no json)', r.texto.slice(0, 200).replace(/\s+/g, ' '));
  } catch (e) { console.log('   ERR', e.message); }

  /* consultacoche con lista */
  console.log('\n== consultacoche con lista de coches ==');
  for (const [etiqueta, params] of [
    ['coches "1195,1331"', { cmd: 'consultacoche', coches: '1195,1331', cliente: '421' }],
    ['coches "[1195,1331]"', { cmd: 'consultacoche', coches: '[1195,1331]', cliente: '421' }],
    ['coches serie', { cmd: 'consultacoche', coches: '202224,200429', cliente: '421' }],
  ]) {
    try {
      const r = await cmd(params);
      console.log('  ', etiqueta.padEnd(20), '->', r.status, r.ms + 'ms', JSON.stringify(resumen(r.json)).slice(0, 260));
      if (r.json && Array.isArray(r.json.coches) && r.json.coches[0]) {
        console.log('       primer coche:', JSON.stringify(r.json.coches[0]).slice(0, 400));
      } else if (!r.json) console.log('       (no json)', r.texto.slice(0, 160).replace(/\s+/g, ' '));
    } catch (e) { console.log('  ', etiqueta.padEnd(20), '-> ERR', e.message); }
    await new Promise((r) => setTimeout(r, 900));
  }
})();
