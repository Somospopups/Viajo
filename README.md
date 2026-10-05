# Bondi · Transporte Público de Córdoba

PWA para viajar en bondi por Córdoba Capital: líneas, paradas, próximos arribos,
horarios y posiciones en vivo de la flota. **JavaScript vanilla + Leaflet, sin
frameworks y sin build**: se edita un archivo y se publica.

- **Web:** https://somospopups.github.io/Viajo/
- **Versión:** `APP_VERSION` en `core.js` (hoy `v187`)
- **Datos en vivo:** relay propio en Cloudflare Worker (`relay/`) contra la API de TU BONDI

---

## Estructura

```
index.html         markup completo (vistas, modales, menú)
core.js            iconos SVG, utilidades, índice espacial, mapa, bondis en vivo
views.js           vistas/paneles, geocoding, plan de viaje, avisos de llegada
main.js            menú, páginas internas, wire() y boot()
bici.js            BiciCba
data.js            window.DATA · líneas, paradas, trazas, horarios (generado)
style.css          estilos (tema claro/oscuro)
sw.js              service worker: app shell offline + notificaciones
manifest.webmanifest  manifest de la PWA
logo.svg           ícono vectorial (origen de todos los PNG)
icons/             PNG generados por tools/gen-icons.js
vendor/            Leaflet js/css versionado
relay/             Cloudflare Worker (relay en vivo de posiciones)
tools/             utilidades de desarrollo (sin dependencias salvo gen-icons)
```

## Correr en local

```bash
node tools/serve.js          # http://localhost:8080  (otro puerto: node tools/serve.js 3000)
npm start                    # idem, si ya corriste npm i
```

`tools/serve.js` no tiene dependencias y sirve los MIME correctos (el
`manifest.webmanifest` se rompe con servidores que no lo conocen). El service
worker funciona en `http://localhost` porque Chrome lo trata como contexto seguro.

También sirve `npx serve .` o `python -m http.server`, pero el manifest puede
venir con el content-type equivocado.

## Publicar una versión

Cada cambio publicado consume un número de versión (sin decimales: `v186`,
`v187`, `v188`…). Al cambiar cosas del shell hay que mover los tres juntos:

1. `core.js` → `var APP_VERSION = 'vNNN';`
2. `index.html` → los seis `?v=NNN` (style.css, data.js, core.js, bici.js, views.js, main.js)
3. `sw.js` → `var VERSION = 'vNNN';` (nombre del cache `bondi-vNNN`)

El `?v=` es el que rompe cache en el navegador; el `VERSION` del SW limpia los
caches viejos en `activate`. Si olvidás el paso 3 la app igual actualiza (el HTML
siempre entra por red), sólo que queda basura en disco. El paso 1-3 se puede hacer
de una con `node tools/bump-version.js 191`, que además verifica que no quede
ninguna versión vieja en los tres archivos.

Publicar es hacer `git push` a `main`: GitHub Pages despliega desde la raíz de
esa rama, automáticamente.

## PWA · manifest e iconos

`manifest.webmanifest` declara la app como instalable (`display: standalone`,
scope y start_url relativos, así funcionan igual en GitHub Pages y en un dominio
propio). Los PNG se generan desde `logo.svg`:

```bash
npm i                # una vez (sólo sharp, para generar iconos; node_modules/ está en .gitignore)
npm run icons
```

Salen `icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (zona segura
del 80 % para iconos con máscara) y `apple-touch-icon.png` (180 px, iOS).
El fondo es el mismo radial del splash.

## Plan de salida (cuándo salir de tu casa)

El motor de avisos (`views.js`: `planOut`, `busPor`, `tickWatch`) aplica la regla
que define el producto: **caminar hasta la parada y esperar a lo sumo 3 minutos**.
Para cada unidad en vivo de la línea elegida:

- `walk` = distancia hasta la parada × 1.28 (desvío de cuadras) a 4,6 km/h;
- se elige el **primer bondi que alcanzás**: el que pasa *después* de que llegás;
- `leaveIn = eta − walk − 3` → “Salí en X min” (llegás con 3 min de espera);
- si `leaveIn ≤ 0` → “Es hora de salir” (ya esperás 3 min o menos);
- si ni siquiera llegás al más próximo → “No alcanzás ese bondi” y se sigue
  esperando al siguiente. Nunca manda a caminar para hacer perder el bondi.

El aviso dice además **por dónde viene**: `busPor()` toma la unidad que se
**acerca** a tu parada (rumbo medido con dos muestras consecutivas de la misma
unidad; si ninguna viene hacia vos, la más cercana) y le asigna la parada real
más próxima — “viene por Av. Medina Allende”. Sin ese filtro, el “más cercano”
podía ser el bondi que acaba de pasar en el sentido contrario: te decía “viene
por Estación ACA” con el bondi a 25 m y 17 min de eta. Se activa desde una parada
(“Avisarme cuando llegue”) o desde la línea; la barra `#watchBar` recorre las
fases *esperar → salí → está por llegar → llegó* y se recalcula cada 10 s con el
relay.

## APK de Android

La misma app empaquetada con **Capacitor 8** (carpeta `android/`), compilada en
**GitHub Actions** — no hace falta Java ni el Android SDK en la máquina:

```bash
npm run www       # genera www/ (assets + bridge.js, el puente nativo)
npm run android   # = npm run www + cap sync android
npm run assets    # regenera íconos y splash de Android desde icons/ y logo.svg
```

`.github/workflows/android.yml` corre en cada push a `main`: `npm ci` →
`npm run www` → `cap sync android` → versiona `versionCode` y `versionName` desde
`APP_VERSION` → `./gradlew assembleDebug` → sube el APK como artefacto
(**bondi-apk** → `bondi-vNNN.apk`, Actions → APK Android → *Artifacts*; dura 30
días).

Qué cambia dentro de la APK:

- `tools/bridge-src.js` se empaqueta a `www/bridge.js` con esbuild y expone
  `window.CapBridge` (`LocalNotifications`, `Geolocation`, `App`). En la web no se
  carga, así que `isNative()` es `false` y nada de esto se ejecuta en Pages.
- **Avisos programados**: `syncNativePlan()` agenda con
  `LocalNotifications.schedule()` los tres momentos (`salir`, `cerca`, `subite`);
  Android los lanza con AlarmManager, **aunque la app esté cerrada**. Se reagenda
  sólo si el horario se corre más de 45 s y se cancelan al cerrar el aviso.
- Geolocalización pedida por la WebView de Capacitor, botón atrás de Android que
  cierra el panel (no la app), refresco al volver de segundo plano.
- Ícono `#35CDFF`, splash con el logo y permisos (ubicación + notificaciones) en
  `AndroidManifest.xml`.

La APK se firma con la clave de debug de Gradle: se instala en cualquier teléfono
(“instalar orígenes desconocidos”), pero no sirve para Play Store. Para publicar
hay que generar un keystore y compilar `assembleRelease`.

## Offline

`sw.js` precachea el shell (HTML, CSS, JS, `data.js`, Leaflet, manifest e iconos)
y usa esta política:

- **navegaciones** → red primero; sin señal se sirve el `index.html` guardado;
- **assets same-origin** → cache primero (al cambiar el `?v=` la URL es nueva y
  se vuelve a bajar);
- **cross-origin** (tiles del mapa, fuentes de Google, geocoder, relay) → siempre
  red, nunca se cachean.

Resultado: sin datos el mapa y la interfaz abren igual; lo que no está en cache
(live, geocoding, tiles) queda como “sin conexión”.

## Relay en vivo (`relay/`)

La API de TU BONDI no deja llamarla desde el navegador (CORS cerrado a su propio
dominio) y aguanta ~1 pedido por segundo. El Worker resuelve las dos cosas:
mantiene estado por parada en memoria, barre los 18 códigos del feed global de
una (`BATCH=18`, `CONC=5`, `FRESH_MS=20s`) y sirve `/live` y `/arribos`
con cache corto. Con la app abierta (un `/live` cada 10 s) eso deja el ciclo
entero en ~20 s: antes, con lotes de 6, el ciclo era de 40 s y los bondis se
veían atrasados 40-86 s (mediana 46 s ≈ 500 m de error a 40 km/h).

**Arranque frío.** El estado vive en memoria, así que cada isolate nuevo arranca
vacío y el barrido completo tarda ~10-20 s. El `globalLive()` viejo esperaba ese
barrido entero *sin* `waitUntil` y, como la app corta a los 20 s
(`LIVE_TIMEOUT`), el cliente se iba antes: livelock de "sin datos en vivo" hasta
que alguien banqueara el request. Ahora la respuesta espera a lo sumo
`COLD_WAIT_MS=6s` (el refresh corre garantizado por `waitUntil`), y el primer
lote son `COLD_FIRST=6` códigos para pintar rápido. Medido en producción:
`/live` pasó de **>15 s (timeout)** a **672 ms** con `ok:true` y datos. De la
mano, `applyLive()` en `core.js` ya no borra el mapa ante un feed no-ok: deja las
últimas posiciones buenas y las apaga a los 90 s (`LIVE_STALE`), así un isolate
reciclado no vacía la pantalla de un saque.

```bash
cd relay
npm i
npm run dev       # wrangler dev · http://127.0.0.1:8787
npm run deploy    # wrangler deploy · requiere wrangler login
```

Ya está desplegado en `https://bondi-live.somospopups.workers.dev`: `/health`
devuelve el colo, cuántas paradas tiene en memoria y una sonda (cacheada 30 s)
a la fuente; `/live` y `/arribos` traen posiciones y arribos reales.

La app lo apunta a `https://bondi-live.somospopups.workers.dev` (constante
`LIVE_URL` en `core.js`); se puede pisar por query con `?live=https://otro`.

Para regenerar la lista de paradas del feed global (embebida en
`relay/src/index.js` como `GLOBAL_STOPS`):

```bash
node relay/genstops.js
```

## Datos

`data.js` es un archivo generado con líneas, paradas, trazas y horarios del
sistema real. Los crudos quedan en `_raw/`, que está en `.gitignore` a
propósito: no versionan datos bajados de la API. El pipeline está versionado:

```bash
node tools/build-data.js         # _raw/ -> data.js (líneas, trazas, paradas, horarios)
node tools/harvest-horarios.js   # baja horarios de todas las rutas (idempotente)
node tools/probe-api3.js         # sonda corta: ¿la API sigue viva y qué devuelve?
```

`tools/raw-dir.js` resuelve dónde está `_raw/` (variable `RAW_DIR`, o `./_raw`,
o el repo hermano `bondi-cba/_raw`). La cosecha va a propósito lenta (~1 req/s),
respeta el `sentido` de cada ruta y se puede cortar y relanzar: lo ya bajado no
se vuelve a pedir. Hoy cubre las **160 rutas** con **679 claves** de horario
(`clavesHorario` del build, contra ~72 que tenía el archivo a mano).

En la pantalla de **Horarios** esas 679 salidas se listan agrupadas por
recorrido con la etiqueta `línea · recorrido` (p. ej. `10 · ITUZAINGO A
LASALLE`): agrupar sólo por número de línea dejaba 88 grupos con el mismo
nombre, y una parada sin el sentido no dice nada.

Política de datos: las posiciones **nunca se simulan**. Si no hay datos frescos,
los bondis se apagan y el badge lo indica; los arribos caen al horario de
programa.

### Verificación de georreferenciación

Ante cualquier duda de "¿el mapa está corridido?", la respuesta está medida, no
supuesta (todo contra OpenStreetMap como referencia independiente):

```bash
node tools/diag-georef.js      # paradas vs OSM · bondis vs vías de OSM
node tools/diag-bondis-calles.js # bondis en vivo: ¿caen sobre la calle?
node tools/diag-tiles.js        # ArcGIS (fondo) vs OSM, mismo tile y geocoding
node tools/diag-frescura.js     # antigüedad real del feed, muestra por muestra
```

Última corrida: paradas vs OSM **13 m de mediana con vector (dx, dy) = (0, 0)**;
bondis en vivo **a 1-5 m del eje de la calle**; el tile de ArcGIS y el de OSM
alineados en **(0, 0) px**. O sea: ni los datos ni el fondo están corridados.

El corrimiento que se llega a ver era **de render**, no de datos: `.mk-bus`
tenía `position: relative`, con lo que el ícono dejaba de posicionarse en
absoluto y **se apilaba en el flujo** del panel de markers — cada bondi quedaba
desplazado +17 px por cada uno agregado antes (medido: +13, +30, +47 … +132).
`style.css` carga después de `vendor/leaflet.css` y ganaba la especificidad de
`.leaflet-marker-icon{position:absolute}`. Ahora es `absolute` y el offset
medido es **(0, 0) en todos**.

## Pendientes

- Elegir licencia (falta `LICENSE`).
- Firma release (keystore) para publicar en Play Store; hoy sale APK debug.
- Rediseño visual tipo Waze (siguiente hito: tarjetas grandes, colores
  saturados, bottom-sheet con puntos de anclaje).
- Notificaciones push desde el relay (hoy son locales programadas; un push
  servidor permitiría avisar con la app cerrada y datos más frescos).
- Accesibilidad: botones sin nombre accesible y contraste de algunos textos
  (Lighthouse: a11y 0.85).
- `meta viewport` con `user-scalable=no` (a propósito en una app de mapa, pero
  Lighthouse lo marca).
- Autenticación real de “Continuar con Google” (hoy es local).
