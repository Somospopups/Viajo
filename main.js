/* Bondi · páginas, menú, reportes y arranque */
'use strict';

var LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="bw-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FDBFF"/><stop offset="1" stop-color="#22BEF2"/></linearGradient></defs><rect x="14" y="16" width="100" height="84" rx="26" fill="url(#bw-g)"/><rect x="27" y="30" width="74" height="40" rx="18" fill="#EAFBFF"/><circle cx="47" cy="49" r="7.5" fill="#12212E"/><circle cx="81" cy="49" r="7.5" fill="#12212E"/><circle cx="49.5" cy="46.5" r="2.4" fill="#fff"/><circle cx="83.5" cy="46.5" r="2.4" fill="#fff"/><path d="M48 80 Q64 94 80 80" stroke="#0C2B3B" stroke-width="7" stroke-linecap="round" fill="none"/><rect x="24" y="96" width="26" height="16" rx="8" fill="#12212E"/><rect x="78" y="96" width="26" height="16" rx="8" fill="#12212E"/><rect x="16" y="44" width="8" height="20" rx="4" fill="#0C2B3B" opacity=".35"/><rect x="104" y="44" width="8" height="20" rx="4" fill="#0C2B3B" opacity=".35"/></svg>';
var AVA_SVG = '<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#33CCFF"/><circle cx="32" cy="25" r="11" fill="#fff"/><path d="M11 57c2.6-11.4 11-17 21-17s18.4 5.6 21 17" fill="#fff"/></svg>';

/* =========================== OVERLAYS =========================== */
function closeExit() {
  var m = $('#exitModal');
  if (m && !m.classList.contains('hidden')) m.classList.add('hidden');
}
function openSheet(id) {
  closeExit();
  $('#' + id.replace('Sheet', 'Overlay')).classList.remove('hidden');
  $('#' + id).classList.remove('hidden');
}
function closeSheet(id) {
  $('#' + id.replace('Sheet', 'Overlay')).classList.add('hidden');
  $('#' + id).classList.add('hidden');
}
function openModal(id) { if (id !== 'exitModal') closeExit(); $('#' + id).classList.remove('hidden'); }
function closeModal(id) { $('#' + id).classList.add('hidden'); }

/* =========================== PÁGINAS =========================== */
var pageOpen = false;
function openPage(key, title) {
  var build = PAGES[key];
  if (!build) return;
  closeExit();
  $('#pageTitle').textContent = title || (build.title || '');
  $('#pageBody').innerHTML = build.html();
  $('#pageBody').scrollTop = 0;
  hydrate($('#page'));
  if (build.after) build.after();
  $('#page').classList.remove('hidden');
  $('#page').classList.remove('out');
  pageOpen = true;
}
function closePage() {
  if (!pageOpen) return;
  var p = $('#page');
  p.classList.add('out');
  pageOpen = false;
  setTimeout(function () { p.classList.add('hidden'); p.classList.remove('out'); }, 260);
}
function hero(ico, t, s) {
  return '<div class="p-hero"><span class="ph-ico">' + icoSvg(ico) + '</span><div><h3>' + t + '</h3><p>' + s + '</p></div></div>';
}
function pItem(ico, t, s, m) {
  return '<div class="p-item"><span class="pi-ico">' + icoSvg(ico) + '</span><div><b>' + t + '</b><span>' + s + '</span></div>' + (m ? '<span class="pi-m">' + m + '</span>' : '') + '</div>';
}
function sw(id, label, sub, on) {
  return '<div class="p-item"><span class="pi-ico">' + icoSvg('bell') + '</span><div><b>' + label + '</b><span>' + sub + '</span></div>' +
    '<label class="switch" style="margin-left:auto"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span class="track"><span class="knob"></span></span></label></div>';
}
var PAGES = {
  howto: {
    title: 'Cómo funciona',
    html: function () {
      return hero('info', 'Bondi en 4 pasos', 'Planificá, seguí y reportá tu viaje en bondi') +
        '<div class="p-sec"><h4>Empezá por acá</h4><div class="steps">' +
        '<div class="step-card"><span class="n">1</span><div><b>Buscá tu línea</b><p>Tocá “Líneas” y filtrá por número o destino. Guardá tus favoritas con la estrella.</p></div></div>' +
        '<div class="step-card"><span class="n">2</span><div><b>Mirá los próximos arribos</b><p>Cada parada te muestra cuánto falta para la próxima unidad con el diagrama de operación.</p></div></div>' +
        '<div class="step-card"><span class="n">3</span><div><b>Planeá A → B</b><p>Decinos desde dónde salís y a dónde vas: te damos opciones con caminata, bondi y combinaciones.</p></div></div>' +
        '<div class="step-card"><span class="n">4</span><div><b>Reportá y ayudá a todos</b><p>Pozos, cortes, controles: tus reportes aparecen en el mapa para toda la comunidad.</p></div></div>' +
        '</div></div>' +
        '<div class="p-sec"><h4>Truco</h4><div class="card"><p class="muted">Deslizá el panel hacia arriba para verlo completo, o usá el botón de la barra superior para volver al mapa.</p></div></div>';
    }
  },
  sube: {
    title: 'Recarga SUBE',
    html: function () {
      return hero('card', 'Puntos de recarga SUBE', 'Recargá tu tarjeta para subirte a los bondis del sistema') +
        '<div class="p-sec"><h4>Dónde recargar</h4><div class="p-list">' +
        pItem('store', 'Comercios adheridos', 'Quioscos, loterías y locales habilitados en toda la ciudad.') +
        pItem('grid', 'Centros de atención', 'Puntos de venta oficiales del sistema SUBE.') +
        pItem('phone', 'App y bancos', 'Desde la app SUBE o los bancos adheridos a la recarga online.') +
        '</div></div>' +
        '<div class="p-sec"><h4>Consejos</h4><div class="card"><p class="muted">Consultá el saldo antes de subirte, respetá los horarios de cada línea y guardá la tarjeta en un mismo lugar para no perderla. Los valores y horarios oficiales los publica el municipio y TU BONDI.</p></div></div>' +
        '<div class="line-actions"><a class="btn primary" style="text-decoration:none" href="https://micronauta4.dnsalias.net/web/urbano/?conf=cbaciudad" target="_blank" rel="noopener">' + icoSvg('arrow') + 'Ver info oficial</a></div>';
    }
  },
  bici: {
    title: 'BiciCba',
    html: function () {
      return hero('bike', 'BiciCba', 'La bicicleta pública de la ciudad, para llegar donde el bondi no llega') +
        '<div class="p-sec"><h4>Estaciones · bicis disponibles</h4>' +
        '<div class="bici-sum"><div class="bs-t"><b id="biciTot">Cargando…</b><span id="biciSub">Disponibilidad de BiciCba</span></div>' +
        '<button class="bi-refresh" id="biciRefresh" type="button">' + icoSvg('refresh') + 'Actualizar</button></div>' +
        '<div class="bici-list" id="biciList"></div>' +
        '<div class="bici-foot" id="biciFoot"></div></div>' +
        '<div class="p-sec"><h4>Cómo usarla</h4><div class="p-list">' +
        pItem('card', 'Sacá tu tarjeta', 'Acreditá tu documento en el centro de atención y activá el servicio.') +
        pItem('pin', 'Encontrá una estación', 'Tocá la estación para verla en el mapa y marcarla como destino.') +
        pItem('clock', 'Horarios', 'Cada estación muestra su horario de lunes a viernes y de fines de semana.') +
        '</div></div>' +
        '<div class="p-sec"><h4>Combiná</h4><div class="card"><p class="muted">Muchas líneas de bondi tienen estaciones de BiciCba cerca de sus paradas: usalas para resolver la “última milla”.</p></div></div>';
    },
    after: function () {
      renderBici();
      var b = $('#biciRefresh');
      if (b) b.addEventListener('click', function () {
        if (b.classList.contains('busy')) return;
        b.classList.add('busy');
        b.innerHTML = icoSvg('refresh') + 'Actualizando…';
        biciLive(function (ok, why) {
          b.classList.remove('busy');
          b.innerHTML = icoSvg('refresh') + 'Actualizar';
          renderBici();
          if (ok && why === 'vivo') toast('Disponibilidad al día', 'Datos en vivo de BiciCba', 'check', 'var(--green)');
          else toast('Sin conexión en vivo', 'Se muestran los últimos datos de BiciCba', 'warn', 'var(--amber)');
        }, true);
      });
      biciLive(function () { renderBici(); });
    }
  },
  notif: {
    title: 'Notificaciones',
    html: function () {
      return hero('bell', 'Notificaciones', 'Elegí qué querés que te avisemos') +
        '<div class="p-sec"><h4>Tus avisos</h4><div class="p-list">' +
        sw('n1', 'Próximos arribos', 'Avisarte cuando tu bondi esté por pasar por tu parada.', true) +
        sw('n2', 'Alertas en tu zona', 'Accidentes, cortes y control cerca tuyo.', true) +
        sw('n3', 'Novedades de líneas', 'Cambios de recorrido y horarios especiales.', false) +
        sw('n4', 'Resumen diario', 'Un mensaje por la mañana con tus líneas.', false) +
        '</div></div>';
    }
  },
  rate: {
    title: 'Calificar',
    html: function () {
      return hero('star', '¿Qué te pareció?', 'Tu opinión nos ayuda a mejorar Bondi') +
        '<div class="card"><div class="stars" id="rateStars">' +
        [1, 2, 3, 4, 5].map(function (i) { return '<button type="button" data-star="' + i + '">' + icoSvg('star') + '</button>'; }).join('') +
        '</div><p class="muted" style="text-align:center" id="rateTxt">Tocá las estrellas</p>' +
        '<label class="lb">Contanos más (opcional)</label><textarea class="field" placeholder="¿Qué podríamos mejorar?"></textarea>' +
        '<button class="btn primary big" id="btnRateSend" style="margin-top:12px">Enviar calificación</button></div>';
    },
    after: function () {
      var n = 0;
      $('#rateStars').addEventListener('click', function (e) {
        var b = e.target.closest('[data-star]');
        if (!b) return;
        n = parseInt(b.dataset.star, 10);
        $$('#rateStars button').forEach(function (x, i) { x.classList.toggle('on', i < n); });
        $('#rateTxt').textContent = ['', 'Malísimo', 'Podría mejorar', 'Bien', 'Muy bueno', '¡Excelente!'][n];
      });
      $('#btnRateSend').addEventListener('click', function () {
        if (!n) { toast('Faltan estrellas', 'Tocá una calificación primero', 'star', 'var(--amber)'); return; }
        closePage();
        toast('¡Gracias!', 'Recibimos tu calificación de ' + n + ' estrella' + (n > 1 ? 's' : ''), 'star', 'var(--amber)');
      });
    }
  },
  install: {
    title: 'Instalar',
    html: function () {
      return hero('download', 'Instalar Bondi', 'Sumalo a tu pantalla de inicio y usalo como una app') +
        '<div class="p-sec"><h4>En Android (Chrome)</h4><div class="card"><p class="muted">Menú ⋮ → “Agregar a pantalla de inicio” → “Instalar”.</p></div></div>' +
        '<div class="p-sec"><h4>En iPhone (Safari)</h4><div class="card"><p class="muted">Botón de compartir → “Agregar a pantalla de inicio”.</p></div></div>' +
        '<div class="p-sec"><h4>En escritorio</h4><div class="card"><p class="muted">Chrome/Edge: ícono de instalar en la barra de direcciones. Guardá el ícono en tus favoritos para abrirlo siempre.</p></div></div>' +
        '<div class="p-sec"><div class="tag">' + icoSvg('check') + ' Funciona sin instalar nada más</div></div>';
    }
  },
  about: {
    title: 'Acerca de',
    html: function () {
      return hero('bus', 'Bondi ' + APP_VERSION, 'Transporte público de Córdoba Capital') +
        '<div class="p-sec"><h4>Sobre la app</h4><div class="p-list">' +
        pItem('map', 'Mapa y comunidad', 'Reportes, alertas y tráfico de la comunidad para que viajes mejor.') +
        pItem('bus', 'Datos de líneas', 'Recorridos, paradas y horarios provistos por TU BONDI Córdoba.') +
        pItem('info', 'Tiempos de llegada', 'Combinamos el diagrama de operación con la posición de las unidades.') +
        '</div></div>' +
        '<div class="p-sec"><h4>Transparencia</h4><div class="card"><p class="muted">Las posiciones de los bondis se simulan sobre los recorridos oficiales para este prototipo; los horarios y paradas sí corresponden al sistema real de la ciudad.</p></div></div>' +
        '<div class="menu-foot" style="border:0">Versión ' + APP_VERSION + ' · Córdoba Capital, Argentina</div>';
    }
  },
  social: {
    title: 'Redes sociales',
    html: function () {
      return hero('like', 'Seguinos', 'Novedades, cambios de recorrido y concursos') +
        '<div class="p-sec"><div class="p-list">' +
        pItem('chat', 'Comunidad Bondi', 'Contanos tu viaje y reportá mejoras.') +
        pItem('share', 'Compartir la app', 'Mandásela a quien viaja en bondi todos los días.') +
        '</div></div>' +
        '<div class="line-actions"><button class="btn primary" id="btnShareApp">' + icoSvg('share') + 'Compartir app</button>' +
        '<button class="btn ghost" id="btnCopyLink">' + icoSvg('grid') + 'Copiar enlace</button></div>';
    },
    after: function () {
      $('#btnShareApp').addEventListener('click', shareApp);
      $('#btnCopyLink').addEventListener('click', function () { copy(location.href); toast('Enlace copiado', 'Pegalo donde quieras', 'check', 'var(--green)'); });
    }
  },
  sched: {
    title: 'Horarios',
    html: function () {
      return hero('clock', 'Horarios de servicio', 'Salidas programadas por día y parada') +
        '<label class="lb">Elegí línea y parada</label>' +
        '<select class="field" id="schSel"></select>' +
        '<div id="schBox" style="margin-top:14px"></div>';
    },
    after: function () {
      var keys = Object.keys(D.H);
      $('#schSel').innerHTML = keys.map(function (k) {
        var cut = k.lastIndexOf('_');
        var rk = k.substring(0, cut), code = k.substring(cut + 1);
        var l = lineByKey[rk];
        var stop = D.P.filter(function (p) { return p.k === code; })[0];
        return '<option value="' + k + '">' + (l ? l.n : rk.split('_')[0]) + ' · ' + (stop ? stop.n : code) + '</option>';
      }).join('');
      $('#schSel').addEventListener('change', function () { renderSched(this.value); });
      renderSched(keys[0]);
    }
  }
};
var DAY_LBL = { lu: 'Lun', ma: 'Mar', mi: 'Mié', ju: 'Jue', vi: 'Vie', sa: 'Sáb', do: 'Dom', fe: 'Feriados' };
function renderSched(key) {
  var groups = D.H[key] || [];
  var now = new Date();
  var nowM = now.getHours() * 60 + now.getMinutes();
  var html = '<div class="sch-tabs" id="schTabs">' + groups.map(function (g, i) {
    return '<button class="sch-tab' + (i === 0 ? ' on' : '') + '" data-day="' + i + '">' +
      g[0].split(',').map(function (d) { return DAY_LBL[d] || d; }).join(', ') + '</button>';
  }).join('') + '</div><div id="schTimes"></div>';
  $('#schBox').innerHTML = html;
  function paint(i) {
    var g = groups[i];
    if (!g) { $('#schTimes').innerHTML = '<div class="sch-empty">Sin datos para este día</div>'; return; }
    var nextIdx = -1;
    for (var j = 0; j < g[1].length; j++) if (g[1][j] > nowM) { nextIdx = j; break; }
    $('#schTimes').innerHTML = '<div class="sch-times">' + g[1].map(function (m, j) {
      var cls = j === nextIdx ? ' now' : (m < nowM ? ' past' : '');
      return '<span class="sch-time' + cls + '">' + String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') + '</span>';
    }).join('') + '</div><p class="muted" style="margin-top:12px">La próxima salida está resaltada. *Horarios de referencia del día seleccionado.</p>';
  }
  paint(0);
  $('#schTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-day]');
    if (!b) return;
    $$('#schTabs .sch-tab').forEach(function (x) { x.classList.toggle('on', x === b); });
    paint(parseInt(b.dataset.day, 10));
  });
}
function openSchedFor(key) {
  openPage('sched', 'Horarios');
  setTimeout(function () {
    var hk = Object.keys(D.H).filter(function (k) { return k.indexOf(key + '_') === 0; })[0];
    if (hk && $('#schSel')) { $('#schSel').value = hk; renderSched(hk); }
  }, 30);
}
function shareApp() {
  var data = { title: 'Bondi', text: 'Transporte público de Córdoba Capital', url: location.href };
  if (navigator.share) navigator.share(data).catch(function () {});
  else copy(location.href) || toast('Enlace copiado', 'Listo para compartir', 'share', 'var(--blue)');
}
function copy(txt) {
  try {
    if (navigator.clipboard) { navigator.clipboard.writeText(txt); return true; }
    var ta = document.createElement('textarea');
    ta.value = txt; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    return true;
  } catch (e) { return false; }
}

/* =========================== FAVORITOS / CUENTA =========================== */
function toggleFav(id) {
  var favs = store.get('favLines', []);
  var i = favs.indexOf(id);
  var l = D.lineas.filter(function (x) { return x.i === id; })[0];
  if (i >= 0) { favs.splice(i, 1); toast('Quitado de favoritos', l ? 'Línea ' + l.n : '', 'star', 'var(--muted)'); }
  else { favs.push(id); toast('Guardado en favoritos', l ? 'Línea ' + l.n + ' siempre a mano' : '', 'star', 'var(--amber)'); }
  store.set('favLines', favs);
  if (activeLine && activeLine.i === id) $('#lhFav').classList.toggle('on', favs.indexOf(id) >= 0);
  if (!$('#lineStrip').classList.contains('hidden')) renderLineStrip();
  renderLineCard();
  if (!$('#v-fav').classList.contains('hidden')) renderFav();
}
function setAccount(name, mail, logged) {
  $('#profileName').textContent = name;
  $('#profileMail').textContent = mail;
  $('#btnLogin').textContent = logged ? 'Sincronizado' : 'Ingresar';
  $('#profileAva').innerHTML = AVA_SVG;
}

/* =========================== UBICACIONES RÁPIDAS (CASA / TRABAJO / +) =========================== */
var spotKey = null, spotSel = null;
var SPOT_TITLES = { casa: 'Elegí tu Casa', trabajo: 'Elegí tu Trabajo', add: 'Agregar lugar' };
function spotPool() {
  var seen = {}, out = [];
  PLACES.concat(store.get('recents', [])).forEach(function (p) {
    if (p && p.n && !seen[p.n]) { seen[p.n] = 1; out.push(p); }
  });
  return out;
}
function renderSpotList(q) {
  q = (q || '').toLowerCase().trim();
  var pool = spotPool();
  if (q) pool = pool.filter(function (p) { return p.n.toLowerCase().indexOf(q) >= 0; });
  $('#spotList').innerHTML = pool.slice(0, 14).map(function (p) {
    var on = spotSel && spotSel.n === p.n;
    return '<div class="row' + (on ? ' sel' : '') + '" data-spotpick="' + encodeURIComponent(p.n) + '|' + p.la + '|' + p.lo + '">' +
      '<div class="r-ico">' + icoSvg('pin') + '</div><div class="r-t"><b>' + p.n + '</b><span>Córdoba Capital</span></div>' +
      '<span class="ico chev" data-ico="chevron"></span></div>';
  }).join('') || '<div class="empty"><b>Sin resultados</b><span>Probá con otra palabra</span></div>';
  hydrate($('#spotList'));
}
function openSpotPicker(key) {
  spotKey = key;
  spotSel = null;
  $('#spotTitle').textContent = SPOT_TITLES[key] || 'Elegir lugar';
  var cur = key === 'add' ? null : store.get('place_' + key, null);
  $('#spotSub').textContent = cur ? 'Ahora: ' + cur.n : (key === 'add' ? 'Se suma a "Destinos guardados"' : 'Se usa en la búsqueda rápida');
  $('#spotInput').value = '';
  renderSpotList('');
  openModal('spotModal');
}
function saveSpot() {
  if (!spotSel) { toast('Elegí un lugar', 'Tocá una opción de la lista', 'pin', 'var(--amber)'); return; }
  if (spotKey === 'casa' || spotKey === 'trabajo') store.set('place_' + spotKey, spotSel);
  else {
    var places = store.get('favPlaces', []).filter(function (p) { return p.n !== spotSel.n; });
    places.push({ n: spotSel.n, la: spotSel.la, lo: spotSel.lo });
    store.set('favPlaces', places);
  }
  closeModal('spotModal');
  renderFav();
  renderSearchList();
  toast('Guardado', spotSel.n, 'check', 'var(--green)');
}

/* =========================== REPORTAR =========================== */
function buildReportGrid() {
  $('#repGrid').innerHTML = ALERT_TYPES.map(function (t) {
    return '<button class="rep-item" type="button" data-rep="' + t.id + '"><span class="ri" style="background:' + t.bg + '">' + icoSvg(t.ico) + '</span><b>' + t.t + '</b></button>';
  }).join('');
}

/* =========================== BÚSQUEDA DE DIRECCIONES (online + local) =========================== */
var geoT = null, geoQ = '', geoState = 'idle', geoList = [], searchTarget = 'b';
function setGeoStatus(txt) {
  var el = $('#geoStatus');
  if (!el) return;
  el.classList.toggle('hidden', !txt);
  if (txt) $('#geoStatusTxt').textContent = txt;
}
function renderSuggest() {
  var box = $('#searchList');
  if (!box) return;
  box.classList.remove('hidden');
  var local = geoQ ? localSearch(geoQ) : [];
  var html = local.map(function (p) { return searchRow(p, p.n, 'pin'); }).join('');
  if (geoList.length) {
    html += '<div class="sec-h geo-h"><h4>Direcciones en Córdoba</h4></div>' +
      geoList.map(function (p) { return searchRow(p, p.n, 'pin', p.sub); }).join('');
  }
  if (!html) {
    html = geoState === 'loading' ? emptyHtml('pin', 'Buscando direcciones…', 'Escribí la calle y la altura')
      : geoState === 'error' ? emptyHtml('warn', 'Sin conexión', 'No pudimos buscar ahora. Probá de nuevo en unos segundos.')
        : emptyHtml('pin', 'Sin coincidencias', 'Seguí escribiendo: buscamos direcciones en Córdoba');
  }
  box.innerHTML = html;
  hydrate(box);
}
function onGeoInput(which) {
  var inp = $('#inp' + which.toUpperCase());
  return function () {
    searchTarget = which;
    var q = (inp.value || '').toLowerCase().trim();
    $('[data-clear="' + which + '"]').classList.toggle('on', !!inp.value);
    if (which === 'b') { pts.b = null; setDestPin(null); }
    else pts.a = null;
    clearTimeout(geoT);
    $('#searchResults').classList.add('hidden');
    $('#quickPlaces').classList.toggle('hidden', !!q);
    geoQ = q;
    geoList = [];
    if (q.length < 2) {
      geoState = 'idle';
      setGeoStatus('');
      $('#searchListTitle').classList.remove('hidden');
      renderSearchList();
      return;
    }
    $('#searchListTitle').classList.add('hidden');
    geoState = 'loading';
    setGeoStatus('Buscando direcciones…');
    renderSuggest();
    geoT = setTimeout(function () {
      var now = (inp.value || '').toLowerCase().trim();
      if (now !== geoQ) return;
      geocodeEx(geoQ).then(function (r) {
        if (((inp.value || '').toLowerCase().trim()) !== geoQ) return;
        geoList = r.list;
        geoState = r.list.length ? 'ok' : (r.err ? 'error' : 'empty');
        setGeoStatus('');
        renderSuggest();
      }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        if (((inp.value || '').toLowerCase().trim()) !== geoQ) return;
        geoList = [];
        geoState = 'error';
        setGeoStatus('');
        renderSuggest();
        toast('Sin conexión', 'No pudimos buscar direcciones', 'warn', 'var(--red)');
      });
    }, 380);
  };
}

/* =========================== EVENTOS =========================== */
function wire() {
  document.addEventListener('click', function (e) {
    var sel = ['[data-fav]', '[data-pop]', '[data-confirm]', '[data-dismiss]', '[data-navto]', '[data-clear]', '[data-place]', '[data-pick]', '[data-rep]', '[data-opt]', '[data-goto]', '[data-alert]', '[data-stop]', '[data-line]', '[data-open]', '[data-nav]', '[data-seg]', '[data-close-modal]', '[data-spot]', '[data-spotpick]', '[data-strip]', '[data-dir]', '[data-bici]'];
    for (var i = 0; i < sel.length; i++) {
      var el = e.target.closest(sel[i]);
      if (!el) continue;
      var k = sel[i].slice(6, -1);
      switch (k) {
        case 'fav': e.stopPropagation(); toggleFav(el.dataset.fav); return;
        case 'pop': hidePopup(); return;
        case 'confirm': toast('Gracias', 'Confirmaste este reporte', 'check', 'var(--green)'); removeAlert(parseInt(el.dataset.confirm, 10)); hidePopup(); return;
        case 'dismiss': removeAlert(parseInt(el.dataset.dismiss, 10)); hidePopup(); toast('Descartado', 'Se quitó del mapa', 'check', 'var(--muted)'); return;
        case 'navto': {
          var si = parseInt(el.dataset.navto, 10);
          hidePopup();
          pts.b = { n: D.P[si].n, la: D.P[si].la, lo: D.P[si].lo };
          $('#inpB').value = D.P[si].n;
          setDestPin(pts.b);
          openView('v-search');
          doSearch();
          return;
        }
        case 'clear': {
          var kk = el.dataset.clear;
          $('#inp' + kk.toUpperCase()).value = '';
          pts[kk] = null;
          el.classList.remove('on');
          if (kk === 'b') { setDestPin(null); $('#searchResults').classList.add('hidden'); $('#searchListTitle').classList.remove('hidden'); $('#searchList').classList.remove('hidden'); $('#quickPlaces').classList.remove('hidden'); }
          return;
        }
        case 'place': return quickPlace(el.dataset.place);
        case 'pick': {
          var parts = decodeURIComponent(el.dataset.pick).split('|');
          var tgt = (el.dataset.tgt || searchTarget || 'b').toUpperCase();
          var pk = { n: parts[0], la: parseFloat(parts[1]), lo: parseFloat(parts[2]) };
          $('#inp' + tgt).value = parts[0];
          pts[tgt.toLowerCase()] = pk;
          $('[data-clear="' + tgt.toLowerCase() + '"]').classList.add('on');
          if (tgt === 'B') setDestPin(pk);
          hidePopup();
          return;
        }
        case 'rep': {
          var pos = myPos();
          var a = addAlert(el.dataset.rep, pos.lat, pos.lng);
          closeSheet('reportSheet');
          push('Reporte enviado', a.t + ' en tu ubicación. ¡Gracias por ayudar a la comunidad!');
          toast('Reporte publicado', a.t, a.ico, a.bg);
          return;
        }
        case 'opt': return startTrip(planOptions[parseInt(el.dataset.opt, 10)]);
        case 'goto': {
          var g = el.dataset.goto.split('|');
          pts.b = { n: g[0], la: parseFloat(g[1]), lo: parseFloat(g[2]) };
          $('#inpB').value = g[0];
          setDestPin(pts.b);
          openView('v-search');
          doSearch();
          return;
        }
        case 'alert': {
          var al = ALERTS.filter(function (x) { return x.id === parseInt(el.dataset.alert, 10); })[0];
          if (al) { map.flyTo([al.lat, al.lon], 16); showPopup([al.lat, al.lon], popupAlert(al)); }
          return;
        }
        case 'stop': hidePopup(); openStopView(parseInt(el.dataset.stop, 10)); return;
        case 'line': openLine(el.dataset.line); return;
        case 'open': return dataOpen(el.dataset.open);
        case 'nav': return dataNav(el.dataset.nav);
        case 'spot': return openSpotPicker(el.dataset.spot);
        case 'spotpick': {
          var sp = decodeURIComponent(el.dataset.spotpick).split('|');
          spotSel = { n: sp[0], la: parseFloat(sp[1]), lo: parseFloat(sp[2]) };
          renderSpotList($('#spotInput').value);
          return;
        }
        case 'seg': activeRoute = parseInt(el.dataset.seg, 10); renderLineDetail(); return;
        case 'close-modal': closeModal(el.dataset.closeModal); return;
        case 'strip': return openDirModal(el.dataset.strip);
        case 'dir': return chooseRoute(parseInt(el.dataset.dir, 10));
        case 'bici': return openBiciOnMap(parseInt(el.dataset.bici, 10));
      }
    }
  });

  $('#searchPill').addEventListener('click', function () { openView('v-search'); });
  $('#btnProfile').addEventListener('click', function () { openSheet('menuSheet'); });
  $('#btnLocate').addEventListener('click', locateMe);
  $('#btnFav').addEventListener('click', function () { openView('v-fav'); });
  $('#reportFab').addEventListener('click', function () { openSheet('reportSheet'); });
  $('#linesFab').addEventListener('click', function () { toggleStrip(); });
  $('#stripClose').addEventListener('click', function () { toggleStrip(false); });
  $('#dirCancel').addEventListener('click', function () { closeModal('dirModal'); });
  $('#dirFlip').addEventListener('click', flipSense);
  $('#dirSense').addEventListener('click', function () { chooseRoute(activeRoute); });
  $('#dirGo').addEventListener('click', function () { chooseRoute(activeRoute); });
  $('#lcClose').addEventListener('click', closeLineCard);
  $('#lcStops').addEventListener('click', function () {
    if (!activeLine) return;
    openView('v-line');
    renderLineDetail();
  });
  $('#lcSched').addEventListener('click', function () { if (activeKey) openSchedFor(activeKey); });
  $('#lcFav').addEventListener('click', function () { if (activeLine) toggleFav(activeLine.i); });
  $('#lcWatch').addEventListener('click', function () {
    if (!activeKey) return;
    var si = nearestStopOnRoute(activeKey);
    if (si == null) { toast('Sin paradas', 'No encontramos paradas en este recorrido', 'warn', 'var(--amber)'); return; }
    var on = !(watch && watch.key === activeKey);
    if (on) startWatch(activeKey, si);
    else stopWatch();
    syncWatchUI();
    if (on) hideLineCard();
  });
  $('#btnWatchStop').addEventListener('click', function () {
    var routes = (stopRoutes[currentStop] || []).slice();
    if (!routes.length) { toast('Sin líneas', 'Esta parada no tiene recorridos cargados', 'warn', 'var(--amber)'); return; }
    routes.sort(function (a, b) {
      var aa = nextArrival(a.key, currentStop), bb = nextArrival(b.key, currentStop);
      return (aa ? aa.min : 999) - (bb ? bb.min : 999);
    });
    if (watch && watch.si === currentStop) { stopWatch(); return; }
    startWatch(routes[0].key, currentStop);
    syncWatchUI();
  });
  $('#btnPickMap').addEventListener('click', function () {
    backToMap();
    setPickMode(true);
    toast('Tocá el mapa', 'Mantené apretado o tocá para fijar tu destino', 'pin', 'var(--red)');
  });
  $('#pickCancel').addEventListener('click', function () { setPickMode(false); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('#watchClose')) stopWatch();
  });
  $('#panelBack').addEventListener('click', function () { backView(); });
  $('#spotInput').addEventListener('input', function () { spotSel = null; renderSpotList(this.value); });
  $('#spotSave').addEventListener('click', saveSpot);
  $('#spotCancel').addEventListener('click', function () { closeModal('spotModal'); });
  $('#btnAlerts').addEventListener('click', function () {
    if (!ALERTS.length) { toast('Sin alertas', 'No hay reportes activos', 'bell', 'var(--green)'); return; }
    var b = L.latLngBounds(ALERTS.map(function (a) { return [a.lat, a.lon]; }));
    map.fitBounds(b, { padding: [70, 70] });
    toast(ALERTS.length + ' alertas en el mapa', 'Tocá un ícono para confirmarla', 'bell', 'var(--red)');
  });
  $('#btnDoSearch').addEventListener('click', doSearch);
  $('#btnSwap').addEventListener('click', function () {
    var a = $('#inpA').value, b = $('#inpB').value;
    $('#inpA').value = b; $('#inpB').value = a;
    var pa = pts.a; pts.a = pts.b; pts.b = pa;
    setDestPin(pts.b);
  });
  $('#inpB').addEventListener('input', onGeoInput('b'));
  $('#inpA').addEventListener('input', onGeoInput('a'));
  $('#inpA').addEventListener('focus', function () {
    searchTarget = 'a';
    if (!pts.a) { this.value = ''; $('[data-clear="a"]').classList.remove('on'); }
    else this.select();
  });
  $('#inpB').addEventListener('focus', function () { searchTarget = 'b'; });
  $('#inpA').addEventListener('blur', function () {
    if (!pts.a && !(this.value || '').trim()) { this.value = 'Mi ubicación'; $('[data-clear="a"]').classList.remove('on'); }
  });

  $('#lhFav').addEventListener('click', function () { if (activeLine) toggleFav(activeLine.i); });
  $('#btnCenterLine').addEventListener('click', function () {
    if (!activeKey) return;
    drawRoute(activeKey);
    setSheet(null);
    syncHandle();
    toast('Recorrido en el mapa', 'Tocá una parada para ver los tiempos', 'map', 'var(--blue-700)');
  });
  $('#btnShareLine').addEventListener('click', function () {
    var txt = 'Línea ' + activeLine.n + ' · ' + activeLine.r[activeRoute].n;
    if (navigator.share) navigator.share({ title: 'Bondi', text: txt }).catch(function () {});
    else { copy(txt); toast('Copiado', txt, 'share', 'var(--blue)'); }
  });
  $('#btnStopSched').addEventListener('click', function () {
    var routes = stopRoutes[currentStop] || [];
    if (routes.length) openSchedFor(routes[0].key);
    else openPage('sched', 'Horarios');
  });
  $('#btnEndTrip').addEventListener('click', endTrip);
  $('#btnShareTrip').addEventListener('click', shareApp);
  $('#btnTripAll').addEventListener('click', function () { if (tripOpt) startTrip(tripOpt); });
  $('#pageBack').addEventListener('click', closePage);
  $('#repCancel').addEventListener('click', function () { closeSheet('reportSheet'); });
  $('#reportOverlay').addEventListener('click', function () { closeSheet('reportSheet'); });
  $('#menuOverlay').addEventListener('click', function () { closeSheet('menuSheet'); });
  $('#btnLogin').addEventListener('click', function () { openModal('loginModal'); });
  $('#btnGoogle').addEventListener('click', function () {
    closeModal('loginModal'); closeSheet('menuSheet');
    setAccount('Invitado local', 'sincronización en este dispositivo', true);
    store.set('logged', true);
    toast('Sesión iniciada', 'Tus favoritos se guardan en este dispositivo', 'check', 'var(--green)');
  });
  $('#btnGuest').addEventListener('click', function () { closeModal('loginModal'); closeSheet('menuSheet'); });
  $('#btnLogout').addEventListener('click', function () {
    closeSheet('menuSheet');
    store.set('logged', false);
    setAccount('Invitado', 'Iniciá sesión para sincronizar', false);
    toast('Sesión cerrada', 'Seguís pudiendo usar todo', 'logout', 'var(--muted)');
  });
  $('#tglDark').addEventListener('change', function () {
    document.body.classList.toggle('dark', this.checked);
    store.set('dark', this.checked);
    setTileMode(this.checked ? 'dark' : 'light');
  });
  $('#pushClose').addEventListener('click', function () { $('#push').classList.add('hidden'); });
  $('#btnExitNo').addEventListener('click', function () { closeModal('exitModal'); });
  $('#btnExitYes').addEventListener('click', exitApp);
  document.addEventListener('click', function (e) {
    var x = e.target.closest('#etaClose');
    if (x) endTrip();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { handleBack(); return; }
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (t !== $('#inpB') && t !== $('#inpA')) return;
    e.preventDefault();
    var key = t === $('#inpA') ? 'a' : 'b';
    if (pts[key]) { if (key === 'b') doSearch(); return; }
    var box = $('#searchList');
    var row = box && !box.classList.contains('hidden')
      ? (box.querySelector('.geo-h + .row') || box.querySelector('.row')) : null;
    if (row) {
      row.click();
      if (key === 'b') setTimeout(doSearch, 60);
      return;
    }
    if (key === 'b') doSearch();
  });
}

/* ============ BOTÓN ATRÁS DE ANDROID / GESTO DE NAVEGACIÓN ============ */
var exiting = false;
function handleBack() {
  if (!$('#loginModal').classList.contains('hidden')) { closeModal('loginModal'); return true; }
  if (!$('#dirModal').classList.contains('hidden')) { closeModal('dirModal'); return true; }
  if (!$('#spotModal').classList.contains('hidden')) { closeModal('spotModal'); return true; }
  if (!$('#reportSheet').classList.contains('hidden')) { closeSheet('reportSheet'); return true; }
  if (!$('#menuSheet').classList.contains('hidden')) { closeSheet('menuSheet'); return true; }
  if (!$('#page').classList.contains('hidden') && pageOpen) { closePage(); return true; }
  if (viewStack.length > 1) { backView(); return true; }
  if (pickMode) { setPickMode(false); return true; }
  if (!$('#lineStrip').classList.contains('hidden')) { toggleStrip(false); return true; }
  if (!$('#lineCard').classList.contains('hidden')) { closeLineCard(); return true; }
  if (curPopup) { hidePopup(); return true; }
  if (busRoute && $('#lineCard').classList.contains('hidden')) { clearRoute(); return true; }
  if (document.body.dataset.sheet) { setSheet(null); return true; }
  if (!$('#etaBar').classList.contains('hidden')) { endTrip(); return true; }
  if (!$('#exitModal').classList.contains('hidden')) { closeModal('exitModal'); return true; }
  openModal('exitModal');
  return true;
}
function exitApp() {
  closeModal('exitModal');
  exiting = true;
  try { window.close(); } catch (e) {}
  setTimeout(function () { try { history.go(-2); } catch (e) {} }, 120);
  setTimeout(function () {
    if (document.hidden) return;
    exiting = false;
    try { history.pushState({ bw: 'root' }, ''); } catch (e) {}
  }, 2500);
}
function initHistory() {
  try {
    history.replaceState({ bw: 'root' }, '');
    window.addEventListener('popstate', function () {
      if (exiting) return;
      handleBack();
      try { history.pushState({ bw: 'root' }, ''); } catch (e) {}
    });
    history.pushState({ bw: 'cur' }, '');
  } catch (e) {}
}
function popupAlert(a) {
  return '<div class="wz-pop"><div class="p-top"><span class="p-badge" style="background:' + a.bg + '">' + icoSvg(a.ico) + '</span>' +
    '<div class="p-t"><b>' + a.t + '</b><span>' + a.s + '</span></div>' +
    '<button class="p-close" data-pop="1">' + icoSvg('close') + '</button></div>' +
    '<div class="p-foot"><button data-confirm="' + a.id + '">Confirmar</button><button class="ghost" data-dismiss="' + a.id + '">Descartar</button></div></div>';
}
function removeAlert(id) {
  ALERTS = ALERTS.filter(function (a) { return a.id !== id; });
  renderAlerts();
}
/* ===================== BICICBA · ESTACIONES ===================== */
function renderBici() {
  var list = $('#biciList');
  if (!list) return;
  var est = BICI.est || [];
  list.innerHTML = est.map(function (e, i) {
    return '<div class="bici-item">' +
      '<span class="bi-dot" style="background:' + biciColor(e.d) + '"></span>' +
      '<div class="bi-main"><b>' + e.nombre + '</b><span>' + (e.dir || '') + '</span>' +
      '<em>' + (e.hs || '') + '<br>' + (e.hf || '') + '</em></div>' +
      '<div class="bi-num" style="color:' + biciColor(e.d) + '"><b>' + (e.d || 0) + '</b><span>bicis</span></div>' +
      '<button class="bi-map" type="button" data-bici="' + i + '" title="Ver en el mapa">' + icoSvg('pin') + '</button>' +
      '</div>';
  }).join('');
  var tot = $('#biciTot'), sub = $('#biciSub'), foot = $('#biciFoot');
  if (tot) tot.textContent = est.length + ' estaciones · ' + biciDisp() + ' bicis disponibles';
  if (sub) sub.textContent = 'Actualizado ' + biciFechas(BICI.upd) + ' · tocá una estación para verla en el mapa';
  if (foot) foot.textContent = 'Datos de las estaciones: BiciCba (Córdoba)';
}
function popupBici(e) {
  return '<div class="wz-pop"><div class="p-top"><span class="p-badge" style="background:' + biciColor(e.d) + '">' + icoSvg('bike') + '</span>' +
    '<div class="p-t"><b>' + e.nombre + '</b><span>' + (e.dir || '') + '</span></div>' +
    '<button class="p-close" data-pop="1">' + icoSvg('close') + '</button></div>' +
    '<div class="p-arr">' +
    '<div class="row"><span class="t">Bicis disponibles</span><span class="m">' + (e.d || 0) + ' bicis</span></div>' +
    '<div class="row"><span class="t">Comunes / adaptadas</span><span class="m">' + (e.c || 0) + ' / ' + (e.a || 0) + '</span></div>' +
    '<div class="row"><span class="t">Lunes a viernes</span><span class="m">' + (e.hs || '—') + '</span></div>' +
    '<div class="row"><span class="t">Fines de semana</span><span class="m">' + (e.hf || '—') + '</span></div>' +
    '</div>' +
    '<div class="p-foot"><button data-pick="' + encodeURIComponent(e.nombre) + '|' + e.la + '|' + e.lo + '">' + icoSvg('pin') + 'Marcar destino</button>' +
    '<button class="ghost" data-pop="1">Cerrar</button></div></div>';
}
function openBiciOnMap(i) {
  var e = (BICI.est || [])[i];
  if (!e) return;
  hidePopup();
  closePage();
  backToMap();
  map.flyTo([e.la, e.lo], 16);
  setTimeout(function () { showPopup([e.la, e.lo], popupBici(e)); }, 520);
}
function dataOpen(key) {
  if (key === 'search') { closeSheet('menuSheet'); openView('v-search'); return; }
  if (key === 'lines') { closeSheet('menuSheet'); backToMap(); toggleStrip(true); return; }
  if (key === 'nearby') { closeSheet('menuSheet'); openView('v-nearby'); return; }
  if (key === 'fav') { closeSheet('menuSheet'); openView('v-fav'); return; }
  if (key === 'report') { openSheet('reportSheet'); return; }
  closeSheet('menuSheet');
  openPage(key);
}
function dataNav(key) {
  if (key === 'report') { openSheet('reportSheet'); return; }
  if (key === 'menu') { openSheet('menuSheet'); return; }
  if (key === 'search') { backToMap(); return; }
  if (key === 'fav') { openView('v-fav'); }
}
function quickPlace(k) {
  var saved = store.get('place_' + k, null);
  if (saved) { $('#inpB').value = saved.n; pts.b = saved; $('[data-clear="b"]').classList.add('on'); setDestPin(pts.b); return; }
  var names = { terminal: 'Terminal de Ómnibus', univ: 'Universidad Nacional (UNC)', obs: 'Observatorio Astronómico' };
  var p = PLACES.filter(function (x) { return x.n === names[k]; })[0];
  if (p) {
    $('#inpB').value = p.n;
    pts.b = p;
    $('[data-clear="b"]').classList.add('on');
    setDestPin(pts.b);
    if (k === 'terminal') store.set('place_terminal', p);
  } else toast('Sin dirección guardada', 'Buscá un destino y guardalo', 'pin', 'var(--amber)');
}

/* =========================== ARRANQUE =========================== */
function boot() {
  hydrate(document);
  $('#splashLogo').innerHTML = LOGO_SVG;
  $('#appVersion').textContent = APP_VERSION;
  $('#profileAva').innerHTML = AVA_SVG;
  $('#loginAva').innerHTML = AVA_SVG;
  $('#btnProfile').innerHTML = AVA_SVG;
  $('#exitAva').innerHTML = LOGO_SVG;
  buildReportGrid();
  buildIndexes();
  wire();
  initHistory();
  initMap();
  if (store.get('dark')) setTileMode('dark');
  renderAlerts();
  setUserLocation(CBA[0], CBA[1]);
  startSim();
  renderLineStrip();
  renderSearchList();
  initMapPick();
  initNotify();
  setAccount(store.get('logged') ? 'Invitado' : 'Invitado', store.get('logged') ? 'sincronización en este dispositivo' : 'Iniciá sesión para sincronizar', !!store.get('logged'));
  if (store.get('dark')) {
    document.body.classList.add('dark');
    $('#tglDark').checked = true;
  }
  setTimeout(function () {
    $('#splash').classList.add('off');
    $('#app').classList.remove('hidden');
    map.invalidateSize();
    hydrate(document);
    setTimeout(function () {
      locateMe();
      var fav = store.get('favLines', []);
      if (!fav.length) push('Bienvenido a Bondi', 'Buscá tu línea favorita y guardala con la estrella ★');
    }, 700);
  }, 1500);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
