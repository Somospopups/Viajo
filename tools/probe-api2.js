/* Sonda 3: ¿existen horarios para el sentido V y sigue viva lineasyrutas (POST)?
   Uso: node tools/probe-api2.js  (4 llamadas) */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = BASE + '/urbano.php?conf=cbaciudad';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = '';

async function req(url, opts = {}) {
  const h = { 'User-Agent': UA, Referer: PAGE, Origin: 'https://micronauta4.dnsalias.net' };
  if (cookie) h.Cookie = cookie;
  if (opts.body) h['Content-Type'] = 'application/x-www-form-urlencoded';
  const r = await fetch(url, { method: opts.method || 'GET', headers: h, body: opts.body });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const t = await r.text();
  return { status: r.status, t };
}

function horarios(tag, q) {
  return `${BASE}/urbano2_cmd.php?${q}&conf=cbaciudad`;
}

(async () => {
  const s = await req(PAGE);
  console.log('sesion:', s.status, 'cookie=', cookie ? 'si' : 'NO');
  await sleep(300);

  // lineasyrutas por POST (como lo hace harvest.js)
  const ly = await req(`${BASE}/urbano2_cmd.php?cmd=lineasyrutas`, { method: 'POST', body: 'conf=cbaciudad' });
  let n = -1;
  try { n = JSON.parse(ly.t).lineas.length; } catch (e) { n = 'invalido(' + ly.t.slice(0, 60) + ')'; }
  console.log('lineasyrutas POST -> HTTP', ly.status, '· lineas =', n);
  await sleep(400);

  // ruta de sentido V: 10_411_4 (linea 10, cliente 411, ruta 4)
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8').replace(/^window\.DATA=/, '').replace(/;\s*$/, ''));
  const stopsV = D.R['10_411_4'] || [];
  const stopsI = D.R['10_411_1'] || [];
  const codeV = stopsV.length ? D.P[stopsV[Math.floor(stopsV.length / 2)]].k : null;
  const codeI = stopsI.length ? D.P[stopsI[Math.floor(stopsI.length / 2)]].k : null;
  console.log('ruta V tiene', stopsV.length, 'paradas · muestra:', codeV, '· ruta I muestra:', codeI);

  for (const [tag, q] of [
    ['V + sentido=V', `cmd=ver_horarios&linea=10&codigo=${codeV}&cliente=411&sentido=V`],
    ['V + sentido=I', `cmd=ver_horarios&linea=10&codigo=${codeV}&cliente=411&sentido=I`],
    ['I + sentido=I', `cmd=ver_horarios&linea=10&codigo=${codeI}&cliente=411&sentido=I`],
  ]) {
    const r = await req(horarios(tag, q));
    let info;
    try {
      const j = JSON.parse(r.t);
      const dias = Object.keys(j).filter((k) => Array.isArray(j[k]) && j[k].length);
      info = dias.length ? `dias=${dias.join('/')} lu=${(j.lu || []).length} sa=${(j.sa || []).length} do=${(j.do || []).length}` : 'VACIO (0 días con datos)';
    } catch (e) { info = 'no-JSON: ' + r.t.slice(0, 60); }
    console.log(' ', tag.padEnd(15), '->', info);
    await sleep(400);
  }
})();
