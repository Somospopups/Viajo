/* Diagnóstico: ¿el relay popula su estado y la fuente de TU BONDI responde?
   Uso: node tools/diag-relay.js */
'use strict';
const RELAY = 'https://bondi-live.somospopups.workers.dev';
const UP = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = UP + '/urbano.php?conf=cbaciudad';
const CMD = UP + '/urbano2_cmd.php';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const t0 = Date.now();
  const r = await fetch(url, { cache: 'no-store' });
  const txt = await r.text();
  let j = null;
  try { j = JSON.parse(txt); } catch (e) {}
  return { ms: Date.now() - t0, status: r.status, acao: r.headers.get('access-control-allow-origin'), cache: r.headers.get('cache-control'), j, head: j ? null : txt.slice(0, 80) };
}

(async () => {
  console.log('--- relay /health x3 (2 s entre llamadas) ---');
  for (let i = 0; i < 3; i++) {
    const h = await get(`${RELAY}/health`);
    console.log(`  #${i} ${h.status} ${h.ms}ms acao=${h.acao} -> stops=${h.j && h.j.stops} ok=${h.j && h.j.ok}`);
    await sleep(2000);
  }

  console.log('--- relay /live x3 ---');
  for (let i = 0; i < 3; i++) {
    const l = await get(`${RELAY}/live`);
    console.log(`  #${i} ${l.status} ${l.ms}ms acao=${l.acao} cache=${l.cache} -> ok=${l.j && l.j.ok} n=${l.j && l.j.n} codes=${l.j && l.j.codes} ts=${l.j && l.j.ts}`);
    await sleep(2500);
  }

  console.log('--- fuente directa: proximos_arribos para CE71 ---');
  let cookie = '';
  const s = await fetch(PAGE, { headers: { 'User-Agent': UA, Referer: 'https://tubondi.com/' }, redirect: 'follow' });
  const sc = s.headers.getSetCookie ? s.headers.getSetCookie() : [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  await s.text();
  console.log(`  sesion: HTTP ${s.status} · cookie=${cookie ? 'si' : 'NO'}`);
  await sleep(400);

  const body = new URLSearchParams({ codigo: 'CE71', conf: 'cbaciudad', show80min: 'true', onlygps: 'true', onlygps_array: '[]' }).toString();
  const t0 = Date.now();
  try {
    const r = await fetch(CMD + '?cmd=proximos_arribos', {
      method: 'POST',
      headers: { 'User-Agent': UA, Referer: PAGE, Origin: 'https://micronauta4.dnsalias.net', 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body,
      signal: AbortSignal.timeout(20000),
    });
    const txt = await r.text();
    let n = null;
    try {
      const j = JSON.parse(txt);
      n = Array.isArray(j.proximos_arribos) ? j.proximos_arribos.length : 'sin array';
    } catch (e) { n = 'JSON invalido'; }
    console.log(`  HTTP ${r.status} ${Date.now() - t0}ms · arribos=${n} · ${txt.slice(0, 120).replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`  ERROR ${Date.now() - t0}ms · ${e.name}: ${e.message}`);
  }
})();
