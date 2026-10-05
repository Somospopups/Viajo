/* Sonda 4: ¿existen horarios en las paradas TERMINALES y para el sentido V?
   (las paradas intermedias suelen no tener horarios: por eso la sonda 2 salió vacía).
   Uso: node tools/probe-api3.js  (~8 llamadas) */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = BASE + '/urbano.php?conf=cbaciudad';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = '';

async function req(url) {
  const h = { 'User-Agent': UA, Referer: PAGE, Origin: 'https://micronauta4.dnsalias.net' };
  if (cookie) h.Cookie = cookie;
  const r = await fetch(url, { headers: h });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const t = await r.text();
  return { status: r.status, t };
}

function horarios(linea, codigo, cliente, sentido) {
  return `${BASE}/urbano2_cmd.php?cmd=ver_horarios&linea=${linea}&codigo=${codigo}&cliente=${cliente}&sentido=${sentido}&conf=cbaciudad`;
}

(async () => {
  const s = await req(PAGE);
  console.log('sesion:', s.status, 'cookie=', cookie ? 'si' : 'NO');
  await sleep(300);

  const D = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8').replace(/^window\.DATA=/, '').replace(/;\s*$/, '')
  );

  const pruebas = [];
  for (const key of ['10_411_1', '10_411_4', '11_411_5', '11_411_6']) {
    const stops = D.R[key] || [];
    if (!stops.length) { console.log(key, '-> sin paradas'); continue; }
    const line = D.lineas.find((l) => D.lineas && l.r.some((r) => r.t === key));
    const ruta = line.r.find((r) => r.t === key);
    const posiciones = [
      ['inicio', stops[0]],
      ['fin', stops[stops.length - 1]],
      ['centro', stops[Math.floor(stops.length / 2)]],
    ];
    for (const [donde, idx] of posiciones) {
      const code = D.P[idx].k;
      pruebas.push({ key, donde, code, sentidos: ['I', 'V'], sentidoRuta: ruta.s });
    }
  }

  let llamadas = 0;
  for (const p of pruebas) {
    const [linea, cliente] = p.key.split('_');
    for (const sent of p.sentidos) {
      const r = await req(horarios(linea, p.code, cliente, sent));
      llamadas++;
      let info;
      try {
        const j = JSON.parse(r.t);
        const dias = Object.keys(j).filter((k) => Array.isArray(j[k]) && j[k].length);
        info = dias.length
          ? `SI · dias=${dias.join('/')} lu=${(j.lu || []).length} sa=${(j.sa || []).length} do=${(j.do || []).length}`
          : 'vacio';
      } catch (e) { info = 'no-JSON'; }
      console.log(
        `  ${p.key} [ruta sentido=${p.sentidoRuta}] ${p.donde.padEnd(6)} ${p.code} sentido=${sent} -> ${info}`
      );
      await sleep(300);
    }
  }
  console.log('total llamadas:', llamadas);
})();
