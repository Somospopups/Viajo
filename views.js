/* BondiWaze · vistas, bottom sheet, mapa, búsqueda y viaje */
'use strict';

/* =========================== BOTTOM SHEET =========================== */
var viewStack = ['v-home'];
function setSheet(state) {
  if (state) document.body.dataset.sheet = state;
  else document.body.removeAttribute('data-sheet');
}
function openView(id, opt) {
  var cur = viewStack[viewStack.length - 1];
  if (cur === id) { renderFor(id); syncHandle(); return; }
  if (viewStack.indexOf(id) >= 0) viewStack = viewStack.slice(0, viewStack.indexOf(id) + 1);
  else viewStack.push(id);
  $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== id); });
  $('#views').scrollTop = 0;
  renderFor(id);
  if (!opt || !opt.keepSheet) setSheet(id === 'v-home' ? null : 'full');
  syncHandle();
  markTab(id);
}
function backView() {
  if (viewStack.length <= 1) { setSheet(null); return; }
  viewStack.pop();
  var id = viewStack[viewStack.length - 1];
  $$('.view').forEach(function (v) { v.classList.toggle('hidden', v.id !== id); });
  renderFor(id);
  setSheet(id === 'v-home' ? null : 'full');
  syncHandle(); markTab(id);
}
function renderFor(id) {
  if (id === 'v-home') renderHome();
  else if (id === 'v-lines') renderLinesList();
  else if (id === 'v-nearby') renderNearby();
  else if (id === 'v-fav') renderFav();
  else if (id === 'v-search') initSearch();
}
function syncHandle() {
  var h = $('#handle');
  var back = $('#shBack');
  if (viewStack.length > 1) {
    if (!back) {
      back = document.createElement('button');
      back.id = 'shBack'; back.type = 'button';
      back.className = 'sh-back';
      back.innerHTML = icoSvg('back');
      back.addEventListener('click', function (e) { e.stopPropagation(); backView(); });
      h.insertBefore(back, h.firstChild);
    }
  } else if (back) back.remove();
}
function markTab(id) {
  var map = { 'v-search': 'search', 'v-fav': 'fav' };
  $$('#nav .tab').forEach(function (t) {
    t.classList.toggle('active', map[id] ? t.dataset.nav === map[id] : t.dataset.nav === 'search' && id === 'v-home');
  });
}
function initSheet() {
  var h = $('#handle'), dragging = false, startY = 0, startState = '';
  function stateIdx(s) { return s === 'full' ? 2 : s === 'half' ? 1 : 0; }
  h.addEventListener('pointerdown', function (e) {
    if (e.target.closest('#shBack')) return;
    dragging = true; startY = e.clientY;
    startState = document.body.dataset.sheet || 'closed';
    h.setPointerCapture(e.pointerId);
  });
  h.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dy = e.clientY - startY;
    if (dy < -46 && stateIdx(startState) < 2) { dragging = false; setSheet(stateIdx(startState) === 0 ? 'half' : 'full'); }
    if (dy > 46 && stateIdx(startState) > 0) { dragging = false; setSheet(stateIdx(startState) === 2 ? 'half' : null); }
  });
  h.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    var cur = document.body.dataset.sheet;
    setSheet(cur === 'full' ? null : cur === null ? 'half' : 'full');
  });
}

/* =========================== POPUP =========================== */
var curPopup = null;
function showPopup(latlng, html) {
  hidePopup();
  curPopup = L.popup({ closeButton: false, offset: [0, -4], autoPan: true, maxHeight: 420 })
    .setLatLng(latlng).setContent(html).openOn(map);
}
function hidePopup() { if (curPopup) { map.closePopup(curPopup); curPopup = null; } }

/* =========================== HOME =========================== */
function lineCard(l) {
  var r = l.r[0];
  var fav = store.get('favLines', []).indexOf(l.i) >= 0;
  return '<div class="lcard" data-line="' + l.i + '" style="--c:' + l.c + '">' +
    '<span class="lc-star' + (fav ? ' on' : '') + '" data-fav="' + l.i + '">' + icoSvg('star') + '</span>' +
    '<div class="lc-b"><i>' + l.n + '</i><em>' + l.e + '</em></div>' +
    '<b>' + (r ? r.n : '') + '</b>' +
    '<span>' + (r ? r.k.toFixed(1).replace('.', ',') + ' km · ' + r.p + ' paradas' : '') + '</span></div>';
}
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
    routes.slice(0, 3).forEach(function (rr) { ensureBuses(rr.key); });
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
function renderHome() {
  var favs = store.get('favLines', []);
  $('#homeFavs').innerHTML = favs.length
    ? favs.map(function (id) { var l = D.lineas.filter(function (x) { return x.i === id; })[0]; return l ? lineCard(l) : ''; }).join('')
    : emptyHtml('star', 'Sin líneas favoritas', 'Tocá la estrella de una línea para tenerla a mano acá');
  var arr = nearestArrivals(4);
  $('#homeArrivals').innerHTML = arr.length
    ? arr.map(function (a) { return arrivalRow(a.l, a.si, a.key, a.arr, a.d); }).join('')
    : emptyHtml('bus', 'No hay arribos cerca', 'Acercate a una parada o ampliá la búsqueda');
  $('#homeAlerts').innerHTML = ALERTS.slice(0, 3).map(alertRow).join('');
  hydrate($('#v-home'));
}
function alertRow(a) {
  return '<div class="row" data-alert="' + a.id + '">' +
    '<div class="r-ico" style="background:' + a.bg + ';color:#fff">' + icoSvg(a.ico) + '</div>' +
    '<div class="r-t"><b>' + a.t + '</b><span>' + a.s + '</span></div>' +
    '<span class="ico chev" data-ico="chevron"></span></div>';
}

/* =========================== ALERTAS / TRÁFICO =========================== */
var ALERT_TYPES = [
  { id: 'accident', t: 'Accidente', ico: 'warn', c: '#E23B3B', bg: '#FF4B4B' },
  { id: 'police', t: 'Control policial', ico: 'shield', c: '#1B8FFF', bg: '#1B8FFF' },
  { id: 'hazard', t: 'Pozo / bache', ico: 'cone', c: '#D97100', bg: '#FF8A1E' },
  { id: 'traffic', t: 'Tráfico intenso', ico: 'car', c: '#E23B3B', bg: '#FF6B00' },
  { id: 'event', t: 'Evento', ico: 'flag', c: '#7C4DFF', bg: '#7C4DFF' },
  { id: 'flood', t: 'Calle anegada', ico: 'warn', c: '#0FA6D8', bg: '#00A3D8' },
  { id: 'closed', t: 'Calle cortada', ico: 'cone', c: '#D97100', bg: '#FFB800' },
  { id: 'other', t: 'Otro aviso', ico: 'info', c: '#4C5D6B', bg: '#8A97A3' }
];
var ALERTS = [
  { id: 1, lat: -31.4207, lon: -64.1998, type: 'traffic', t: 'Tráfico intenso', s: 'Av. Colón · hace 6 min', ico: 'car', c: '#FF6B00', bg: '#FF6B00' },
  { id: 2, lat: -31.4303, lon: -64.2135, type: 'accident', t: 'Accidente', s: 'Av. Vélez Sarsfield · hace 12 min', ico: 'warn', c: '#FF4B4B', bg: '#FF4B4B' },
  { id: 3, lat: -31.4144, lon: -64.1861, type: 'police', t: 'Control policial', s: 'Bv. Illia · hace 3 min', ico: 'shield', c: '#1B8FFF', bg: '#1B8FFF' },
  { id: 4, lat: -31.4372, lon: -64.1901, type: 'hazard', t: 'Pozo grande', s: 'Av. Duarte Quiroga · hace 21 min', ico: 'cone', c: '#FF8A1E', bg: '#FF8A1E' },
  { id: 5, lat: -31.4267, lon: -64.1759, type: 'event', t: 'Feria de artesanos', s: 'Plaza de las Américas', ico: 'flag', c: '#7C4DFF', bg: '#7C4DFF' },
  { id: 6, lat: -31.4102, lon: -64.2043, type: 'flood', t: 'Calle anegada', s: 'Av. Ramón Cáceres', ico: 'warn', c: '#00A3D8', bg: '#00A3D8' }
];
var alertSeq = 7;
function renderAlerts() {
  layerAlerts.clearLayers();
  ALERTS.forEach(function (a) {
    var m = L.marker([a.lat, a.lon], {
      icon: L.divIcon({
        className: 'mk-alertwrap',
        html: '<div class="mk-alert" style="background:' + a.bg + '">' + icoSvg(a.ico) + '</div>',
        iconSize: [34, 34], iconAnchor: [17, 17]
      }),
      zIndexOffset: 600
    }).addTo(layerAlerts);
    m.on('click', function (e) {
      L.DomEvent.stopPropagation(e);
      showPopup(e.latlng,
        '<div class="wz-pop"><div class="p-top"><span class="p-badge" style="background:' + a.bg + '">' + icoSvg(a.ico) + '</span>' +
        '<div class="p-t"><b>' + a.t + '</b><span>' + a.s + '</span></div>' +
        '<button class="p-close" data-pop="1">' + icoSvg('close') + '</button></div>' +
        '<div class="p-foot"><button data-confirm="' + a.id + '">Confirmar</button><button class="ghost" data-dismiss="' + a.id + '">Descartar</button></div></div>');
    });
  });
  $('#btnAlerts .fab-dot').classList.toggle('on', ALERTS.length > 0);
}
function addAlert(typeId, lat, lon) {
  var t = ALERT_TYPES.filter(function (x) { return x.id === typeId; })[0] || ALERT_TYPES[7];
  var a = { id: alertSeq++, lat: lat, lon: lon, type: t.id, t: t.t, s: 'Reportado por vos · recién', ico: t.ico, c: t.c, bg: t.bg };
  ALERTS.unshift(a);
  renderAlerts();
  return a;
}
var trafficOnMap = false;
function toggleTraffic() {
  trafficOnMap = !trafficOnMap;
  $('#btnTraffic').classList.toggle('on', trafficOnMap);
  if (trafficOnMap) {
    layerTraffic.clearLayers();
    var keys = Object.keys(D.traza), used = 0;
    for (var i = 0; i < keys.length && used < 8; i++) {
      var t = D.traza[keys[(i * 23 + 5) % keys.length]];
      if (t.length < 12) continue;
      var sev = (i * 7) % 3;
      var start = 4 + ((i * 11) % (t.length - 14));
      var slice = t.slice(start, start + 9).map(function (p) { return [p[1], p[0]]; });
      L.polyline(slice, {
        color: sev === 0 ? '#FF3B3B' : sev === 1 ? '#FF8A1E' : '#FFD400',
        weight: 9, opacity: 0.82, lineCap: 'round'
      }).addTo(layerTraffic);
      used++;
    }
    layerTraffic.addTo(map);
    toast('Tráfico en vivo', 'Mostrando congestión en avenidas', 'traffic', 'var(--orange)');
  } else {
    map.removeLayer(layerTraffic);
  }
}

/* =========================== LÍNEAS =========================== */
var activeLine = null, activeKey = null, activeRoute = 0, etaSubs = [];
function renderLineChips() {
  $('#lineChips').innerHTML = D.lineas.map(function (l) {
    return '<button class="lc' + (activeLine && activeLine.i === l.i ? ' on' : '') + '" type="button" data-line="' + l.i + '" style="background:' + l.c + '">' +
      l.n + '<small>' + l.e + '</small></button>';
  }).join('');
}
function renderLinesList() {
  renderLineChips();
  var q = ($('#inpLineFilter').value || '').toLowerCase().trim();
  var list = D.lineas.filter(function (l) {
    if (!q) return true;
    if (l.n.toLowerCase().indexOf(q) >= 0 || String(l.i).indexOf(q) >= 0) return true;
    return l.r.some(function (r) { return r.n.toLowerCase().indexOf(q) >= 0; });
  });
  $('#linesListTitle').textContent = q ? list.length + ' resultados' : 'Todas las líneas (' + list.length + ')';
  $('#linesList').innerHTML = list.length ? list.map(function (l) {
    var r = l.r[0];
    return '<div class="row" data-line="' + l.i + '">' +
      '<div class="r-b" style="background:' + l.c + '">' + l.n + '</div>' +
      '<div class="r-t"><b>' + (r ? r.n : l.n) + '</b><span>' + l.r.length + ' recorrido' + (l.r.length > 1 ? 's' : '') + ' · cliente ' + l.e + '</span></div>' +
      '<span class="ico chev" data-ico="chevron"></span></div>';
  }).join('') : emptyHtml('search', 'Sin resultados', 'Probá con otro número o destino');
  hydrate($('#v-lines'));
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
  ensureBuses(r.t);
  $('#lhBadge').textContent = l.n;
  $('#lhBadge').style.background = l.c;
  $('#lhName').textContent = 'Línea ' + l.n;
  $('#lhRoute').textContent = r.n.charAt(0) + r.n.slice(1).toLowerCase();
  $('#lhSeg').innerHTML = l.r.map(function (rr, i) {
    return '<button type="button" data-seg="' + i + '" class="' + (i === activeRoute ? 'on' : '') + '">' +
      (rr.s === 'V' ? 'Vuelta' : 'Ida') + ' · ' + rr.k.toFixed(1).replace('.', ',') + ' km</button>';
  }).join('');
  var live = busesOn(r.t).length;
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
  activeKey = null; etaSubs = [];
}
function openStopPopup(si, latlng, key) {
  var s = D.P[si];
  var routes = (stopRoutes[si] || []).slice(0, 4);
  var rows = routes.map(function (rr) {
    var l = lineByKey[rr.key];
    var a = nextArrival(rr.key, si);
    return '<div class="row" style="border:0;background:none;padding:5px 2px;cursor:default">' +
      '<div class="r-b" style="background:' + l.c + '">' + l.n + '</div>' +
      '<div class="r-t"><b>' + (routeMeta[rr.key] ? routeMeta[rr.key].r.n : '') + '</b></div>' +
      '<span class="eta-pill ' + (a ? etaClass(a.min) : 'eta-r') + '">' + (a ? fmtMin(a.min) : '—') + '</span></div>';
  }).join('');
  showPopup(latlng || [s.la, s.lo],
    '<div class="wz-pop"><div class="p-top"><span class="p-badge" style="background:' + (key && routeMeta[key] ? routeMeta[key].l.c : '#0FA6D8') + '">' + icoSvg('stop') + '</span>' +
    '<div class="p-t"><b>' + s.n + '</b><span>Código ' + s.k + '</span></div>' +
    '<button class="p-close" data-pop="1">' + icoSvg('close') + '</button></div>' +
    '<div class="p-arr">' + rows + '</div>' +
    '<div class="p-foot"><button data-stop="' + si + '">Ver parada</button><button class="ghost" data-navto="' + si + '">Ir allá</button></div></div>');
}

/* =========================== PARADA / CERCA MÍO =========================== */
var currentStop = null;
function openStopView(si) {
  currentStop = si;
  var s = D.P[si];
  (stopRoutes[si] || []).slice(0, 3).forEach(function (rr) { ensureBuses(rr.key); });
  openView('v-stop');
  $('#stopName').textContent = s.n;
  var d = distM([s.la, s.lo], [myPos().lat, myPos().lng]);
  $('#stopMeta').textContent = 'Código ' + s.k + ' · ' + fmtKm(d) + ' de vos';
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
      '<span>' + (x.a ? (x.a.real ? 'próxima salida' : 'estimado sin señal') : 'fuera de servicio') + '</span></div>' +
      '<span class="eta-pill ' + (x.a ? etaClass(x.a.min) : 'eta-r') + '" data-eta="' + x.key + '|' + si + '">' + (x.a ? fmtMin(x.a.min) : '—') + '</span></div>';
  }).join('') : emptyHtml('bus', 'Sin datos de esta parada', 'No hay líneas asociadas');
  hydrate($('#v-stop'));
}
function renderNearby() {
  var pos = myPos();
  var near = stopsNear(pos.lat, pos.lng, 1500).slice(0, 14);
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
  hydrate($('#v-search'));
}
function searchRow(p, label, ico) {
  return '<div class="row" data-pick="' + encodeURIComponent(p.n) + '|' + p.la + '|' + p.lo + '">' +
    '<div class="r-ico">' + icoSvg(ico) + '</div>' +
    '<div class="r-t"><b>' + label + '</b><span>' + p.n + '</span></div>' +
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
function geocode(q) {
  var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=ar&addressdetails=1&q=' + encodeURIComponent(q + ', Córdoba, Argentina');
  return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (arr) {
    return arr.map(function (a) { return { n: a.display_name.split(',').slice(0, 3).join(','), la: parseFloat(a.lat), lo: parseFloat(a.lon) }; });
  }).catch(function () { return []; });
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
  if (!qB) {
    $('#inpB').focus();
    toast('Falta el destino', 'Decinos a dónde querés ir', 'pin', 'var(--amber)');
    return;
  }
  loader('Calculando recorridos…', true);
  var p = myPos();
  var pA = pts.a || { n: 'Mi ubicación', la: p.lat, lo: p.lng };
  resolveQuery(qB).then(function (pB) {
    if (!pB) {
      loader('', false);
      toast('Destino no encontrado', 'Probá con otro nombre', 'warn', 'var(--red)');
      return;
    }
    pts.b = pB;
    remember(pB);
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
  if (local.length && local[0].n.toLowerCase().indexOf(q.toLowerCase()) >= 0) return Promise.resolve(local[0]);
  return geocode(q).then(function (g) { return g.length ? g[0] : (local[0] || null); });
}
function remember(p) {
  var recents = store.get('recents', []).filter(function (r) { return r.n !== p.n; });
  recents.unshift({ n: p.n, la: p.la, lo: p.lo });
  store.set('recents', recents.slice(0, 8));
}
function planTrip(aLat, aLon, bLat, bLon) {
  var W = 4.6 / 3.6, B = 17.5 / 3.6;
  function walkT(m) { return (m * 1.28) / W / 60; }
  function busT(m) { return m / B / 60; }
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
        var wait = 3 + (hash(ra.key + fa.i) % 4);
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
            var wait = 3 + (hash(ra.key + fa.i) % 4);
            mk({
              legs: [
                { key: ra.key, from: fa.i, to: mid, dist: dMid - da },
                { key: rb.key, from: mid, to: fb.i, dist: db - db0 }
              ],
              walkM: walkM, extra: wait + 4, transfers: 1,
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
  setSheet('half');
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
  steps += step('clock', 'var(--blue-700)', 'Esperá tu bondi', 'Próxima unidad en ' + fmtMin(3 + (hash(o.legs[0].key) % 4)), fmtMin(3 + (hash(o.legs[0].key) % 4)));
  o.legs.forEach(function (lg, i) {
    var l = lineByKey[lg.key], meta = routeMeta[lg.key];
    steps += step('bus', l.c, 'Subite a la línea ' + l.n, meta.r.n.charAt(0) + meta.r.n.slice(1).toLowerCase(), fmtMin(lg.dist / (17.5 / 3.6) / 60));
    steps += step('stop', l.c, 'Bajate en ' + D.P[lg.to].n, i < o.legs.length - 1 ? 'Ahí tomás la línea ' + lineByKey[o.legs[i + 1].key].n : 'Ya llegaste a la zona', '');
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
  backView();
  renderHome();
  toast('Viaje finalizado', 'Esperamos que llegues bien', 'check', 'var(--green)');
}
function push(title, text) {
  $('#pushTitle').textContent = title;
  $('#pushText').textContent = text;
  $('#push').classList.remove('hidden');
  clearTimeout(push._t);
  push._t = setTimeout(function () { $('#push').classList.add('hidden'); }, 5200);
}
