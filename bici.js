/* ===================== BICICBA · ESTACIONES =====================
   Datos de las estaciones de la bicicleta pública de Córdoba (BiciCba),
   según https://bicicba.com/biciweb/components/menu/estaciones.php
   Snapshot liviano (nombre, dirección, coordenadas, horarios y bicis
   disponibles). biciLive() intenta refrescar los números en vivo. */
window.BICI = {
  upd: '2026-10-03',
  est: [
    { nombre: 'Cruz Roja', cod: 'CRJ', dir: 'Av. Belardinelli esq. Cruz Roja', la: -31.443775, lo: -64.193647, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 9, c: 9, a: 0, i: 0, url: 'https://maps.app.goo.gl/DrknoYy8vS72q2Qe9' },
    { nombre: 'Manantiales', cod: 'EMS', dir: 'Raúl Carlos Brogin 3700', la: -31.454805, lo: -64.236907, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 5, c: 5, a: 0, i: 0, url: 'https://maps.app.goo.gl/Ae7FVwGUmY3hrYzGA' },
    { nombre: 'Parque Sarmiento', cod: 'EPS', dir: 'Deodoro Roca 800', la: -31.430542, lo: -64.177477, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 5, c: 3, a: 1, i: 1, url: 'https://goo.gl/maps/RDB1XFiPhzw41ySDA' },
    { nombre: 'Plaza Alberdi', cod: 'PAB', dir: 'Lima 950', la: -31.413825, lo: -64.170482, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 0, c: 0, a: 0, i: 0, url: 'https://goo.gl/maps/AEVzRxdqxidoRrKD6' },
    { nombre: 'Parque De La Biodiversidad', cod: 'PBD', dir: 'Rondeau 751', la: -31.425263, lo: -64.174608, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 2, c: 1, a: 1, i: 0, url: 'https://goo.gl/maps/ZZGafWvqfKCbNDgx5' },
    { nombre: 'Plaza España', cod: 'PES', dir: 'Larrañaga y Bv. Chacabuco', la: -31.427888, lo: -64.184832, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 7, c: 7, a: 0, i: 0, url: 'https://goo.gl/maps/A4ScYtABtTREqg2v5' },
    { nombre: 'Parque las Heras', cod: 'PLH', dir: 'Av. Ramón Mestre y Puente Antártida', la: -31.406017, lo: -64.187162, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 8, c: 8, a: 0, i: 0, url: 'https://maps.app.goo.gl/t8ydguj8n6RueiXK8' },
    { nombre: 'Parque De Las Tejas', cod: 'PTJ', dir: 'Venezuela y Bv. Chacabuco', la: -31.43358, lo: -64.187383, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 8, c: 8, a: 0, i: 0, url: 'https://goo.gl/maps/P7LJvdQ5387xwpCt8' },
    { nombre: 'Plaza Velez Sarsfield', cod: 'PVS', dir: 'Av. Yrigoyen y Montevideo', la: -31.421298, lo: -64.188382, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 8, c: 8, a: 0, i: 0, url: 'https://goo.gl/maps/CgiWCB3BQtYGCAFy9' },
    { nombre: 'Paseo Sobremonte', cod: 'SBM', dir: 'Caseros 570', la: -31.41605, lo: -64.19232, hs: 'Lunes a Viernes: 07:30 a 21:30 Hs.', hf: 'Sáb, Dom, Feriados: 11:00 a 20:00 Hs.', d: 8, c: 8, a: 0, i: 0, url: 'https://goo.gl/maps/n3EXfVP6BGBSyyXg8' }
  ]
};
function biciColor(d) { return d <= 0 ? '#E23B3B' : (d <= 5 ? '#D97100' : '#12A05A'); }
function biciDisp() {
  return BICI.est.reduce(function (a, e) { return a + (e.d || 0); }, 0);
}
function biciFechas(upd) {
  if (!upd) return '';
  var p = String(upd).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] : upd;
}
/* intenta traer los números en vivo (best effort); si no se puede,
   se mantienen los últimos datos guardados o el snapshot */
function biciLive(cb, force) {
  var cached = store.get('bici', null);
  if (cached && cached.est && cached.est.length) {
    BICI.est = cached.est;
    if (cached.upd) BICI.upd = cached.upd;
  }
  var last = store.get('biciUpd', 0);
  if (!force && Date.now() - last < 10 * 60000) { if (cb) cb(true, 'cache'); return; }
  var src = 'https://r.jina.ai/https://bicicba.com/biciweb/components/login/login_cmd2.php?cmd=getEstacion';
  var done = false, t = null;
  function fin(ok, why) {
    if (done) return;
    done = true;
    if (t) clearTimeout(t);
    if (cb) cb(ok, why);
  }
  t = setTimeout(function () { fin(false, 'timeout'); }, 12000);
  try {
    fetch(src).then(function (r) { return r.text(); }).then(function (txt) {
      var i = txt.indexOf('{');
      if (i < 0) throw new Error('sin json');
      var j = JSON.parse(txt.slice(i));
      if (!j.ok || !j.data || !j.data.length) throw new Error('sin datos');
      var est = j.data.map(function (e) {
        return {
          nombre: e.nombre, cod: e.codigo, dir: e.direccion,
          la: parseFloat(e.latitud), lo: parseFloat(e.longitud),
          hs: e.horario_semana, hf: e.horario_finde,
          d: parseInt(e.disponibles, 10) || 0,
          c: parseInt(e.comunesDisponibles, 10) || 0,
          a: parseInt(e.adaptadasDisponibles, 10) || 0,
          i: parseInt(e.infantilesDisponibles, 10) || 0,
          url: e.enlace
        };
      }).filter(function (e) { return e.nombre && isFinite(e.la) && isFinite(e.lo); });
      if (!est.length) throw new Error('vacío');
      BICI.est = est;
      BICI.upd = new Date().toISOString().slice(0, 10);
      store.set('bici', { est: est, upd: BICI.upd });
      store.set('biciUpd', Date.now());
      fin(true, 'vivo');
    }).catch(function () { fin(false, 'error'); });
  } catch (e) { fin(false, 'error'); }
}
