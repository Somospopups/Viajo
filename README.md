# Bondi · Transporte Público de Córdoba

PWA para viajar en bondi por Córdoba Capital: líneas, paradas, próximos arribos,
horarios y posiciones en vivo de la flota. **JavaScript vanilla + Leaflet, sin
frameworks y sin build**: se edita un archivo y se publica.

- **Web:** https://somospopups.github.io/Viajo/
- **Versión:** `APP_VERSION` en `core.js` (hoy `v186`)
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

Cada cambio publicado consume un número de versión (sin decimales: `v185`,
`v186`, `v187`…). Al cambiar cosas del shell hay que mover los tres juntos:

1. `core.js` → `var APP_VERSION = 'vNNN';`
2. `index.html` → los seis `?v=NNN` (style.css, data.js, core.js, bici.js, views.js, main.js)
3. `sw.js` → `var VERSION = 'vNNN';` (nombre del cache `bondi-vNNN`)

El `?v=` es el que rompe cache en el navegador; el `VERSION` del SW limpia los
caches viejos en `activate`. Si olvidás el paso 3 la app igual actualiza (el HTML
siempre entra por red), sólo que queda basura en disco.

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
dominio) y aguanta ~1,5 pedidos por segundo. El Worker resuelve las dos cosas:
mantiene estado por parada en memoria, barre los códigos en lotes de 6 con
concurrencia 4 y sirve `/live` y `/arribos` con cache corto.

```bash
cd relay
npm i
npm run dev       # wrangler dev · http://127.0.0.1:8787
npm run deploy    # wrangler deploy · requiere wrangler login
```

La app lo apunta a `https://bondi-live.somospopups.workers.dev` (constante
`LIVE_URL` en `core.js`); se puede pisar por query con `?live=https://otro`.

Para regenerar la lista de paradas del feed global (embebida en
`relay/src/index.js` como `GLOBAL_STOPS`):

```bash
node relay/genstops.js
```

## Datos

`data.js` es un archivo generado (554 KB) con líneas, paradas, trazas y horarios
del sistema real. Los crudos quedan en `_raw/`, que está en `.gitignore` a
propósito: no versionan datos bajados de la API. **Hoy no hay script que
reproduzca `data.js` desde `_raw/`** — está sólo el `genstops.js` que lo *lee*.
Si hace falta regenerarlo, conviene armar ese script y versionarlo.

Política de datos: las posiciones **nunca se simulan**. Si no hay datos frescos,
los bondis se apagan y el badge lo indica; los arribos caen al horario de
programa.

## Pendientes

- Elegir licencia (falta `LICENSE`).
- Accesibilidad: botones sin nombre accesible y contraste de algunos textos
  (Lighthouse: a11y 0.85).
- `meta viewport` con `user-scalable=no` (a propósito en una app de mapa, pero
  Lighthouse lo marca).
- Autenticación real de “Continuar con Google” (hoy es local).
