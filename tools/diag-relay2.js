/* Sonda 2: qué responde el Worker con estado fresco (rompe el cache del edge
   con un query distinto en cada llamada) y si su refresh contra la fuente anda.
   Uso: node tools/diag-relay2.js */
'use strict';
const RELAY = 'https://bondi-live.somospopups.workers.dev';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function peek(url) {
  const t0 = Date.now();
  const r = await fetch(url, { cache: 'no-store' });
  const txt = await r.text();
  let j = null;
  try { j = JSON.parse(txt); } catch (e) {}
  return { ms: Date.now() - t0, status: r.status, acao: r.headers.get('access-control-allow-origin'), j, head: j ? null : txt.slice(0, 100) };
}

(async () => {
  console.log('--- /live fresco x4 (query distinto cada vez, 3 s) ---');
  for (let i = 0; i < 4; i++) {
    const l = await peek(`${RELAY}/live?cb=${Date.now()}_${i}`);
    const j = l.j || {};
    console.log(`  #${i} ${l.status} ${l.ms}ms acao=${l.acao} -> ok=${j.ok} n=${j.n} codes=${j.codes} ts=${j.ts ? new Date(j.ts).toISOString().slice(11, 19) : j.ts} old=${j.oldTs ? new Date(j.oldTs).toISOString().slice(11, 19) : j.oldTs}`);
    if (l.head) console.log('      body:', l.head);
    await sleep(3000);
  }

  console.log('--- /health fresco x2 ---');
  for (let i = 0; i < 2; i++) {
    const h = await peek(`${RELAY}/health?cb=${Date.now()}_${i}`);
    console.log(`  #${i} ${h.status} ${h.ms}ms -> ${JSON.stringify(h.j)}`);
    await sleep(4000);
  }

  console.log('--- /live?codes=CE71 (detalle, alimenta state) ---');
  const d = await peek(`${RELAY}/live?codes=CE71&cb=${Date.now()}`);
  console.log(`  ${d.status} ${d.ms}ms -> ${JSON.stringify(d.j && { ok: d.j.ok, n: d.j.n, codes: d.j.codes, refreshed: d.j.refreshed })}`);
})();
