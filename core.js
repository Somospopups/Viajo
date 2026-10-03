/* Bondi · núcleo: iconos, utilidades, índices, mapa y simulación */
'use strict';

var APP_VERSION = 'v184';
var D = window.DATA;
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

/* =========================== ICONOS =========================== */
var ICO = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16.7 16.7"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  locate: '<circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="8"/><path d="M12 1.5v3M12 19.5v3M22.5 12h-3M4.5 12h-3"/>',
  traffic: '<rect x="6" y="2.5" width="12" height="19" rx="4"/><circle cx="12" cy="7.5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="16.5" r="2"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
  bus: '<rect x="4" y="3.5" width="16" height="13.5" rx="3.5"/><path d="M4 11h16M8 20.5v-3M16 20.5v-3"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.8h19M6 15h4"/>',
  bike: '<circle cx="6" cy="17" r="3.6"/><circle cx="18" cy="17" r="3.6"/><path d="M6 17l4.5-8h4l3.5 8M9 6.5h3.5"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.4v5M12 7.9h.01"/>',
  home: '<path d="M4 10.6 12 4l8 6.6"/><path d="M6.4 9.6V20h11.2V9.6"/><path d="M10.4 20v-4.4h3.2V20"/>',
  work: '<rect x="3" y="7.5" width="18" height="12.5" rx="2.6"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18"/>',
  school: '<path d="M12 4.5 22 9l-10 4.5L2 9l10-4.5Z"/><path d="M6.5 11.3V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-4.7"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.9.85-4.25 4.15 1 5.85L12 17l-5.25 2.75 1-5.85L3.5 9.75l5.9-.85L12 3.6Z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9.5 5 7 7-7 7"/>',
  back: '<path d="m14.5 5-7 7 7 7"/>',
  swap: '<path d="M7 4.5v13M7 17.5 4 14.5M7 17.5l3-3M17 19.5v-13M17 6.5l-3 3M17 6.5l3 3"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 3c0 5-7.5 9.6-7.5 9.6Z"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.6 8.6 0 1 0 20 14.5Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
  share: '<circle cx="18" cy="5.5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="18.5" r="2.8"/><path d="m8.5 10.6 7-3.7M8.5 13.4l7 3.7"/>',
  map: '<path d="M9 4.5 3.5 6.8v13L9 17.2l6 2.6 5.5-2.3v-13L15 7.1 9 4.5Z"/><path d="M9 4.5v12.7M15 7.1v12.7"/>',
  logout: '<path d="M14.5 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5a2 2 0 0 0 2-2v-2"/><path d="M10.5 12H21M18 8.5l3.5 3.5L18 15.5"/>',
  download: '<path d="M12 4v11M8 11.5l4 4 4-4"/><path d="M4.5 19.5h15"/>',
  like: '<path d="M7 21V10.5l4.6-7A2 2 0 0 1 15 4.7l-.9 4h4.4a2.2 2.2 0 0 1 2.1 2.7l-1.6 6.6A2.6 2.6 0 0 1 16.5 21H7Z"/><path d="M7 10.5H4.5V21H7"/>',
  stop: '<circle cx="12" cy="12" r="8.4"/><rect x="9" y="9" width="6" height="6" rx="1.4"/>',
  walk: '<circle cx="13" cy="4.6" r="2"/><path d="M11 21l1.8-5.6L10 13.4l.8-4.4 3.4-1 2.4 3.3 2.6 1.1"/><path d="M10.6 9 8 11.5 6.6 15.6M13.6 15.4 15.8 21"/>',
  flag: '<path d="M6 21V4.5"/><path d="M6 5.2h11.5l-2.2 3.6 2.2 3.6H6"/>',
  shield: '<path d="M12 3.2 19.5 6v6.2c0 4.3-3.1 7.3-7.5 8.6-4.4-1.3-7.5-4.3-7.5-8.6V6L12 3.2Z"/><path d="M9.5 12.2 11.3 14l3.4-3.6"/>',
  warn: '<path d="M12 4.2 21 19.4H3L12 4.2Z"/><path d="M12 10.2v4M12 16.7h.01"/>',
  cone: '<path d="M12 3.5 6.5 19h11L12 3.5Z"/><path d="M9.4 11.5h5.2M8.3 15.5h7.4M4 20.5h16"/>',
  car: '<path d="M4.5 16v-3.2l1.9-4.4A2 2 0 0 1 8.3 7h7.4a2 2 0 0 1 1.9 1.4l1.9 4.4V16"/><path d="M4.5 12.8h15"/><circle cx="7.7" cy="16.6" r="1.7"/><circle cx="16.3" cy="16.6" r="1.7"/>',
  chat: '<path d="M20.5 12.3c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.7-.4L4.5 20.5l1.4-3.6A6.8 6.8 0 0 1 3.5 12.3C3.5 8.3 7.3 5.1 12 5.1s8.5 3.2 8.5 7.2Z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  dots: '<circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/>',
  check: '<path d="m5 12.8 4.6 4.4L19 7.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8.5 3.5v3M15.5 3.5v3"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0"/>',
  pin: '<path d="M12 21s6.5-6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15 12 21 12 21Z"/><circle cx="12" cy="10" r="2.5"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20.5 4v4.6H16"/>',
  layers: '<path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z"/><path d="m3.5 12.6 8.5 4.3 8.5-4.3M3.5 16.6l8.5 4.3 8.5-4.3"/>',
  arrow: '<path d="M5 12h13M13 6.5 18.8 12 13 17.5"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.6"/><path d="M8.5 7l1.6-2.5h3.8L15.5 7"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M10.6 18.6h2.8"/>'
};
var FILLED = { star: 1, heart: 1, flag: 1 };
function icoSvg(name) {
  var inner = ICO[name] || ICO.info;
  var fill = FILLED[name] ? 'currentColor' : 'none';
  var stroke = FILLED[name] ? 'none' : 'currentColor';
  return '<svg viewBox="0 0 24 24" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
}
function hydrate(root) {
  root = root || document;
  $$('[data-ico]', root).forEach(function (e) {
    if (e.dataset.done) return;
    e.innerHTML = icoSvg(e.dataset.ico);
    e.dataset.done = '1';
  });
}

/* =========================== UTILIDADES =========================== */
var BBOX = D.bbox;
var CBA = [-31.4201, -64.1888];
function distM(a, b) {
  var R = 6371000, t = Math.PI / 180;
  var dLat = (b[0] - a[0]) * t, dLon = (b[1] - a[1]) * t;
  var x = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(a[0] * t) * Math.cos(b[0] * t) * Math.pow(Math.sin(dLon / 2), 2);
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtMin(m) {
  if (m < 1) return 'ya';
  if (m < 60) return Math.round(m) + ' min';
  return Math.floor(m / 60) + ' h ' + Math.round(m % 60) + ' min';
}
function fmtKm(m) {
  return m < 950 ? Math.round(m) + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
}
function hhmm(d) {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function minsToClock(base, mins) { return hhmm(new Date(base.getTime() + mins * 60000)); }
function etaClass(m) { return m <= 15 ? 'eta-g' : m <= 35 ? 'eta-o' : 'eta-r'; }
function hash(s) {
  s = String(s);
  var h = 0;
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
var store = {
  get: function (k, d) {
    try { var v = localStorage.getItem('bw_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set: function (k, v) { try { localStorage.setItem('bw_' + k, JSON.stringify(v)); } catch (e) {} }
};
function toast(title, text, ico, color) {
  var t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = '<span class="t-ic" style="background:' + (color || 'var(--blue)') + '">' + icoSvg(ico || 'check') + '</span><div><b>' + title + '</b><span>' + (text || '') + '</span></div>';
  $('#toasts').appendChild(t);
  setTimeout(function () {
    t.classList.add('out');
    setTimeout(function () { t.remove(); }, 320);
  }, 3600);
}
function loader(txt, on) {
  if (txt) $('#loaderTxt').textContent = txt;
  $('#loader').classList.toggle('hidden', !on);
}
function emptyHtml(ico, t, s) {
  return '<div class="empty"><div class="e-ic" data-ico="' + ico + '"></div><b>' + t + '</b><span>' + s + '</span></div>';
}

/* =========================== ÍNDICES =========================== */
var routeMeta = {}, cumDist = {}, stopDist = {}, stopRoutes = {}, lineByKey = {};
var CELL = 0.004, stopGrid = new Map();

function buildIndexes() {
  D.lineas.forEach(function (l) {
    l.r.forEach(function (r) {
      routeMeta[r.t] = { l: l, r: r };
      lineByKey[r.t] = l;
    });
  });
  Object.keys(D.traza).forEach(function (k) {
    var t = D.traza[k], c = new Array(t.length), acc = 0;
    for (var i = 0; i < t.length; i++) {
      if (i) acc += distM(t[i - 1], t[i]);
      c[i] = acc;
    }
    cumDist[k] = c;
    stopDist[k] = {};
  });
  D.P.forEach(function (s, i) {
    var k = gk(s.la, s.lo);
    if (!stopGrid.has(k)) stopGrid.set(k, []);
    stopGrid.get(k).push(i);
  });
  Object.keys(D.R).forEach(function (key) {
    var t = D.traza[key];
    if (!t) return;
    D.R[key].forEach(function (si, order) {
      var s = D.P[si], best = 0, bd = Infinity;
      for (var i = 0; i < t.length; i++) {
        var d = distM([s.la, s.lo], [t[i][1], t[i][0]]);
        if (d < bd) { bd = d; best = i; }
      }
      stopDist[key][si] = cumDist[key][best];
      if (!stopRoutes[si]) stopRoutes[si] = [];
      stopRoutes[si].push({ key: key, order: order });
    });
  });
}
function gk(la, lo) { return Math.floor(la / CELL) + '_' + Math.floor(lo / CELL); }
function stopsNear(lat, lon, maxM) {
  var out = [];
  var cl = Math.floor(lat / CELL), co = Math.floor(lon / CELL);
  var rad = Math.max(1, Math.ceil(maxM / (CELL * 111320)));
  for (var a = cl - rad; a <= cl + rad; a++)
    for (var b = co - rad; b <= co + rad; b++) {
      var arr = stopGrid.get(a + '_' + b);
      if (!arr) continue;
      arr.forEach(function (i) {
        var s = D.P[i];
        var d = distM([lat, lon], [s.la, s.lo]);
        if (d <= maxM) out.push({ i: i, d: d });
      });
    }
  return out.sort(function (x, y) { return x.d - y.d; });
}
function pointAt(key, meters) {
  var c = cumDist[key], t = D.traza[key];
  if (!c || !c.length) return null;
  var last = c.length - 1;
  if (meters <= 0) return { lat: t[0][1], lon: t[0][0], ang: bearing(t[0], t[1] || t[0]) };
  if (meters >= c[last]) return { lat: t[last][1], lon: t[last][0], ang: bearing(t[last - 1] || t[0], t[last]) };
  var lo = 0, hi = last;
  while (lo < hi - 1) {
    var mid = (lo + hi) >> 1;
    if (c[mid] <= meters) lo = mid; else hi = mid;
  }
  var f = (meters - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
  return {
    lat: t[lo][1] + (t[hi][1] - t[lo][1]) * f,
    lon: t[lo][0] + (t[hi][0] - t[lo][0]) * f,
    ang: bearing(t[lo], t[hi])
  };
}
function bearing(a, b) {
  var dLon = (b[0] - a[0]) * Math.PI, dLat = (b[1] - a[1]) * Math.PI;
  return (Math.atan2(dLon, dLat) * 180) / Math.PI;
}

/* =========================== MAPA =========================== */
var map, userMarker, layerRoute, layerStops, layerBuses, layerFlags, layerWalk, layerDest, tileLayer;
var tileMode = 'light';
var TILE = {
  light: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri &middot; OpenStreetMap contributors', sub: '' },
  dark: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles &copy; Esri &middot; OpenStreetMap contributors', sub: '' },
  alt: { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap', sub: '' }
};
function addTiles(mode) {
  var cfg = TILE[mode] || TILE.light;
  if (tileLayer) map.removeLayer(tileLayer);
  var fails = 0;
  tileLayer = L.tileLayer(cfg.url, { attribution: cfg.attr, subdomains: cfg.sub, maxZoom: 19 });
  tileLayer.on('tileerror', function () {
    if (++fails === 10 && mode !== 'alt') {
      toast('Usando mapa alternativo', 'No se pudieron cargar los tiles principales', 'map', 'var(--amber)');
      addTiles('alt');
    }
  });
  tileLayer.addTo(map);
}
function initMap() {
  map = L.map('map', { center: CBA, zoom: 13, minZoom: 11, zoomControl: false, attributionControl: false });
  addTiles(tileMode);
  layerRoute = L.layerGroup().addTo(map);
  layerStops = L.layerGroup().addTo(map);
  layerWalk = L.layerGroup().addTo(map);
  layerFlags = L.layerGroup().addTo(map);
  layerDest = L.layerGroup().addTo(map);
  layerBuses = L.layerGroup().addTo(map);
  L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
  map.on('click', hidePopup);
}
function setTileMode(mode) {
  tileMode = mode;
  addTiles(mode);
}
function setUserLocation(lat, lon, animate) {
  if (!inBbox(lat, lon)) return false;
  if (!userMarker) {
    userMarker = L.marker([lat, lon], {
      icon: L.divIcon({ className: 'mk-user', html: '<span class="pulse"></span><span class="dot"></span>', iconSize: [26, 26], iconAnchor: [13, 13] }),
      zIndexOffset: 900, interactive: false
    }).addTo(map);
  } else userMarker.setLatLng([lat, lon]);
  if (animate) map.flyTo([lat, lon], Math.max(map.getZoom(), 15), { duration: 0.9 });
  return true;
}
function inBbox(lat, lon) {
  return lat > BBOX.min_lat - 0.05 && lat < BBOX.max_lat + 0.05 && lon > BBOX.min_lon - 0.05 && lon < BBOX.max_lon + 0.05;
}
function myPos() { return userMarker ? userMarker.getLatLng() : L.latLng(CBA[0], CBA[1]); }
function locateMe() {
  if (!navigator.geolocation) {
    toast('Sin geolocalización', 'Usamos el centro de Córdoba', 'locate', 'var(--amber)');
    setUserLocation(CBA[0], CBA[1]);
    return;
  }
  loader('Ubicándote…', true);
  navigator.geolocation.getCurrentPosition(function (p) {
    loader('', false);
    var ok = setUserLocation(p.coords.latitude, p.coords.longitude);
    if (!ok) toast('Fuera de zona', 'Tu ubicación está fuera del área de Córdoba Capital', 'warn', 'var(--amber)');
    renderNearby(); initSearch();
  }, function () {
    loader('', false);
    toast('No pudimos ubicarte', 'Usamos el centro de la ciudad', 'locate', 'var(--amber)');
    setUserLocation(CBA[0], CBA[1]);
    initSearch();
  }, { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 });
}

/* =========================== SIMULACIÓN DE BONDIS =========================== */
var BUS_MARKERS = false; /* los bondis no se dibujan en el mapa: solo se ve tu punto (siguen simulándose para los arribos) */
var busRoute = null; /* salvo que estés viendo un recorrido: ahí sí se dibujan los bondis de esa línea */
var buses = [], simRoutes = [];
function pickSimRoutes() {
  var used = {}, list = [];
  var order = D.lineas.slice().sort(function (a, b) { return a.n < b.n ? -1 : 1; });
  for (var i = 0; i < order.length; i++) {
    var l = order[i];
    var r = l.r.filter(function (x) { return D.traza[x.t] && D.R[x.t] && D.R[x.t].length > 6; })[0];
    if (r && !used[r.t]) { used[r.t] = 1; list.push(r.t); }
    if (list.length >= 14) break;
  }
  return list;
}
function busGlyph() {
  return '<svg viewBox="0 0 24 24" fill="none"><rect x="6.5" y="3.5" width="11" height="17" rx="4" fill="#fff"/><rect x="8.4" y="6" width="7.2" height="4.6" rx="2" fill="rgba(0,0,0,.38)"/><rect x="8.4" y="12.6" width="7.2" height="5" rx="2" fill="rgba(0,0,0,.24)"/><circle cx="8.6" cy="18.6" r="1.1" fill="rgba(0,0,0,.45)"/><circle cx="15.4" cy="18.6" r="1.1" fill="rgba(0,0,0,.45)"/></svg>';
}
function spawnBus(key, dist) {
  var meta = routeMeta[key];
  var len = cumDist[key][cumDist[key].length - 1];
  var speed = (17 + (hash(key + '|' + Math.round(dist)) % 9)) / 3.6;
  var el = L.marker([0, 0], {
    icon: L.divIcon({
      className: 'mk-bus',
      html: '<span class="bwrap" style="background:' + meta.l.c + '"><span class="rot">' + busGlyph() + '</span></span><span class="blabel">' + meta.l.n + '</span><span class="dem"></span>',
      iconSize: [34, 34], iconAnchor: [17, 17]
    }),
    zIndexOffset: 500
  });
  if (BUS_MARKERS || (busRoute && key === busRoute)) el.addTo(layerBuses);
  var b = { key: key, dist: dist % len, speed: speed, len: len, el: el, coche: 1000 + (hash(key + dist) % 899), dem: '' };
  buses.push(b);
  return b;
}
/* muestra/oculta los bondis según el recorrido que estás viendo */
function syncBusLayer() {
  buses.forEach(function (b) {
    var show = !!BUS_MARKERS || (busRoute && b.key === busRoute);
    var on = layerBuses.hasLayer(b.el);
    if (show && !on) b.el.addTo(layerBuses);
    else if (!show && on) layerBuses.removeLayer(b.el);
  });
}
function startSim() {
  simRoutes = pickSimRoutes();
  simRoutes.forEach(function (k) {
    var len = cumDist[k][cumDist[k].length - 1];
    var n = 3 + (hash(k) % 3);
    for (var i = 0; i < n; i++) spawnBus(k, (len / n) * i + (hash(k + i) % 300));
  });
  setInterval(tickBuses, 650);
  tickBuses();
}
function ensureBuses(key) {
  if (!key || !cumDist[key] || !cumDist[key].length) return;
  if (busesOn(key).length) return;
  var len = cumDist[key][cumDist[key].length - 1];
  for (var i = 0; i < 3; i++) spawnBus(key, (len / 3) * i + (hash(key + i) % 240));
}
function demColor(d) { return d === 'eta-g' ? '#12A05A' : d === 'eta-o' ? '#D97100' : '#E23B3B'; }
function tickBuses() {
  buses.forEach(function (b) {
    b.dist += b.speed * 1.15;
    if (b.dist > b.len) b.dist -= b.len;
    var p = pointAt(b.key, b.dist);
    if (!p) return;
    b.el.setLatLng([p.lat, p.lon]);
    var el = b.el.getElement();
    if (!el) return;
    var rot = el.querySelector('.rot');
    if (rot) rot.style.transform = 'rotate(' + p.ang + 'deg)';
    var dem = el.querySelector('.dem');
    if (dem && dem.textContent !== (b.dem || '')) {
      dem.textContent = b.dem || '';
      dem.style.display = b.dem ? 'block' : 'none';
      dem.style.background = b.dem ? demColor(etaClass(parseInt(b.dem, 10) || 99)) : 'transparent';
    }
  });
  if (activeKey || (typeof etaSubs !== 'undefined' && etaSubs.length)) refreshBusDemoras();
}
function busesOn(key) { return buses.filter(function (b) { return b.key === key; }); }
function nextArrival(key, stopIdx) {
  var sd = stopDist[key] && stopDist[key][stopIdx];
  if (sd == null) return null;
  var best = null;
  busesOn(key).forEach(function (b) {
    var wait = b.dist <= sd ? b.len - b.dist + sd : sd - b.dist;
    var min = wait / b.speed / 60;
    if (!best || min < best.min) best = { min: min, coche: b.coche, real: true };
  });
  if (best) return best;
  return synthArrival(key, stopIdx);
}
function synthArrival(key, stopIdx) {
  var hk = D.H && D.H[key + '_' + D.P[stopIdx].k];
  var now = new Date();
  var nowM = now.getHours() * 60 + now.getMinutes();
  if (hk && hk.length) {
    var day = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sa'][now.getDay()];
    var times = [];
    hk.forEach(function (g) { if (g[0].split(',').indexOf(day) >= 0) times = g[1]; });
    if (times.length) {
      if (nowM < times[0]) return { min: times[0] - nowM, real: true };
      if (nowM > times[times.length - 1]) return null;
      for (var i = 0; i < times.length; i++) if (times[i] > nowM) return { min: times[i] - nowM, real: true };
      return null;
    }
  }
  if (now.getHours() < 5 || now.getHours() > 23) return null;
  var freq = 9 + (hash(key) % 10);
  var phase = (nowM + hash(key + stopIdx)) % freq;
  return { min: phase === 0 ? freq : freq - phase, real: false };
}
