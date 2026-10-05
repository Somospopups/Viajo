/* ¿La fuente tiene un comando que devuelva TODOS los bondis de una llamada?

   El relay hoy consulta parada por parada (24 códigos, 6 por pedido) y por eso
   los datos llegan con 40-86 s de antigüedad. Si la app oficial tiene un cmd de
   "mapa completo", con 1 pedido cada pocos segundos tendríamos todo fresco.

   1. abre sesión igual que el relay
   2. baja la página y sus JS, y lista todos los cmd= que aparecen
   3. prueba proximos_arribos con codigo vacio / sin codigo

   Uso: node tools/probe-cmd.js */
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
    const others = cookie.split('; ').filter((c) => c && c.split('=')[0] !== name);
    cookie = [...others, kv].join('; ');
  }
}

async function sesion() {
  const r = await fetch(PAGE, {
    headers: { 'User-Agent': UA, Referer: ORIGIN + '/', Origin: ORIGIN, Accept: 'text/html' },
    redirect: 'follow',
  });
  setCookies(r);
  const html = await r.text();
  return html;
}

const form = (o) => new URLSearchParams(o).toString();

async function cmd(extra) {
  const r = await fetch(CMD, {
    method: 'POST',
    headers: {
      'User-Agent': UA, Referer: PAGE, Origin: ORIGIN,
      'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie,
    },
    body: form(Object.assign({ conf: 'cbaciudad' }, extra)),
    signal: AbortSignal.timeout(20000),
  });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) { /* no json */ }
  return { status: r.status, json: j, texto: t };
}

(async () => {
  const html = await sesion();
  console.log('sesión:', cookie ? cookie.slice(0, 60) + '…' : '(sin cookie)', '· página', html.length, 'bytes');

  /* --- 1) cmd= visibles en la página --- */
  const cmds = new Set();
  for (const m of html.matchAll(/cmd\s*[=:]\s*['"]?([a-zA-Z_]+)/g)) cmds.add(m[1]);
  console.log('\n== cmd= en urbano.php ==');
  console.log('  ', [...cmds].join(', ') || '(ninguno)');

  /* --- 2) bajar los JS referenciados --- */
  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]);
  console.log('\nscripts referenciados:', srcs.length);
  for (const s of srcs.slice(0, 12)) {
    const url = s.startsWith('http') ? s : (s.startsWith('/') ? 'https://micronauta4.dnsalias.net' + s : UP + '/' + s);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: PAGE, Cookie: cookie }, signal: AbortSignal.timeout(15000) });
      const t = await r.text();
      const found = new Set();
      for (const m of t.matchAll(/cmd\s*[=:]\s*['"]?([a-zA-Z_]+)/g)) found.add(m[1]);
      if (found.size) console.log('   ', url.split('/').pop(), '->', [...found].join(', '));
      found.forEach((f) => cmds.add(f));
    } catch (e) { console.log('    falló', url.split('/').pop(), e.message); }
  }

  /* --- 3) probar proximos_arribos sin código / con código vacío --- */
  console.log('\n== proximos_arribos sin codigo ==');
  for (const [etiqueta, extra] of [
    ['sin codigo', { show80min: 'true', onlygps: 'true', onlygps_array: '[]' }],
    ['codigo vacio', { codigo: '', show80min: 'true', onlygps: 'true', onlygps_array: '[]' }],
    ['codigo "*"  ', { codigo: '*', show80min: 'true', onlygps: 'true', onlygps_array: '[]' }],
  ]) {
    try {
      const r = await cmd(Object.assign({ cmd: 'proximos_arribos' }, extra));
      const n = r.json && Array.isArray(r.json.proximos_arribos) ? r.json.proximos_arribos.length : null;
      console.log('  ', etiqueta.padEnd(14), '->', r.status, n != null ? n + ' arribos' : (r.texto.slice(0, 90).replace(/\s+/g, ' ') || '(vacío)'));
      if (n) {
        const a = r.json.proximos_arribos[0];
        console.log('      primer arribo:', JSON.stringify({ coche: a.coche, linea: a.linea, a: a.a, dist: a.dist_parada }).slice(0, 140));
      }
    } catch (e) { console.log('  ', etiqueta.padEnd(14), '-> ERR', e.message); }
    await new Promise((r) => setTimeout(r, 900));
  }

  console.log('\n== todos los cmd= descubiertos ==');
  console.log('  ', [...cmds].sort().join(', ') || '(ninguno)');
})();
