/* Saca el contexto de llamada de los cmd= interesantes (consultacoche,
   consultacocheporruta, proximos_arribos, hora_actual) en la página y en sus
   JS, para saber qué parámetros aceptan y si alguno devuelve todos los bondis.

   Uso: node tools/probe-cmd2.js */
'use strict';
const UP = 'https://micronauta4.dnsalias.net/usuario';
const PAGE = UP + '/urbano.php?conf=cbaciudad';
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
const limpia = (s) => s.replace(/\s+/g, ' ').trim();

(async () => {
  const r0 = await fetch(PAGE, { headers: { 'User-Agent': UA, Referer: ORIGIN + '/', Origin: ORIGIN } });
  setCookies(r0);
  const html = await r0.text();

  const OBJETIVOS = ['consultacoche', 'consultacocheporruta', 'hora_actual', 'paradas_cercanas', 'calcula_demora_de_linea'];

  console.log('=== contextos en urbano.php (HTML) ===');
  for (const cmd of OBJETIVOS) {
    let i = 0, n = 0;
    while ((i = html.indexOf(cmd, i)) >= 0 && n < 2) {
      console.log('  [' + cmd + '] …' + limpia(html.slice(Math.max(0, i - 260), i + 320)) + '…');
      console.log('');
      i += cmd.length; n++;
    }
    if (!n) console.log('  [' + cmd + '] (no aparece)\n');
  }

  const srcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]);
  for (const s of srcs) {
    const url = s.startsWith('http') ? s : (s.startsWith('/') ? 'https://micronauta4.dnsalias.net' + s : UP + '/' + s);
    try {
      const rr = await fetch(url, { headers: { 'User-Agent': UA, Referer: PAGE, Cookie: cookie }, signal: AbortSignal.timeout(15000) });
      const t = await rr.text();
      let alguno = false;
      for (const cmd of OBJETIVOS) {
        let i = 0, n = 0;
        while ((i = t.indexOf(cmd, i)) >= 0 && n < 2) {
          if (!alguno) { console.log('=== ' + url.split('/').pop() + ' ==='); alguno = true; }
          console.log('  [' + cmd + '] …' + limpia(t.slice(Math.max(0, i - 300), i + 360)) + '…\n');
          i += cmd.length; n++;
        }
        i = 0;
      }
    } catch (e) { console.log('  falló', url.split('/').pop(), e.message); }
  }
})();
