/* Sonda: ¿sigue viva la API de TU BONDI y qué devuelve ver_horarios?
   Uso: node tools/probe-api.js  (2 llamadas, nada de tráfico) */
'use strict';
const BASE = 'https://micronauta4.dnsalias.net/usuario';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const REF = BASE + '/urbano.php?conf=cbaciudad';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cookie = '';

async function req(url) {
  const h = { 'User-Agent': UA, Referer: REF, Origin: 'https://micronauta4.dnsalias.net' };
  if (cookie) h.Cookie = cookie;
  const r = await fetch(url, { headers: h });
  const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
  const t = await r.text();
  return { status: r.status, len: t.length, text: t };
}

(async () => {
  const s = await req(`${BASE}/urbano.php?conf=cbaciudad`);
  console.log('sesion:', s.status, s.len, 'bytes · cookie=' + (cookie ? 'si' : 'no'));
  await sleep(300);

  const probes = [
    ['sentido I', `${BASE}/urbano2_cmd.php?cmd=ver_horarios&linea=10&codigo=CR19&cliente=411&sentido=I&conf=cbaciudad`],
    ['sentido V', `${BASE}/urbano2_cmd.php?cmd=ver_horarios&linea=10&codigo=CR19&cliente=411&sentido=V&conf=cbaciudad`],
    ['lineasyrutas', `${BASE}/urbano2_cmd.php?cmd=lineasyrutas`],
  ];
  for (const [name, url] of probes) {
    const r = await req(url);
    let info = r.text.slice(0, 160).replace(/\s+/g, ' ');
    if (name !== 'lineasyrutas') {
      try {
        const j = JSON.parse(r.text);
        info = 'dias=' + Object.keys(j).filter((k) => Array.isArray(j[k]) && j[k].length).join('/') +
          ' · lu=' + (j.lu || []).length + ' · sa=' + (j.sa || []).length +
          ' · primeros=' + (j.lu || []).slice(0, 4).join(',');
      } catch (e) { info = 'JSON INVALIDO: ' + info; }
    } else {
      try { info = 'lineas=' + JSON.parse(r.text).lineas.length; } catch (e) {}
    }
    console.log(name.padEnd(12), 'HTTP', r.status, '·', info);
    await sleep(400);
  }
})();
