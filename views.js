/* Bondi · vistas, panel de contenido, mapa, búsqueda y viaje */
'use strict';

/* =========================== PANEL DE CONTENIDO =========================== */
var viewStack = ['v-home'];
function setSheet(state) {
  var p = $('#panel');
  if (state) {
    p.classList.add('open');
    document.body.dataset.sheet = state === 'half' ? 'half' : 'full';
  } else {
    p.classList.remove('open');
    document.body.removeAttribute('data-sheet');
  }
}
function openView(id, opt) {
  closeExit();
  if (id === 'v-home') { backToMap(); return; }
  var cur = viewStack[viewStack.length - 1];
  if (cur === id) { renderFor(id); syncHandle(); return; }
  if (viewStack.indexOf(id) >= 0) viewStack = viewStack.slice(0, viewStack.indexOf(id) + 1);
  else viewStack.push(id);
  $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== id); });
  $('#views').scrollTop = 0;
  renderFor(id);
  setSheet('full');
  syncHandle();
}
function backToMap() {
  viewStack = ['v-home'];
  $$('.view').forEach(function (v) { v.classList.add('hidden'); });
  setSheet(null);
  syncHandle();
}
function backView() {
  if (viewStack.length <= 1) { setSheet(null); return; }
  viewStack.pop();
  var id = viewStack[viewStack.length - 1];
  if (id === 'v-home') { backToMap(); return; }
  $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== id); });
  renderFor(id);
  setSheet('full');
  syncHandle();
}
function renderFor(id) {
  if (id === 'v-nearby') renderNearby();
  else if (id === 'v-fav') renderFav();
  else if (id === 'v-search') initSearch();
}
function syncHandle() {
  var bar = $('#panelBar');
  if (bar) bar.classList.toggle('hidden', viewStack.length <= 1);
}

/* =========================== POPUP =========================== */
var curPopup = null;
function showPopup(latlng, html) {
  closeExit();
  hidePopup();
  curPopup = L.popup({ closeButton: false, offset: [0, -4], autoPan: true, maxHeight: 420 })
    .setLatLng(latlng).setContent(html).openOn(map);
}
function hidePopup() { if (curPopup) { map.closePopup(curPopup); curPopup = null; } }

/* =========================== FILAS / ARRIBOS =========================== */
function arrivalRow(l, si, key, arr, dist) {
  var st = D.P[si];
  var cls = etaClass(arr.min);
  return '<div class="row" data-stop="' + si + '">' +
    '<div class="r-b" style="background:' + l.c + '">' + l.n + '</div>' +
    '<div class="r-t"><b>' + (st ? st.n : 'Parada') + '</b><span>Línea ' + l.n + ' · ' + (dist != null ? fmtKm(dist) + ' a pie' : 'en dirección ' + (arr.real ? 'programada' : 'estimada')) + '</span></div>' +
    '<div class="r-m"><span class="eta-pill ' + cls + '">' + fmtMin(arr.min) + '</span><span>' + (arr.real ? 'salida' : 'estimado') + '</span></div>' +
    '<span class="ico chev" data-ico="chevron"></span></div>';
}
function nearestArrivals(limit, maxM) {
  var pos = myPos(), out = [];
  var near = stopsNear(pos.lat, pos.lng, maxM || 1300).slice(0, 10);
  near.forEach(function (n) {
    var routes = stopRoutes[n.i] || [], best = null;
    routes.forEach(function (rr) {
      var l = lineByKey[rr.key];
      if (!l) return;
      var a = nextArrival(rr.key, n.i);
      if (a && a.min <= 90 && (!best || a.min < best.arr.min)) best = { l: l, key: rr.key, arr: a };
    });
    if (best) out.push({ si: n.i, d: n.d, l: best.l, key: best.key, arr: best.arr });
  });
  out.sort(function (a, b) { return a.arr.min - b.arr.min; });
  return out.slice(0, limit || 5);
}

/* =========================== LÍNEAS: TIRA FLOTANTE + RECORRIDO =========================== */
var activeLine = null, activeKey = null, activeRoute = 0, etaSubs = [];
function renderLineStrip() {
  var box = $('#stripScroll');
  if (!box) return;
  box.innerHTML = D.lineas.map(function (l, i) {
    return '<button class="lc' + (activeLine && activeLine.i === l.i ? ' on' : '') + '" type="button" data-strip="' + l.i + '" style="--i:' + Math.min(i, 24) + ';background:' + l.c + '">' +
      l.n + '</button>';
  }).join('');
}
function toggleStrip(on) {
  var s = $('#lineStrip');
  if (!s) return;
  var open = on == null ? s.classList.contains('hidden') : !!on;
  if (open) { renderLineStrip(); s.classList.remove('hidden'); }
  else s.classList.add('hidden');
}
function dirTitleCase(s) {
  return String(s || '').replace(/\S+/g, function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); });
}
/* dos renglones: "De barrio…" y "a barrio…" */
function dirEnds(r) {
  var n = (r && r.n) || '';
  var p = n.split(' A ');
  if (p.length === 2) return ['De ' + dirTitleCase(p[0]), 'a ' + dirTitleCase(p[1])];
  return [n, ''];
}
function renderDirSense() {
  var l = activeLine;
  if (!l) return;
  var r = l.r[activeRoute] || l.r[0];
  if (!r) return;
  var e = dirEnds(r);
  $('#dsT').textContent = r.s === 'V' ? 'Vuelta' : 'Ida';
  $('#dsR1').textContent = e[0];
  $('#dsR2').textContent = e[1];
  $('#dsR2').classList.toggle('hide', !e[1]);
  $('#dsM').textContent = r.k.toFixed(1).replace('.', ',') + ' km · ' + r.p + ' paradas';
  $('#dirSense').setAttribute('data-dir', activeRoute);
  $('#dirGo').setAttribute('data-dir', activeRoute);
}
function openDirModal(lineId) {
  var l = D.lineas.filter(function (x) { return String(x.i) === String(lineId); })[0];
  if (!l) return;
  activeLine = l;
  var saved = store.get('sense_' + l.i, null);
  activeRoute = (saved != null && l.r[saved]) ? saved : 0;
  if (!l.r[activeRoute]) activeRoute = 0;
  $('#dirBadge').textContent = l.n;
  $('#dirBadge').style.background = l.c;
  $('#dirFlip').classList.toggle('hide', l.r.length < 2);
  $('#dirFlip').classList.remove('turn');
  renderDirSense();
  hydrate($('#dirModal'));
  openModal('dirModal');
}
/* gira la tarjetita del sentido y guarda la elección */
function flipSense() {
  var l = activeLine;
  if (!l || l.r.length < 2) return;
  var sense = $('#dirSense');
  if (sense.classList.contains('flip')) return;
  var next = (activeRoute + 1) % l.r.length;
  $('#dirFlip').classList.toggle('turn');
  sense.classList.add('flip');
  setTimeout(function () {
    activeRoute = next;
    store.set('sense_' + l.i, activeRoute);
    renderDirSense();
  }, 230);
  setTimeout(function () { sense.classList.remove('flip'); }, 540);
}
function chooseRoute(idx) {
  var l = activeLine;
  if (!l) return;
  if (idx != null && l.r[idx]) activeRoute = idx;
  closeModal('dirModal');
  toggleStrip(false);
  var r = l.r[activeRoute] || l.r[0];
  activeRoute = l.r.indexOf(r) < 0 ? 0 : l.r.indexOf(r);
  store.set('sense_' + l.i, activeRoute);
  activeKey = r.t;
  showLineCard();
  drawRoute(r.t);
}
function showLineCard() {
  $('#lineCard').classList.remove('hidden');
  renderLineCard();
}
function closeLineCard() {
  $('#lineCard').classList.add('hidden');
  clearRoute();
}
/* cierra la tarjeta pero deja el recorrido marcado en el mapa */
function hideLineCard() {
  $('#lineCard').classList.add('hidden');
}
function renderLineCard() {
  var l = activeLine;
  if (!l || $('#lineCard').classList.contains('hidden')) return;
  var r = l.r[activeRoute] || l.r[0];
  $('#lcBadge').textContent = l.n;
  $('#lcBadge').style.background = l.c;
  $('#lcName').textContent = 'Línea ' + l.n;
  $('#lcDir').textContent = (r.s === 'V' ? 'Vuelta' : 'Ida') + ' · ' + r.n;
  $('#lcFav').classList.toggle('on', store.get('favLines', []).indexOf(l.i) >= 0);
  refreshCardEta();
  syncWatchUI();
}
function refreshCardEta() {
  var card = $('#lineCard');
  if (!card || card.classList.contains('hidden') || !activeLine) return;
  var r = activeLine.r[activeRoute] || activeLine.r[0];
  var si = nearestStopOnRoute(r.t);
  var s = si != null ? D.P[si] : null;
  var a = si != null ? nextArrival(r.t, si) : null;
  var pill = $('#lcEtaPill');
  pill.className = 'eta-pill ' + (a ? etaClass(a.min) : 'eta-r');
  pill.textContent = a ? fmtMin(a.min) : '—';
  var txt = $('#lcEtaTxt');
  if (!s) { txt.textContent = 'Sin paradas en este recorrido'; return; }
  var pos = myPos(), d = distM([pos.lat, pos.lng], [s.la, s.lo]);
  txt.textContent = 'Tu parada más cercana: ' + s.n + ' · ' + fmtKm(d) + ' · caminás ' + fmtMin(walkMinTo(s.la, s.lo)) +
    (a ? ' · llega en ' + fmtMin(a.min) : '');
}
function nearestStopOnRoute(key) {
  var stops = D.R[key] || [], pos = myPos(), best = null;
  stops.forEach(function (si) {
    var s = D.P[si];
    if (!s) return;
    var d = distM([pos.lat, pos.lng], [s.la, s.lo]);
    if (!best || d < best.d) best = { si: si, d: d };
  });
  return best ? best.si : null;
}
function openLine(id) {
  var l = D.lineas.filter(function (x) { return x.i === id; })[0];
  if (!l) return;
  activeLine = l;
  activeRoute = 0;
  openView('v-line');
  renderLineDetail();
}
function renderLineDetail() {
  var l = activeLine;
  if (!l) return;
  var r = l.r[activeRoute] || l.r[0];
  activeKey = r.t;
  $('#lhBadge').textContent = l.n;
  $('#lhBadge').style.background = l.c;
  $('#lhName').textContent = 'Línea ' + l.n;
  $('#lhRoute').textContent = r.n.charAt(0) + r.n.slice(1).toLowerCase();
  $('#lhSeg').innerHTML = l.r.map(function (rr, i) {
    return '<button type="button" data-seg="' + i + '" class="' + (i === activeRoute ? 'on' : '') + '">' +
      (rr.s === 'V' ? 'Vuelta' : 'Ida') + ' · ' + rr.k.toFixed(1).replace('.', ',') + ' km</button>';
  }).join('');
  var live = liveCountForLine(l);
  $('#lhStats').innerHTML =
    '<div class="stat"><b>' + r.p + '</b><span>paradas</span></div>' +
    '<div class="stat"><b>' + r.k.toFixed(1).replace('.', ',') + '</b><span>kilómetros</span></div>' +
    '<div class="stat live"><b>' + (live || '—') + '</b><span>' + (live ? 'bondis en vivo' : 'sin señal') + '</span></div>';
  var fav = store.get('favLines', []).indexOf(l.i) >= 0;
  $('#lhFav').classList.toggle('on', fav);
  $('#lhHint').textContent = live ? 'tiempo real' : 'horario estimado';
  drawRoute(r.t);
  renderLineStops();
  hydrate($('#v-line'));
}
function renderLineStops() {
  var r = activeLine.r[activeRoute];
  var stops = D.R[r.t] || [];
  fetchStopArribos(stopCodesForRoute(r.t));
  etaSubs = [];
  $('#lhStops').innerHTML = stops.map(function (si, idx) {
    var s = D.P[si];
    if (!s) return '';
    var arr = nextArrival(r.t, si);
    etaSubs.push({ key: r.t, si: si });
    var cls = arr ? etaClass(arr.min) : 'eta-r';
    return '<div class="stop-row" data-stop="' + si + '" style="--c:' + activeLine.c + '">' +
      '<div class="stop-n">' + (idx + 1) + '</div>' +
      '<div class="stop-t"><b>' + s.n + '</b><span>' + fmtKm(distM([s.la, s.lo], [myPos().lat, myPos().lng])) + ' de vos</span></div>' +
      '<span class="eta-pill ' + cls + '" data-eta="' + r.t + '|' + si + '">' + (arr ? fmtMin(arr.min) : '—') + '</span></div>';
  }).join('');
}
function refreshBusDemoras() {
  buses.forEach(function (b) {
    if (b.key !== activeKey && b.dem) b.dem = '';
  });
  if (activeKey) {
    var stops = D.R[activeKey] || [], sd = stopDist[activeKey] || {};
    busesOn(activeKey).forEach(function (b) {
      var best = null;
      stops.forEach(function (si) {
        var d = sd[si];
        if (d == null) return;
        var wait = b.dist <= d ? b.len - b.dist + d : d - b.dist;
        var min = wait / b.speed / 60;
        if (best == null || min < best) best = min;
      });
      b.dem = best != null && best < 45 ? String(Math.max(1, Math.round(best))) : '';
    });
  }
  etaSubs.forEach(function (sub) {
    var el = $('[data-eta="' + sub.key + '|' + sub.si + '"]');
    if (!el) return;
    var a = nextArrival(sub.key, sub.si);
    el.textContent = a ? fmtMin(a.min) : '—';
    el.className = 'eta-pill ' + (a ? etaClass(a.min) : 'eta-r');
  });
}
function drawRoute(key) {
  clearRoute();
  var t = D.traza[key];
  if (!t) return;
  busRoute = key;
  activeKey = key;
  fetchStopArribos(stopCodesForRoute(key));
  fetchLiveRoute(key, true);
  syncBusLayer();
  var meta = routeMeta[key], col = meta ? meta.l.c : '#33CCFF';
  var latlngs = t.map(function (p) { return [p[1], p[0]]; });
  L.polyline(latlngs, { color: '#fff', weight: 9, opacity: 0.9, lineJoin: 'round', lineCap: 'round' }).addTo(layerRoute);
  L.polyline(latlngs, { color: col, weight: 5.5, opacity: 1, lineJoin: 'round', lineCap: 'round' }).addTo(layerRoute);
  drawStopsFor(key);
  map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
}
function drawStopsFor(key) {
  var stops = D.R[key] || [];
  var col = routeMeta[key] ? routeMeta[key].l.c : '#33CCFF';
  stops.forEach(function (si, idx) {
    var s = D.P[si];
    if (!s) return;
    var m = L.marker([s.la, s.lo], {
      icon: L.divIcon({
        className: 'mk-stopwrap',
        html: '<div class="mk-stop" style="--c:' + col + '"><span class="ord">' + (idx + 1) + '</span></div>',
        iconSize: [20, 20], iconAnchor: [10, 10]
      }),
      zIndexOffset: 300
    }).addTo(layerStops);
    m.on('click', function (e) {
      L.DomEvent.stopPropagation(e);
      openStopPopup(si, e.latlng, key);
    });
  });
}
function clearRoute() {
  layerRoute.clearLayers(); layerStops.clearLayers(); layerWalk.clearLayers(); layerFlags.clearLayers();
  activeKey = null; etaSubs = []; busRoute = null; syncBusLayer();
}
var lastPopup = null;
function stopPopupHtml(si, latlng, key) {
  var s = D.P[si];
  var routes = (stopRoutes[si] || []).slice(0, 4);
  var rows = routes.map(function (rr) {
    var l = lineByKey[rr.key];
    var a = nextArrival(rr.key, si);
    return '<div class="row" style="border:0;background:none;padding:5px 2px;cursor:default">' +
      '<div class="r-b" style="background:' + l.c + '">' + l.n + '</div>' +
      '<div class="r-t"><b>' + (routeMeta[rr.key] ? routeMeta[rr.key].r.n : '') + '</b>' +
      (a && a.live ? '<span class="p-live">en vivo</span>' : '') + '</div>' +
      '<span class="eta-pill ' + (a ? etaClass(a.min) : 'eta-r') + '">' + (a ? fmtMin(a.min) : '—') + '</span></div>';
  }).join('');
  return '<div class="wz-pop"><div class="p-top"><span class="p-badge" style="background:' + (key && routeMeta[key] ? routeMeta[key].l.c : '#0FA6D8') + '">' + icoSvg('stop') + '</span>' +
    '<div class="p-t"><b>' + s.n + '</b><span>Código ' + s.k + ' · ' + fmtMin(walkMinTo(s.la, s.lo)) + ' caminando</span></div>' +
    '<button class="p-close" data-pop="1">' + icoSvg('close') + '</button></div>' +
    '<div class="p-arr">' + rows + '</div>' +
    '<div class="p-foot"><button data-stop="' + si + '">Ver parada</button><button class="ghost" data-navto="' + si + '">Ir allá</button></div></div>';
}
function openStopPopup(si, latlng, key) {
  var s = D.P[si];
  lastPopup = { si: si, latlng: latlng, key: key };
  fetchStopArribos([s.k]);
  showPopup(latlng || [s.la, s.lo], stopPopupHtml(si, latlng, key));
  if (curPopup) curPopup._stop = si;
}
/* re-dibuja el popup cuando llegan arribos reales de esa parada */
function refreshStopPopup() {
  if (!curPopup || !lastPopup || curPopup._stop !== lastPopup.si) return;
  curPopup.setContent(stopPopupHtml(lastPopup.si, lastPopup.latlng, lastPopup.key));
  var el = curPopup.getElement && curPopup.getElement();
  if (el) hydrate(el);
}

/* =========================== PARADA / CERCA MÍO =========================== */
var currentStop = null;
function openStopView(si) {
  currentStop = si;
  var s = D.P[si];
  fetchStopArribos([s.k]);
  openView('v-stop');
  $('#stopName').textContent = s.n;
  var d = distM([s.la, s.lo], [myPos().lat, myPos().lng]);
  $('#stopMeta').textContent = 'Código ' + s.k + ' · ' + fmtKm(d) + ' de vos · caminás ' + fmtMin(walkMinTo(s.la, s.lo));
  syncWatchUI();
  renderStopArrivals();
}
function renderStopArrivals() {
  var si = currentStop;
  if (si == null) return;
  var routes = stopRoutes[si] || [];
  etaSubs = [];
  var items = routes.map(function (rr) {
    var l = lineByKey[rr.key];
    var a = nextArrival(rr.key, si);
    return { l: l, key: rr.key, a: a };
  }).filter(function (x) { return x.l; });
  items.sort(function (x, y) { return (x.a ? x.a.min : 999) - (y.a ? y.a.min : 999); });
  $('#stopArrivals').innerHTML = items.length ? items.map(function (x) {
    etaSubs.push({ key: x.key, si: si });
    return '<div class="stop-row" data-line="' + x.l.i + '" style="--c:' + x.l.c + '">' +
      '<div class="stop-n" style="border-color:' + x.l.c + '">' + x.l.n + '</div>' +
      '<div class="stop-t"><b>' + (routeMeta[x.key] ? routeMeta[x.key].r.n : 'Línea ' + x.l.n) + '</b>' +
      '<span>' + (x.a ? (x.a.live ? 'en vivo' : (x.a.real ? 'próxima salida' : 'estimado sin señal')) : 'fuera de servicio') + '</span></div>' +
      '<span class="eta-pill ' + (x.a ? etaClass(x.a.min) : 'eta-r') + '" data-eta="' + x.key + '|' + si + '">' + (x.a ? fmtMin(x.a.min) : '—') + '</span></div>';
  }).join('') : emptyHtml('bus', 'Sin datos de esta parada', 'No hay líneas asociadas');
  hydrate($('#v-stop'));
}
function renderNearby() {
  var pos = myPos();
  var near = stopsNear(pos.lat, pos.lng, 1500).slice(0, 14);
  fetchStopArribos(near.slice(0, 8).map(function (n) { return D.P[n.i].k; }));
  $('#nearbySub').textContent = near.length ? near.length + ' paradas en un radio de 1,5 km' : 'Buscando paradas cerca tuyo';
  $('#nearbyList').innerHTML = near.length ? near.map(function (n) {
    var s = D.P[n.i];
    var routes = stopRoutes[n.i] || [];
    var best = null;
    routes.forEach(function (rr) {
      var l = lineByKey[rr.key];
      if (!l) return;
      var a = nextArrival(rr.key, n.i);
      if (a && (!best || a.min < best.min)) best = { min: a.min };
    });
    var lines = routes.slice(0, 4).map(function (rr) {
      var l = lineByKey[rr.key];
      return l ? '<span class="res-badge" style="background:' + l.c + ';height:20px;font-size:11px;padding:0 7px">' + l.n + '</span>' : '';
    }).join('');
    return '<div class="row" data-stop="' + n.i + '">' +
      '<div class="r-ico">' + icoSvg('stop') + '</div>' +
      '<div class="r-t"><b>' + s.n + '</b><span>' + fmtKm(n.d) + ' · ' + (best ? 'próximo ' + fmtMin(best.min) : 'sin ETA') + '</span>' +
      '<span style="display:flex;gap:5px;margin-top:5px">' + lines + '</span></div>' +
      '<span class="ico chev" data-ico="chevron"></span></div>';
  }).join('') : emptyHtml('pin', 'Sin paradas cerca', 'Movete un poco o revisá el mapa');
  hydrate($('#v-nearby'));
}

/* =========================== FAVORITOS =========================== */
function renderFav() {
  var casa = store.get('place_casa', null), trab = store.get('place_trabajo', null);
  $('#spotCasaTxt').textContent = casa ? casa.n : 'Tocá para elegir';
  $('#spotTrabajoTxt').textContent = trab ? trab.n : 'Tocá para elegir';
  var favs = store.get('favLines', []);
  $('#favLines').innerHTML = favs.length ? favs.map(function (id) {
    var l = D.lineas.filter(function (x) { return x.i === id; })[0];
    if (!l) return '';
    return '<div class="row" data-line="' + l.i + '"><div class="r-b" style="background:' + l.c + '">' + l.n + '</div>' +
      '<div class="r-t"><b>' + l.r[0].n + '</b><span>Cliente ' + l.e + '</span></div>' +
      '<span class="ico chev" data-ico="chevron"></span></div>';
  }).join('') : emptyHtml('star', 'Aún no seguís líneas', 'Entrá a una línea y tocá la estrella');
  var places = store.get('favPlaces', []);
  $('#favPlaces').innerHTML = places.length ? places.map(function (p) {
    return '<div class="row" data-goto="' + p.n + '|' + p.la + '|' + p.lo + '">' +
      '<div class="r-ico">' + icoSvg('pin') + '</div><div class="r-t"><b>' + p.n + '</b><span>Destino guardado</span></div>' +
      '<span class="ico chev" data-ico="chevron"></span></div>';
  }).join('') : emptyHtml('pin', 'Sin destinos guardados', 'Buscá un destino y guardalo');
  hydrate($('#v-fav'));
}

/* =========================== BÚSQUEDA A → B =========================== */
var PLACES = [
  { n: 'Plaza San Martín (centro)', la: -31.4203, lo: -64.1886 },
  { n: 'Terminal de Ómnibus', la: -31.4155, lo: -64.1875 },
  { n: 'Universidad Nacional (UNC)', la: -31.4418, lo: -64.1905 },
  { n: 'Observatorio Astronómico', la: -31.4453, lo: -64.1747 },
  { n: 'Teatro Libertador', la: -31.4170, lo: -64.1860 },
  { n: 'Patio Olmos', la: -31.4198, lo: -64.1947 },
  { n: 'Plaza de las Américas', la: -31.4247, lo: -64.1776 },
  { n: 'Av. Pueyrredón', la: -31.4267, lo: -64.2104 },
  { n: 'Estadio Mario Kempes', la: -31.4416, lo: -64.2260 },
  { n: 'Parque Sarmiento', la: -31.4346, lo: -64.1877 },
  { n: 'Mercado del Patio', la: -31.4248, lo: -64.1957 },
  { n: 'Hospital Español', la: -31.4247, lo: -64.1990 }
];
var pts = { a: null, b: null };
function initSearch() {
  if (!pts.a) $('#inpA').value = 'Mi ubicación';
  $('#searchResults').classList.add('hidden');
  $('#searchList').classList.remove('hidden');
  $('#searchListTitle').classList.remove('hidden');
  $('#quickPlaces').classList.remove('hidden');
  setGeoStatus('');
  renderSearchList();
}
function renderSearchList() {
  var recents = store.get('recents', []);
  var html = '';
  var casa = store.get('place_casa', null), trab = store.get('place_trabajo', null);
  if (casa) html += searchRow(casa, 'Casa', 'home');
  if (trab) html += searchRow(trab, 'Trabajo', 'work');
  html += recents.slice(0, 5).map(function (r) { return searchRow(r, r.n, 'clock'); }).join('');
  $('#searchListTitle').innerHTML = '<h4>' + (recents.length || casa ? 'Recientes' : 'Destinos sugeridos') + '</h4>';
  if (!html) html = PLACES.slice(0, 5).map(function (p) { return searchRow(p, p.n, 'pin'); }).join('');
  $('#searchList').innerHTML = html;
  $('#searchList').classList.remove('hidden');
  hydrate($('#v-search'));
}
function searchRow(p, label, ico, sub) {
  var name = String(p.n == null ? '' : p.n).replace(/\|/g, '/');
  return '<div class="row" data-pick="' + encodeURIComponent(name) + '|' + p.la + '|' + p.lo + '">' +
    '<div class="r-ico">' + icoSvg(ico) + '</div>' +
    '<div class="r-t"><b>' + esc(label || name) + '</b><span>' + esc(sub || name) + '</span></div>' +
    '<span class="ico chev" data-ico="chevron"></span></div>';
}
function localSearch(q) {
  q = q.toLowerCase();
  var out = PLACES.filter(function (p) { return p.n.toLowerCase().indexOf(q) >= 0; });
  if (out.length) return out;
  var seen = {};
  for (var i = 0; i < D.P.length && out.length < 8; i++) {
    var s = D.P[i];
    if (s.n.toLowerCase().indexOf(q) < 0 || seen[s.n]) continue;
    seen[s.n] = 1;
    out.push({ n: s.n, la: s.la, lo: s.lo, stop: i });
  }
  return out;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
/* Córdoba capital + alrededores: oeste, sur, este, norte */
var GEO_BOX = [-64.32, -31.53, -64.05, -31.31];
function inCordoba(la, lo) {
  return isFinite(la) && isFinite(lo) && la >= GEO_BOX[1] && la <= GEO_BOX[3] && lo >= GEO_BOX[0] && lo <= GEO_BOX[2];
}
var geoAbort = null, geoLast = 0;
function geoWait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function geoFetch(url) {
  if (geoAbort) { try { geoAbort.abort(); } catch (e) { /* ya cerrado */ } }
  geoAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
  var ctl = geoAbort;
  return geoWait(Math.max(0, 750 - (Date.now() - geoLast))).then(function () {
    geoLast = Date.now();
    var opt = { headers: { Accept: 'application/json' } };
    if (ctl) opt.signal = ctl.signal;
    return fetch(url, opt);
  });
}
function nomUrl(q, bounded) {
  return 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=1&countrycodes=ar&accept-language=es&viewbox=' +
    GEO_BOX.join(',') + (bounded ? '&bounded=1' : '') + '&q=' + encodeURIComponent(q);
}
function photonUrl(q) {
  return 'https://photon.komoot.io/api/?limit=6&lat=-31.42&lon=-64.19&q=' + encodeURIComponent(q);
}
function nomPick(arr) {
  return (arr || []).map(function (a) {
    var ad = a.address || {};
    var road = ad.road || ad.pedestrian || ad.neighbourhood || ad.suburb || a.name || '';
    var num = ad.house_number ? ' ' + ad.house_number : '';
    var head = road ? (road + num) : (a.name || String(a.display_name || '').split(',')[0]);
    var town = ad.city || ad.town || ad.village || ad.municipality || '';
    var ctx = [ad.suburb && ad.suburb !== head ? ad.suburb : '', town].filter(Boolean).join(' · ');
    return {
      n: (head || a.display_name || 'Dirección').replace(/\|/g, '/'),
      sub: (ctx || a.display_name || '').replace(/\|/g, '/'),
      la: parseFloat(a.lat), lo: parseFloat(a.lon),
      far: !inCordoba(parseFloat(a.lat), parseFloat(a.lon))
    };
  }).filter(function (p) { return isFinite(p.la) && isFinite(p.lo); });
}
function photonPick(feats) {
  return (feats || []).filter(function (f) { return f && f.geometry && f.geometry.coordinates; }).map(function (f) {
    var p = f.properties || {};
    var road = p.street || p.name || p.locality || '';
    var num = p.housenumber ? ' ' + p.housenumber : '';
    var town = [p.city || p.district || p.county, p.state].filter(Boolean).join(' · ');
    var la = f.geometry.coordinates[1], lo = f.geometry.coordinates[0];
    return {
      n: ((road + num).trim() || p.name || 'Lugar').replace(/\|/g, '/'),
      sub: (town || p.country || '').replace(/\|/g, '/'),
      la: la, lo: lo, far: !inCordoba(la, lo)
    };
  }).filter(function (p) { return isFinite(p.la) && isFinite(p.lo); });
}
function keepCordoba(list) {
  var near = list.filter(function (p) { return !p.far; });
  return near.length ? near : list;
}
function geocodeEx(q) {
  q = (q || '').trim();
  if (q.length < 2) return Promise.resolve({ list: [], err: false });
  var failed = false;
  function pj(r) {
    if (!r || !r.ok) { failed = true; throw new Error('http ' + (r && r.status)); }
    return r.json();
  }
  function nom(bounded) {
    return geoFetch(nomUrl(q, bounded)).then(pj).then(nomPick)
      .catch(function (e) { if (e && e.name === 'AbortError') throw e; failed = true; return null; });
  }
  function photon() {
    return geoFetch(photonUrl(q)).then(pj).then(function (j) { return photonPick(j && j.features); })
      .catch(function (e) { if (e && e.name === 'AbortError') throw e; failed = true; return []; });
  }
  return nom(true).then(function (out) {
    if (out && out.length) return out;
    return nom(false);
  }).then(function (out) {
    if (out && out.length) return out;
    return photon();
  }).then(function (list) {
    return { list: keepCordoba(list || []), err: failed && !(list && list.length) };
  });
}
function geocode(q) {
  return geocodeEx(q).then(function (r) { return r.list; });
}
function renderResults(list) {
  var box = $('#searchResults');
  if (!list.length) {
    box.classList.remove('hidden');
    box.innerHTML = emptyHtml('warn', 'Sin recorridos', 'No encontramos combinaciones. Probá con otro punto o ampliá la búsqueda.');
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = list.map(function (o, i) {
    var badges = o.legs.map(function (lg) {
      var l = lineByKey[lg.key];
      return '<span class="res-badge" style="background:' + l.c + '">' + l.n + '</span>';
    }).join('') + '<span class="res-badge walk">' + icoSvg('walk') + fmtKm(o.walkM) + '</span>';
    return '<div class="res-card' + (i === 0 ? ' best' : '') + '" data-opt="' + i + '">' +
      '<div class="res-top"><span class="rtime">' + fmtMin(o.total) + '</span>' +
      '<span class="rclock">llegás ' + minsToClock(new Date(), o.total) + '</span>' +
      (i === 0 ? '<span class="rbest">MÁS RÁPIDA</span>' : '') + '</div>' +
      '<div class="res-badges">' + badges + '</div>' +
      '<div class="res-meta"><i>' + icoSvg('walk') + fmtMin(o.walkT) + ' caminando</i>' +
      '<i>' + icoSvg('bus') + (o.transfers ? o.transfers + ' combinación' + (o.transfers > 1 ? 'es' : '') : 'directo') + '</i>' +
      '<i>' + icoSvg('pin') + fmtKm(o.totalM) + '</i></div></div>';
  }).join('');
  hydrate(box);
}
var planOptions = [];
function doSearch() {
  var qB = ($('#inpB').value || '').trim();
  if (!qB && !pts.b) {
    $('#inpB').focus();
    toast('Falta el destino', 'Decinos a dónde querés ir', 'pin', 'var(--amber)');
    return;
  }
  loader('Calculando recorridos…', true);
  var p = myPos();
  var pA = pts.a || { n: 'Mi ubicación', la: p.lat, lo: p.lng };
  var pinned = pts.b && (!qB || qB === pts.b.n);
  (pinned ? Promise.resolve(pts.b) : resolveQuery(qB)).then(function (pB) {
    if (!pB) {
      loader('', false);
      toast('Destino no encontrado', 'Probá con otro nombre o tocá el mapa', 'warn', 'var(--red)');
      return;
    }
    pts.b = pB;
    remember(pB);
    setDestPin(pB);
    setTimeout(function () {
      planOptions = planTrip(pA.la, pA.lo, pB.la, pB.lo);
      loader('', false);
      renderResults(planOptions);
      $('#searchListTitle').classList.add('hidden');
      $('#searchList').classList.add('hidden');
      $('#quickPlaces').classList.add('hidden');
      map.fitBounds(L.latLngBounds([[pA.la, pA.lo], [pB.la, pB.lo]]), { padding: [46, 46] });
      if (planOptions.length) toast('Listo', planOptions.length + ' opción(es) encontradas', 'check', 'var(--green)');
    }, 120);
  });
}
function resolveQuery(q) {
  var found = PLACES.concat(store.get('recents', [])).filter(function (p) { return p.n.toLowerCase() === q.toLowerCase(); })[0];
  if (found) return Promise.resolve(found);
  var local = localSearch(q);
  var localOk = !!local.length && local[0].n.toLowerCase().indexOf(q.toLowerCase()) >= 0;
  /* una dirección con número casi siempre es mejor del geocoder que una parada parecida */
  var preferGeo = /\d/.test(q) || !localOk;
  return geocode(q).then(function (g) {
    if (preferGeo && g.length) return g[0];
    if (localOk) return local[0];
    return g[0] || local[0] || null;
  });
}
function remember(p) {
  var recents = store.get('recents', []).filter(function (r) { return r.n !== p.n; });
  recents.unshift({ n: p.n, la: p.la, lo: p.lo });
  store.set('recents', recents.slice(0, 8));
}
/* Espera real, en minutos, para subirte a `key` en la parada `stopIdx`.
   Orden: datos en vivo de la parada → bus en movimiento sobre la traza →
   horario de programa (D.H) → estimación estable por línea.
   `cache` evita recomputar dentro de planTrip, que evalúa miles de combinaciones. */
function waitMinutes(key, stopIdx, cache) {
  var ck = key + '>' + stopIdx;
  if (cache && cache[ck] != null) return cache[ck];
  var a = nextArrival(key, stopIdx);
  var w = a && a.min != null ? Math.round(a.min) : 3 + (hash(key + stopIdx) % 4);
  if (w < 0) w = 0;
  if (w > 60) w = 60;
  if (cache) cache[ck] = w;
  return w;
}
function planTrip(aLat, aLon, bLat, bLon) {
  var W = 4.6 / 3.6, B = 17.5 / 3.6;
  function walkT(m) { return (m * 1.28) / W / 60; }
  function busT(m) { return m / B / 60; }
  var wCache = {};
  var from = stopsNear(aLat, aLon, 850).slice(0, 7);
  var to = stopsNear(bLat, bLon, 850).slice(0, 7);
  var out = [];
  function mk(o) {
    var walkM = o.walkM != null ? o.walkM : 0;
    o.walkT = walkT(walkM);
    o.total = o.walkT + (o.extra || 0) + o.legs.reduce(function (s, l) { return s + busT(l.dist); }, 0);
    o.totalM = o.legs.reduce(function (s, l) { return s + l.dist; }, 0) + walkM;
    if (o.total > 160 || !o.legs.length) return;
    out.push(o);
  }
  /* directas */
  from.forEach(function (fa) {
    (stopRoutes[fa.i] || []).forEach(function (ra) {
      var da = stopDist[ra.key] && stopDist[ra.key][fa.i];
      if (da == null) return;
      to.forEach(function (fb) {
        if (fa.i === fb.i && fa.d < 60 && fb.d < 60) return;
        var db = stopDist[ra.key] && stopDist[ra.key][fb.i];
        if (db == null || db - da < 150) return;
        var walkM = distM([aLat, aLon], [D.P[fa.i].la, D.P[fa.i].lo]) + distM([D.P[fb.i].la, D.P[fb.i].lo], [bLat, bLon]);
        var wait = waitMinutes(ra.key, fa.i, wCache);
        mk({
          legs: [{ key: ra.key, from: fa.i, to: fb.i, dist: db - da }],
          walkM: walkM, extra: wait, transfers: 0,
          aStop: fa.i, bStop: fb.i
        });
      });
    });
  });
  /* combinadas: 1 trasbordo */
  from.forEach(function (fa) {
    (stopRoutes[fa.i] || []).slice(0, 5).forEach(function (ra) {
      var da = stopDist[ra.key] && stopDist[ra.key][fa.i];
      if (da == null) return;
      var stopsL1 = D.R[ra.key] || [];
      for (var x = 0; x < stopsL1.length; x += 1) {
        var mid = stopsL1[x];
        if (mid === fa.i) continue;
        var dMid = stopDist[ra.key][mid];
        if (dMid == null || dMid - da < 200) continue;
        var others = (stopRoutes[mid] || []);
        for (var y = 0; y < others.length; y++) {
          var rb = others[y];
          if (rb.key === ra.key) continue;
          var db0 = stopDist[rb.key] && stopDist[rb.key][mid];
          if (db0 == null) continue;
          for (var z = 0; z < to.length; z++) {
            var fb = to[z];
            var db = stopDist[rb.key] && stopDist[rb.key][fb.i];
            if (db == null || db - db0 < 150) continue;
            var walkM = distM([aLat, aLon], [D.P[fa.i].la, D.P[fa.i].lo]) + distM([D.P[fb.i].la, D.P[fb.i].lo], [bLat, bLon]);
            var wait = waitMinutes(ra.key, fa.i, wCache);
            var wait2 = waitMinutes(rb.key, mid, wCache);
            mk({
              legs: [
                { key: ra.key, from: fa.i, to: mid, dist: dMid - da },
                { key: rb.key, from: mid, to: fb.i, dist: db - db0 }
              ],
              walkM: walkM, extra: wait + 4 + wait2, transfers: 1,
              aStop: fa.i, bStop: fb.i, mid: mid
            });
          }
        }
      }
    });
  });
  out.sort(function (a, b) { return a.total - b.total; });
  var seen = {}, uniq = [];
  out.forEach(function (o) {
    var k = o.legs.map(function (l) { return l.key + '>' + l.to; }).join('|');
    if (seen[k]) return;
    seen[k] = 1;
    uniq.push(o);
  });
  return uniq.slice(0, 6);
}

/* =========================== VIAJE =========================== */
var tripOpt = null;
function startTrip(o) {
  tripOpt = o;
  document.body.classList.add('navigating');
  busRoute = null; syncBusLayer();
  $('#lineCard').classList.add('hidden');
  toggleStrip(false);
  setDestPin(null);
  layerRoute.clearLayers(); layerStops.clearLayers();
  layerWalk.clearLayers(); layerFlags.clearLayers();
  var latlngs = [];
  o.legs.forEach(function (lg) {
    var t = D.traza[lg.key];
    if (!t) return;
    var col = routeMeta[lg.key] ? routeMeta[lg.key].l.c : '#33CCFF';
    var fromD = stopDist[lg.key][lg.from], toD = stopDist[lg.key][lg.to];
    var ptsR = [];
    for (var i = 0; i < t.length; i++) {
      if (cumDist[lg.key][i] >= fromD && cumDist[lg.key][i] <= toD) ptsR.push([t[i][1], t[i][0]]);
    }
    if (ptsR.length > 1) {
      L.polyline(ptsR, { color: '#fff', weight: 10, opacity: .9, lineCap: 'round' }).addTo(layerRoute);
      L.polyline(ptsR, { color: col, weight: 6, lineCap: 'round' }).addTo(layerRoute);
      latlngs = latlngs.concat(ptsR);
    }
  });
  var aPos = myPos(), bPos = pts.b ? { lat: pts.b.la, lon: pts.b.lo } : { lat: aPos.lat, lon: aPos.lng };
  L.polyline([[aPos.lat, aPos.lng], [D.P[o.aStop].la, D.P[o.aStop].lo]],
    { color: '#27C171', weight: 5, dashArray: '2 9', lineCap: 'round' }).addTo(layerWalk);
  L.polyline([[D.P[o.bStop].la, D.P[o.bStop].lo], [bPos.lat, bPos.lon]],
    { color: '#27C171', weight: 5, dashArray: '2 9', lineCap: 'round' }).addTo(layerWalk);
  flagMarker([bPos.lat, bPos.lon]).addTo(layerFlags);
  if (userMarker) flagMarker([aPos.lat, aPos.lng], true).addTo(layerFlags);
  latlngs.push([aPos.lat, aPos.lng], [bPos.lat, bPos.lon]);
  if (latlngs.length) map.fitBounds(L.latLngBounds(latlngs), { padding: [46, 46] });
  renderTrip();
  openView('v-trip');
  showEtaBar();
  push('Viaje iniciado', 'Llegás en ' + fmtMin(o.total) + ' · ' + minsToClock(new Date(), o.total));
}
function flagMarker(ll, origin) {
  var html = origin
    ? '<div class="mk-flag"><svg viewBox="0 0 30 38"><path d="M15 1.5C8.1 1.5 2.5 7 2.5 13.7 2.5 22.6 15 36.5 15 36.5S27.5 22.6 27.5 13.7C27.5 7 21.9 1.5 15 1.5Z" fill="#27C171" stroke="#fff" stroke-width="2.4"/><circle cx="15" cy="13.5" r="4.6" fill="#fff"/></svg></div>'
    : '<div class="mk-flag"><svg viewBox="0 0 30 38"><path d="M15 1.5C8.1 1.5 2.5 7 2.5 13.7 2.5 22.6 15 36.5 15 36.5S27.5 22.6 27.5 13.7C27.5 7 21.9 1.5 15 1.5Z" fill="#FF4B4B" stroke="#fff" stroke-width="2.4"/><path d="M11.4 8.6v12.2l7.6-2.9-7.6-2.7" fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>';
  return L.marker(ll, { icon: L.divIcon({ className: 'mk-flagwrap', html: html, iconSize: [30, 38], iconAnchor: [15, 36] }), zIndexOffset: 800 });
}
function renderTrip() {
  var o = tripOpt;
  if (!o) return;
  $('#tripEta').textContent = fmtMin(o.total);
  $('#tripClock').textContent = 'Llegás ' + minsToClock(new Date(), o.total);
  $('#tripMeta').textContent = fmtKm(o.totalM) + ' · ' + (o.transfers ? o.transfers + ' combinación' + (o.transfers > 1 ? 'es' : '') : 'viaje directo');
  var steps = '';
  var pos = myPos();
  steps += step('walk', 'var(--green)', 'Caminá hasta la parada',
    D.P[o.aStop].n + ' · ' + fmtKm(distM([pos.lat, pos.lng], [D.P[o.aStop].la, D.P[o.aStop].lo])), fmtMin(o.walkT));
  var a0 = nextArrival(o.legs[0].key, o.aStop);
  var w1 = waitMinutes(o.legs[0].key, o.aStop);
  var src0 = a0 && a0.live ? 'en vivo' : a0 && a0.real ? 'horario de programa' : 'estimado';
  steps += step('clock', 'var(--blue-700)', w1 < 1 ? 'Tu bondi está llegando' : 'Esperá tu bondi',
    w1 < 1 ? 'En la parada ahora mismo · ' + src0 : 'Próxima unidad en ' + fmtMin(w1) + ' · ' + src0, fmtMin(w1));
  o.legs.forEach(function (lg, i) {
    var l = lineByKey[lg.key], meta = routeMeta[lg.key];
    steps += step('bus', l.c, 'Subite a la línea ' + l.n, meta.r.n.charAt(0) + meta.r.n.slice(1).toLowerCase(), fmtMin(lg.dist / (17.5 / 3.6) / 60));
    if (i < o.legs.length - 1) {
      var nxt = lineByKey[o.legs[i + 1].key];
      var w2 = waitMinutes(o.legs[i + 1].key, lg.to);
      steps += step('stop', l.c, 'Bajate en ' + D.P[lg.to].n, 'Ahí tomás la línea ' + nxt.n, '');
      steps += step('clock', 'var(--blue-700)', w2 < 1 ? 'La línea ' + nxt.n + ' está llegando' : 'Esperá la línea ' + nxt.n,
        w2 < 1 ? 'En la parada ahora mismo' : 'Próxima unidad en ' + fmtMin(w2), fmtMin(w2));
    } else {
      steps += step('stop', l.c, 'Bajate en ' + D.P[lg.to].n, 'Ya llegaste a la zona', '');
    }
  });
  steps += step('flag', 'var(--red)', 'Llegá a tu destino', pts.b ? pts.b.n : 'Destino', '');
  $('#tripSteps').innerHTML = steps;
  hydrate($('#v-trip'));
}
function step(ico, color, title, sub, time) {
  return '<div class="step"><div class="s-ic" style="background:' + color + '">' + icoSvg(ico) + '</div>' +
    '<div class="s-t"><b>' + title + '</b><span>' + sub + '</span></div>' +
    '<div class="s-m">' + (time || '') + '</div></div>';
}
function showEtaBar() {
  if (!tripOpt) return;
  var bar = $('#etaBar');
  bar.classList.remove('hidden');
  bar.innerHTML = '<span class="eta-ic">' + icoSvg('bus') + '</span>' +
    '<div><b id="etaLeft">' + fmtMin(tripOpt.total) + '</b> <span style="opacity:.9">· llegás ' + minsToClock(new Date(), tripOpt.total) + '</span></div>' +
    '<button class="eta-x" id="etaClose">' + icoSvg('close') + '</button>';
}
function endTrip() {
  tripOpt = null;
  document.body.classList.remove('navigating');
  $('#etaBar').classList.add('hidden');
  clearRoute();
  layerFlags.clearLayers(); layerWalk.clearLayers();
  setDestPin(pts.b);
  backView();
  tickWatch();
  toast('Viaje finalizado', 'Esperamos que llegues bien', 'check', 'var(--green)');
}
function push(title, text) {
  $('#pushTitle').textContent = title;
  $('#pushText').textContent = text;
  $('#push').classList.remove('hidden');
  clearTimeout(push._t);
  push._t = setTimeout(function () { $('#push').classList.add('hidden'); }, 5200);
}

/* =========================== PUNTO EN EL MAPA / DIRECCIONES =========================== */
var destPin = null, pickMode = false;
function setDestPin(p) {
  if (destPin) { layerDest.removeLayer(destPin); destPin = null; }
  if (!p) return;
  destPin = flagMarker([p.la, p.lo]).addTo(layerDest);
}
function setPickMode(on) {
  pickMode = !!on;
  var h = $('#pickHint');
  if (h) h.classList.toggle('hidden', !pickMode);
  var wb = $('#watchBar'); if (wb) wb.style.display = pickMode ? 'none' : '';
  var eb = $('#etaBar'); if (eb) eb.style.display = pickMode ? 'none' : '';
  if (map) map.getContainer().style.cursor = pickMode ? 'crosshair' : '';
}
function pickAt(latlng) {
  setPickMode(false);
  hidePopup();
  pts.b = { n: 'Punto en el mapa', la: latlng.lat, lo: latlng.lng };
  $('#inpB').value = pts.b.n;
  $('[data-clear="b"]').classList.add('on');
  setDestPin(pts.b);
  map.flyTo(latlng, Math.max(map.getZoom(), 16), { duration: 0.5 });
  reverseGeocode(latlng).then(function (n) {
    if (!n || !pts.b || pts.b.n !== 'Punto en el mapa') return;
    pts.b.n = n;
    if ($('#inpB').value === 'Punto en el mapa') $('#inpB').value = n;
    remember(pts.b);
    setDestPin(pts.b);
  });
  openView('v-search');
  toast('Punto fijado en el mapa', 'Tocá “Buscar líneas” para ver cómo llegar', 'pin', 'var(--red)');
}
function reverseGeocode(ll) {
  var url = 'https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&addressdetails=1&lat=' + ll.lat + '&lon=' + ll.lng;
  return fetch(url, { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      if (!j || !j.display_name) return '';
      var a = j.address || {};
      var street = a.road || a.pedestrian || a.street || a.neighbourhood || a.suburb || a.hamlet || '';
      var num = a.house_number ? ' ' + a.house_number : '';
      var name = street ? street + num : (j.display_name.split(',')[0] || '');
      var city = a.city || a.town || a.village || '';
      if (name && city) name += ', ' + city;
      return (name || j.display_name).trim();
    }).catch(function () { return ''; });
}
function initMapPick() {
  map.on('click', function (e) { if (pickMode) pickAt(e.latlng); });
  var c = map.getContainer(), timer = null, sx = 0, sy = 0, moved = false;
  function clear() { if (timer) { clearTimeout(timer); timer = null; } }
  map.on('movestart', clear);
  c.addEventListener('pointerdown', function (e) {
    if (e.button && e.button !== 0) return;
    sx = e.clientX; sy = e.clientY; moved = false;
    clear();
    timer = setTimeout(function () {
      timer = null;
      if (moved || pickMode) return;
      var r = c.getBoundingClientRect();
      pickAt(map.containerPointToLatLng([sx - r.left, sy - r.top]));
    }, 580);
  });
  c.addEventListener('pointermove', function (e) {
    if (Math.abs(e.clientX - sx) > 9 || Math.abs(e.clientY - sy) > 9) { moved = true; clear(); }
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { c.addEventListener(ev, clear); });
}

/* =========================== AVISOS DE LLEGADA (SALÍ / LLEGA EN …) =========================== */
var watch = null, swReg = null;

/* ---------- plataforma: la web no tiene CapBridge, la APK Android sí ---------- */
function isNative() { return !!(window.CapBridge && window.CapBridge.isNative); }
function nativeLn() { return window.CapBridge ? window.CapBridge.LocalNotifications : null; }
/* avisos que el sistema lanza aunque la app esté cerrada (AlarmManager) */
var LN_IDS = { salir: 7101, cerca: 7102, subite: 7103 };
var nativePlan = null, nativeNotifOK = false, nativeTried = false, nativePermWarned = false;

function cancelNativePlan() {
  if (!nativePlan) { return; }
  nativePlan = null;
  var ln = nativeLn();
  if (!ln) return;
  try { ln.cancel({ notifications: Object.keys(LN_IDS).map(function (k) { return { id: LN_IDS[k] }; }) }); } catch (e) {}
}

/* t: tiempos absolutos (ms) de cada aviso, o null si no corresponde */
function syncNativePlan(t, txt) {
  if (!isNative()) return;
  var ln = nativeLn();
  if (!ln) return;
  var prev = nativePlan || {};
  var merged = {}, jobs = [];
  Object.keys(LN_IDS).forEach(function (k) {
    var p = prev[k], n = t[k];
    merged[k] = n != null ? n : p;
    if (n != null && (p == null || Math.abs(n - p) > 45000)) {
      jobs.push({ id: LN_IDS[k], at: n, title: txt[k].title, body: txt[k].body });
    }
  });
  if (jobs.length) {
    Promise.all(jobs.map(function (j) {
      return ln.cancel({ notifications: [{ id: j.id }] }).then(function () {
        return ln.schedule({
          notifications: [{
            id: j.id, title: j.title, body: j.body,
            schedule: { at: new Date(j.at) }, autoCancel: true
          }]
        });
      });
    })).then(function () { nativeNotifOK = true; nativeTried = true; })
      .catch(function () { nativeNotifOK = false; nativeTried = true; });
  }
  nativePlan = merged;
}

/* diferencia angular entre dos rumbos (grados, 0 = norte), siempre 0..180 */
function angDiff(a, b) {
  var d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/* Dónde está el bondi en su recorrido: la parada real (calle) más cercana a la unidad.
   Priorizamos las unidades que se ACERCAN a tu parada (rumbo = dos muestras
   consecutivas de la misma unidad). Sin ese filtro, el "más cercano" puede ser el
   que acaba de pasar en el sentido contrario: te decía "viene por Estación ACA"
   con el bondi a 25 m pero con 17 min de eta. Si ninguna viene hacia vos, se usa
   el más cercano como antes. */
function busPor(key, si) {
  var bs = busesOn(key);
  if (!bs.length) return null;
  var t = D.P[si];
  if (!t) return null;
  var destino = [t.la, t.lo];
  var mejor = null, mejorAprox = null;
  bs.forEach(function (b) {
    var d = distM(b.cur, destino);
    var hacia = true;   /* sin rumbo (nueva unidad o detenida) no opinamos */
    if (b.prevTo && b.to) {
      var movio = distM(b.prevTo, b.to);
      if (movio > 8) {
        var rumbo = trueBearing(b.prevTo, b.to);
        hacia = angDiff(rumbo, trueBearing(b.cur, destino)) <= 90;
      }
    }
    var c = { pos: b.cur, d: d };
    if (!mejor || d < mejor.d) mejor = c;
    if (hacia && (!mejorAprox || d < mejorAprox.d)) mejorAprox = c;
  });
  var elegido = mejorAprox || mejor;
  if (!elegido) return null;
  var calle = null, dmin = null;
  (D.R[key] || []).forEach(function (idx) {
    var s = D.P[idx];
    if (!s) return;
    var d = distM(elegido.pos, [s.la, s.lo]);
    if (dmin == null || d < dmin) { dmin = d; calle = s.n; }
  });
  return calle ? { calle: calle, dist: elegido.d } : null;
}

/* ---------- plan de salida: caminata + espera máxima de 3 min + bondi alcanzable ---------- */
function liveEtas(key, si) {
  var s = D.P[si], ls = s && liveStops[s.k];
  if (!ls || Date.now() - ls.ts >= ARRIBO_STALE) return [];
  var w = String(key).split('_'), out = [];
  for (var i = 0; i < ls.proximos.length; i++) {
    var p = ls.proximos[i];
    if (String(p.linea) !== w[0]) continue;
    if (p.cliente != null && String(p.cliente) !== w[1]) continue;
    if (p.ruta != null && String(p.ruta) !== w[2]) continue;
    var m = etaMin(p);
    if (m != null) out.push(m);
  }
  return out.sort(function (a, b) { return a - b; });
}
/* Devuelve: cuánto caminás, en cuánto viene el bondi, cuándo tenés que salir
   (llegando con espera de hasta 3 minutos) y si ese bondi lo alcanzás. */
function planOut(key, si) {
  var s = D.P[si];
  if (!s) return { walk: 0, eta: null, leaveIn: null, alcanzable: null };
  var walk = walkMinTo(s.la, s.lo);
  var etas = liveEtas(key, si), eta = null, i;
  if (!etas.length) {
    var a = nextArrival(key, si);
    if (!a) return { walk: walk, eta: null, leaveIn: null, alcanzable: null };
    return { walk: walk, eta: a.min, leaveIn: a.min - walk - 3, alcanzable: a.min >= walk - 0.5 };
  }
  for (i = 0; i < etas.length; i++) if (etas[i] >= walk - 0.5) { eta = etas[i]; break; }
  if (eta == null) return { walk: walk, eta: etas[0], leaveIn: null, alcanzable: false };
  return { walk: walk, eta: eta, leaveIn: eta - walk - 3, alcanzable: true };
}

function initNotify() {
  if ('serviceWorker' in navigator && !isNative() && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('sw.js').then(function (r) { swReg = r; }).catch(function () {}); } catch (e) {}
  }
  /* al volver de segundo plano refrescamos el plan con datos frescos y
     el botón atrás de Android cierra el panel en vez de salir de la app */
  if (isNative() && window.CapBridge && window.CapBridge.App) {
    var capApp = window.CapBridge.App;
    try {
      capApp.addListener('appStateChange', function (st) {
        if (st && st.isActive) { tickWatch(true); refreshCardEta(); }
      });
      capApp.addListener('backButton', function () {
        if (pickMode) setPickMode(false);
        else if (viewStack.length > 1) backView();
        else capApp.exitApp();
      });
    } catch (e) {}
  }
  setInterval(function () { tickWatch(); refreshCardEta(); }, 10000);
}
function walkMinTo(lat, lng) {
  var p = myPos();
  return (distM([p.lat, p.lng], [lat, lng]) * 1.28) / (4.6 / 3.6) / 60;
}
function askNotify(cb) {
  var done = false;
  function fin(m) { if (done) return; done = true; cb(m); }
  try {
    if (!('Notification' in window)) return fin('inapp');
    if (Notification.permission === 'granted') return fin('sys');
    if (Notification.permission === 'denied') return fin('inapp');
    var r = Notification.requestPermission(function (p) { fin(p === 'granted' ? 'sys' : 'inapp'); });
    if (r && r.then) r.then(function (p) { fin(p === 'granted' ? 'sys' : 'inapp'); }, function () { fin('inapp'); });
  } catch (e) { fin('inapp'); }
}
function notify(title, body, tag) {
  var ok = false;
  try {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      var opts = { body: body, tag: tag || 'bondi', icon: 'logo.svg', badge: 'logo.svg', renotify: false };
      if (swReg) { swReg.showNotification(title, opts); ok = true; }
      else { new Notification(title, opts); ok = true; }
    }
  } catch (e) { ok = false; }
  if (!ok) push(title, body);
}
function startWatch(key, si) {
  var l = lineByKey[key], s = D.P[si];
  if (!l || !s) { toast('Sin datos', 'No se pudo activar el aviso', 'warn', 'var(--red)'); return; }
  fetchStopArribos([s.k]);
  watch = { key: key, si: si, phase: -1 };
  cancelNativePlan();
  if (isNative() && nativeLn()) {
    /* Android: pedimos permiso de avisos acá (si lo negás igual te avisamos dentro de la app) */
    try {
      nativeLn().requestPermissions().then(function (st) {
        if (!st || st.display === 'granted') {
          toast('Avisos activados', 'Te avisamos cuándo salir, cuando viene y cuando llegó', 'bell', 'var(--green)');
        } else if (!nativePermWarned) {
          nativePermWarned = true;
          toast('Avisos bloqueados', 'Activá las notificaciones de Bondi en Ajustes para recibirlos', 'bell', 'var(--amber)');
        }
      }).catch(function () {
        toast('Avisos activados', 'Te avisamos cuándo salir, cuando viene y cuando llegó', 'bell', 'var(--green)');
      });
    } catch (e) {}
  } else {
    askNotify(function (mode) {
      if (mode === 'sys') toast('Avisos activados', 'Te avisamos cuándo salir y cuándo llega', 'bell', 'var(--green)');
      else toast('Avisos activados', 'Si tu navegador bloquea notificaciones, te avisamos dentro de la app', 'bell', 'var(--blue-700)');
    });
  }
  syncWatchUI();
  tickWatch(true);
  push('Avisos activados', 'Línea ' + l.n + ' en ' + s.n + ' · te avisamos cuándo salir de donde estés');
}
function stopWatch() {
  watch = null;
  cancelNativePlan();
  syncWatchUI();
  $('#watchBar').classList.add('hidden');
}
function showWatchBar() {
  var bar = $('#watchBar');
  if (!bar.dataset.built) {
    bar.innerHTML = '<span class="wb-ic">' + icoSvg('bell') + '</span>' +
      '<div class="wb-t"><b id="wbTitle">Aviso</b><span id="wbSub"></span></div>' +
      '<span class="eta-pill" id="wbEta">—</span>' +
      '<button class="wb-x" id="watchClose" type="button">' + icoSvg('close') + '</button>';
    bar.dataset.built = '1';
  }
  bar.classList.remove('hidden');
}
function tickWatch(force) {
  var bar = $('#watchBar');
  if (!watch) { cancelNativePlan(); if (bar) bar.classList.add('hidden'); return; }
  if (tripOpt || pickMode) { if (bar) bar.classList.add('hidden'); return; }
  var s = D.P[watch.si], l = lineByKey[watch.key];
  if (!s || !l) { stopWatch(); return; }
  fetchStopArribos([s.k], force);

  var p = planOut(watch.key, watch.si);
  var walk = p.walk, eta = p.eta, leaveIn = p.leaveIn;
  var por = eta != null ? busPor(watch.key, watch.si) : null;
  var calle = por ? por.calle : null;
  var phase, state, title, sub;

  if (eta == null) {
    phase = 0; state = 'wait';
    title = 'Sin unidades en camino';
    sub = 'Línea ' + l.n + ' · ' + s.n + ' · te avisamos cuando haya dato';
  } else if (p.alcanzable === false) {
    phase = 0; state = 'wait';
    title = 'No alcanzás ese bondi';
    sub = 'Pasa en ' + fmtMin(eta) + ' y caminás ' + fmtMin(walk) + ' · avisamos con el próximo';
  } else if (eta <= 0.75) {
    phase = 3; state = 'arr';
    title = '¡Ya llegó tu bondi!';
    sub = 'Línea ' + l.n + ' en ' + s.n + ' · subite';
  } else if (eta <= 3) {
    phase = 2; state = 'soon';
    title = 'Está por llegar';
    sub = calle && calle !== s.n
      ? 'Línea ' + l.n + ' viene por ' + calle + ' · llega en ' + fmtMin(eta)
      : 'Línea ' + l.n + ' en ' + s.n + ' · llega en ' + fmtMin(eta);
  } else if (leaveIn <= 0) {
    phase = 1; state = 'go';
    title = 'Es hora de salir';
    sub = 'Caminás ' + fmtMin(walk) + ' hasta ' + s.n + ' · llega en ' + fmtMin(eta) + ' · esperás hasta 3 min';
  } else if (walk < 0.9) {
    phase = 0; state = 'wait';
    title = 'Bondi en ' + fmtMin(eta);
    sub = 'Ya estás en ' + s.n + ' · línea ' + l.n + ' · esperás hasta 3 min';
  } else {
    phase = 0; state = 'wait';
    title = 'Salí en ' + fmtMin(leaveIn);
    sub = 'Línea ' + l.n + ' · llega en ' + fmtMin(eta) + ' · caminás ' + fmtMin(walk) +
      (calle ? ' · viene por ' + calle : '');
  }

  /* avisos que dispara el sistema (Android) aunque la app esté cerrada */
  if (isNative()) {
    var now = Date.now();
    var mk = function (min) {
      var at = now + min * 60000;
      return (min > 0 && at > now + 4000 && at < now + 12 * 3600000) ? at : null;
    };
    syncNativePlan(
      { salir: leaveIn != null ? mk(leaveIn) : null, cerca: mk(eta - 3), subite: mk(eta) },
      {
        salir: { title: 'Es hora de salir', body: 'Caminás ' + fmtMin(walk) + ' hasta ' + s.n + '. Si salís ahora, esperás 3 minutos o menos.' },
        cerca: {
          title: 'Tu bondi está por llegar',
          body: (calle && calle !== s.n)
            ? 'Línea ' + l.n + ' viene por ' + calle + ' · llega en ' + fmtMin(eta)
            : 'Línea ' + l.n + ' en ' + s.n + ' · llega en ' + fmtMin(eta)
        },
        subite: { title: '¡Llegó tu bondi!', body: 'Línea ' + l.n + ' llegó a ' + s.n + '. ¡Subite!' }
      });
  }

  showWatchBar();
  bar.dataset.state = state;
  $('#wbTitle').textContent = title;
  $('#wbSub').textContent = sub;
  var pill = $('#wbEta');
  pill.className = 'eta-pill ' + (eta != null ? etaClass(eta) : 'eta-r');
  pill.textContent = eta != null ? fmtMin(eta) : '—';

  if (phase > watch.phase) {
    /* en Android los avisos ya salen programados; solo avisamos por acá si fallaron */
    var sistema = !isNative() || (nativeTried && !nativeNotifOK);
    if (sistema) {
      if (phase === 1) notify('Es hora de salir', 'Caminás ' + fmtMin(walk) + ' hasta ' + s.n + '. Si salís ahora esperás 3 minutos o menos.', 'salir');
      else if (phase === 2) notify('Tu bondi está por llegar',
        (calle && calle !== s.n) ? 'Línea ' + l.n + ' viene por ' + calle + ' · llega en ' + fmtMin(eta)
          : 'Línea ' + l.n + ' en ' + s.n + ' en ' + fmtMin(eta), 'llega');
      else if (phase === 3) notify('¡Llegó tu bondi!', 'Línea ' + l.n + ' llegó a ' + s.n + '. ¡Subite!', 'llego');
    }
    watch.phase = phase;
  } else if (phase === 0) watch.phase = 0;
}
function syncWatchUI() {
  var b = $('#btnWatchStop');
  if (b) {
    var active = !!watch && currentStop != null && watch.si === currentStop;
    if (b.dataset.on !== (active ? '1' : '0')) {
      b.dataset.on = active ? '1' : '0';
      b.classList.toggle('on', active);
      b.innerHTML = '<span class="ico" data-ico="bell"></span>' + (active ? 'Aviso activado' : 'Avisarme cuando llegue');
      hydrate(b);
    }
  }
  var c = $('#lcWatch');
  if (c) {
    var w = !!watch && !!activeKey && watch.key === activeKey;
    if (c.dataset.on !== (w ? '1' : '0')) {
      c.dataset.on = w ? '1' : '0';
      c.classList.toggle('on', w);
      c.innerHTML = '<span class="ico" data-ico="bell"></span>' + (w ? 'Avisando' : 'Avisarme');
      hydrate(c);
    }
  }
  if (!watch) $('#watchBar').classList.add('hidden');
}
