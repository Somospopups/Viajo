/* Muestra el objeto completo que devuelve consultacoche (¿trae posicion GPS?)
   y cuántos coches aguanta en una sola llamada.
   Uso: node tools/probe-coches2.js */
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
    signal: AbortSignal.timeout(25000),
  });
  const t = await r.text();
  let j = null;
  try { j = JSON.parse(t); } catch (e) { /* nada */ }
  return { ms: Date.now() - t0, status: r.status, json: j, texto: t };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const r0 = await fetch(PAGE, { headers: { 'User-Agent': UA, Referer: ORIGIN + '/', Origin: ORIGIN } });
  setCookies(r0);
  await r0.text();

  console.log('== consultacoche: objeto completo (2 coches) ==');
  const r = await cmd({ cmd: 'consultacoche', coches: '1195,1331', cliente: '421' });
  if (r.json) {
    const ks = Object.keys(r.json);
    for (const k of ks.slice(0, 2)) console.log('  [' + k + ']', JSON.stringify(r.json[k], null, 1).slice(0, 900));
    console.log('  claves:', ks.join(','));
  } else console.log('  no json:', r.texto.slice(0, 200));
  console.log('  tiempo:', r.ms + 'ms');

  await sleep(900);
  console.log('\n== consultacoche: ¿aguanta lista larga? ==');
  for (const n of [10, 40, 90]) {
    const lista = Array.from({ length: n }, (_, i) => 1000 + i * 7).join(',');
    const rr = await cmd({ cmd: 'consultacoche', coches: lista, cliente: '421' });
    const devueltos = rr.json ? Object.keys(rr.json).length : 0;
    console.log('  pedidos', String(n).padStart(3), '->', rr.status, rr.ms + 'ms ·', devueltos, 'devueltos');
    await sleep(900);
  }
})();
