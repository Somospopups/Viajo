/* Define los límites de consultacoche y la frescura REAL de la fuente:
     1. hora_actual vs fechayhora  -> ¿la fuente publica posiciones frescas?
     2. tamaño máximo de la lista "coches" (408 en 40)
     3. ¿filtra por cliente o devuelve cualquiera?
   Uso: node tools/probe-coches3.js */
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
async function cmd(extra) {
  const t0 = Date.now();
  const r = await fetch(CMD, {
    method: 'POST',
    headers: { 'User-Agent': UA, Referer: PAGE, Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
    body: new URLSearchParams(Object.assign({ conf: 'cbaciudad' }, extra)).toString(),
    signal: AbortSignal.timeout(30000),
  });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) { /* nada */ }
  return { ms: Date.now() - t0, status: r.status, json: j, texto: t };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ahora = () => new Date();

(async () => {
  const r0 = await fetch(PAGE, { headers: { 'User-Agent': UA, Referer: ORIGIN + '/', Origin: ORIGIN } });
  setCookies(r0);
  await r0.text();

  /* --- 1) frescura de la fuente --- */
  console.log('== frescura de la fuente ==');
  for (let i = 0; i < 3; i++) {
    const h = await cmd({ cmd: 'hora_actual' });
    const c = await cmd({ cmd: 'consultacoche', coches: '1195,1331,1204', cliente: '421' });
    const hs = (h.json && h.json.hora) || '?';
    const f = c.json && c.json[0] ? c.json[0].fechayhora : '?';
    // diferencia entre hora del servidor y la marca de la posición
    let dif = null;
    if (hs !== '?' && f !== '?') {
      const [hh, mm, ss] = hs.split(':').map(Number);
      const m = f.match(/(\d\d):(\d\d):(\d\d)/);
      if (m) dif = (hh * 3600 + mm * 60 + ss) - (+m[1] * 3600 + +m[2] * 60 + +m[3]);
    }
    console.log('  hora servidor', hs, '· fechayhora posición', String(f).slice(-8),
      '→', dif == null ? '?' : dif + ' s de diferencia',
      '| llamadas', h.ms + 'ms +' + c.ms + 'ms');
    if (i < 2) await sleep(4000);
  }

  /* --- 2) límite de la lista --- */
  console.log('\n== límite de "coches" en una llamada ==');
  for (const n of [15, 20, 25, 30, 35]) {
    const lista = Array.from({ length: n }, (_, i) => 1000 + i * 7).join(',');
    const rr = await cmd({ cmd: 'consultacoche', coches: lista, cliente: '421' });
    console.log('  pedidos', String(n).padStart(3), '->', rr.status, rr.ms + 'ms ·',
      rr.json ? Object.keys(rr.json).length : 0, 'devueltos');
    await sleep(1000);
  }

  /* --- 3) ¿filtra por cliente? --- */
  console.log('\n== ¿filtra por cliente? ==');
  // coches que sabemos de otros clientes (411 y 408) junto con uno de 421
  const rr = await cmd({ cmd: 'consultacoche', coches: '1195,1331', cliente: '411' });
  if (rr.json) {
    const ks = Object.keys(rr.json);
    console.log('  pedido cliente=411 con coches de 421 ->', rr.status, ks.length, 'devueltos');
    for (const k of ks.slice(0, 3)) {
      const o = rr.json[k];
      console.log('   ', 'coche', o.coche, '· cliente devuelto:', o.cliente, '· linea', o.linea, '· lat', o.lat);
    }
  } else console.log('  no json', rr.texto.slice(0, 160));
  await sleep(900);
  const rr2 = await cmd({ cmd: 'consultacoche', coches: '1195,1331' });
  if (rr2.json) {
    const ks = Object.keys(rr2.json);
    console.log('  sin cliente          ->', rr2.status, ks.length, 'devueltos',
      ks.length ? '· cliente:' + rr2.json[0].cliente : '');
  } else console.log('  sin cliente: no json', rr2.status, rr2.texto.slice(0, 160).replace(/\s+/g, ' '));
})();
