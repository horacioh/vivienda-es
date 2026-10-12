# Vivienda ES

Novedades diarias sobre **vivienda en España** — leyes, aprobaciones, propuestas de los partidos y
votaciones en el Parlamento — **siempre con enlace a la fuente oficial**.

- Web: https://vivienda-es.hhg.app (Cloudflare Workers, static assets; dominio propio)
- Filtros por URL: [`/?tipo=votacion`](https://vivienda-es.hhg.app/?tipo=votacion),
  [`/?partido=Sumar`](https://vivienda-es.hhg.app/?partido=Sumar),
  [`/?tipo=propuesta&partido=PP`](https://vivienda-es.hhg.app/?tipo=propuesta&partido=PP)

## Revisar y auditar el proyecto

Las novedades viven en **Seed** — una automation de Devin las publica cada día en
[vivienda-es.hyper.media](https://vivienda-es.hyper.media) (cuenta
`hm://z6Mkpqer25JrVxzoMobHUCkCv1r4fhiqTWwPWGrhcdGQVHHw`, ruta `/novedades/<slug>`), y la web las lee
de ahí en el build. El resto del contenido (cuestionario, método, legales) sigue en este
repositorio. Para comprobarlo:

- **Una novedad:** cada documento de `/novedades/` lleva `fuente_url`, el documento oficial. El
  build falla si la URL no es `https` de un dominio de [`src/lib/fuentes.ts`](src/lib/fuentes.ts).
- **La postura de un partido:** cada afirmación de [`src/data/cuestionario.ts`](src/data/cuestionario.ts)
  lista sus votaciones (`votacion` es la ruta del JSON oficial en `https://www.congreso.es`) y qué voto
  equivale a «de acuerdo» (`sentido`). Para reproducir los datos desde cero:
  ```bash
  bun install
  bun run votos                         # vuelve a descargar los votos del Congreso
  git diff src/data/votos-congreso.json # sin cambios = los datos publicados coinciden con los oficiales
  ```
- **El cálculo:** [`src/lib/cuestionario.ts`](src/lib/cuestionario.ts) (a favor +1, en contra −1,
  abstención 0; media si hay varias votaciones; «me importa mucho» cuenta doble). El método y sus límites
  están explicados en la propia página `/elecciones` (sección «Cómo se calcula»).
- **Cómo se eligieron las afirmaciones:** de las votaciones del Pleno sobre vivienda de la XV legislatura
  (2024–2026), solo las que tratan una propuesta concreta y reconocible; se descartan las que mezclan
  medidas distintas en un mismo voto. Los partidos sin grupo propio (en el Grupo Mixto) se leen diputado
  a diputado.
- **Privacidad:** el navegador solo envía algo si el usuario pulsa «Compartir de forma anónima».
  [`worker/index.ts`](worker/index.ts) guarda el día y las respuestas, nada más; la IP se usa en memoria
  para el rate limit y no se guarda ni se envía a Turnstile. Las respuestas se borran el 1 de enero de 2027
  (`BORRADO` en `worker/respuestas.ts`, tarea `scheduled` diaria). Los tests están en
  [`worker/respuestas.test.ts`](worker/respuestas.test.ts) (`bun test worker`).
- **Tests:** `bun run build` ejecuta validación, tests, `astro check` y build, igual que el CI.

### Qué no está en el repositorio

| Qué | Dónde está | Por qué |
| --- | --- | --- |
| `TURNSTILE_SECRET` | Secret del Worker en Cloudflare | Es la clave privada de Turnstile. |
| Respuestas anónimas compartidas | D1 `vivienda-es` en Cloudflare | Se publican solo agregadas en `/elecciones`. |
| Configuración de build (`BUN_VERSION`) | Workers Builds en Cloudflare | Ver «Despliegue». |

`wrangler.jsonc` sí incluye la clave pública de Turnstile (`TURNSTILE_SITEKEY`, visible en cualquier
caso en la web) y el ID de la base de datos D1: son identificadores, no credenciales, y no dan acceso sin
una cuenta de Cloudflare autorizada. El CI pasa [gitleaks](https://github.com/gitleaks/gitleaks) sobre
todo el historial en cada push y PR; en local: `gitleaks git --log-opts=--all .`

### Errores y sugerencias

Si un dato es incorrecto, falta una votación o un resumen no es neutral, abre un
[issue](https://github.com/horacioh/vivienda-es/issues) con el enlace a la fuente oficial. Para
problemas de seguridad, ver [`SECURITY.md`](SECURITY.md).

## Arquitectura

```
Seed: /novedades/<slug>      ← una novedad por documento (fuente de la verdad, en vivienda-es.hyper.media)
src/lib/seed.ts              ← cliente de solo lectura de la API pública del sitio Seed
src/lib/seed-render.ts       ← render HMBlock → HTML (párrafos, listas, enlaces, negritas…)
src/lib/seed-loader.ts       ← loader Astro: documentos Seed → collection `novedades` (esquema zod)
src/content.config.ts        ← collection `novedades` (loader Seed + esquema zod)
src/lib/fuentes.ts           ← lista de dominios oficiales admitidos en `fuente_url`
src/pages/index.astro        ← feed cronológico inverso agrupado por día + filtros
src/pages/novedades/[id].astro ← página de detalle por novedad
src/pages/rss.xml.ts         ← RSS con las 50 últimas
src/pages/elecciones.astro   ← cuestionario 29N, «Qué votó cada partido» y método
src/pages/acerca.astro       ← método y fuentes del feed
src/data/cuestionario.ts     ← afirmaciones, votaciones que las respaldan y partidos comparados
src/data/votos-congreso.json ← votos por grupo descargados del Congreso (generado, no se edita a mano)
src/lib/cuestionario.ts      ← postura de cada partido y puntuación de coincidencia
src/scripts/cuestionario.ts  ← cuestionario en el navegador (respuestas, resultado, compartir)
src/scripts/filtros.ts       ← filtrado en cliente (tipo/partido) sincronizado con ?tipo=&partido=
worker/index.ts              ← Worker: solo /api/* (respuestas anónimas del cuestionario en D1)
worker/respuestas.ts         ← validación de respuestas, Turnstile, veda electoral y agregados
scripts/fetch-votos-congreso.ts ← `bun run votos`: regenera src/data/votos-congreso.json
scripts/validate-novedades.ts← validación + deduplicación (Bun) antes de publicar
scripts/seed-publish.ts      ← publica/actualiza novedades en Seed vía seed-cli
scripts/seed-list.ts         ← lista las novedades ya publicadas en Seed
scripts/fetch-boe.ts         ← ayudante: ítems de vivienda del sumario del BOE (API de datos abiertos)
.agents/daily-update.md      ← prompt de la actualización diaria (lo ejecuta una automation de Devin)
.github/workflows/deploy.yml ← CI: test + typecheck + build en cada push y PR
```

- **Astro estático** (`output: "static"`), Tailwind CSS v4 vía `@tailwindcss/vite`.
- **Seed como fuente de datos**: las novedades son documentos Seed de la cuenta
  `hm://z6Mkpqer25JrVxzoMobHUCkCv1r4fhiqTWwPWGrhcdGQVHHw` (sitio
  [vivienda-es.hyper.media](https://vivienda-es.hyper.media)); el loader las lee en el build con
  el mismo esquema zod. `fuente_url` sigue exigiendo `https` y dominio oficial; si no, **el build
  falla** (también si Seed no devuelve ninguna novedad).
- **Comentarios**: cada novedad enlaza a su documento Seed, donde los lectores comentan tras
  iniciar sesión con su Seed vault; la página los muestra vía `ListComments` en el navegador.
- Mobile-first: una columna en móvil, filtros fijos arriba, objetivos táctiles ≥ 44 px; escala a
  escritorio con ancho de lectura limitado.
- Cada tarjeta muestra fecha, tipo, partido/institución, título (enlazado a su página de detalle), resumen,
  estado y **“Ver fuente oficial →”** (`target="_blank" rel="noopener"`).

## Desarrollo local

Requiere [Bun](https://bun.sh) (los scripts de validación usan Bun; Astro funciona también con Node 22+).

```bash
bun install
bun run dev        # http://localhost:4321
bun run validate   # esquema + nombres de fichero + duplicados
bun test           # tests del validador y de las novedades del repo
bun run typecheck  # astro check
bun run build      # validate + astro build → dist/
bun run preview
```

Con npm: `npm install && npm run dev` (para `build`/`validate`/`test` hace falta Bun instalado).

## Esquema de datos

Documentado en [`src/content/novedades/README.md`](src/content/novedades/README.md). Resumen:

| Campo | Obligatorio | Valores |
| --- | --- | --- |
| `fecha` | sí | `AAAA-MM-DD` (coincide con el nombre del fichero) |
| `titulo`, `resumen` | sí | texto |
| `tipo` | sí | `ley` · `propuesta` · `votacion` · `aprobacion` · `otro` |
| `partido` | no | nombre corto: `PSOE`, `PP`, `VOX`, `Sumar`, `Grupo Mixto`… |
| `institucion` | no | texto |
| `estado` | no | `propuesta` · `en-tramite` · `aprobada` · `rechazada` · `caducada` |
| `fuente_url` | **sí** | URL https de un dominio oficial |
| `fuente_nombre` | sí | texto |
| `resultado`, `votos_por_grupo` | no | votaciones |

## Cuestionario «Elecciones 29N»

`/elecciones` compara las respuestas del usuario con lo que votó cada partido en el Pleno del Congreso. Todo se calcula en el navegador; solo se guarda algo si el usuario pulsa «Compartir de forma anónima».

- `src/data/cuestionario.ts`: las afirmaciones, la votación (o votaciones) del Congreso que respalda cada una, qué voto equivale a «de acuerdo» (`sentido`) y los partidos comparados (`ACTORES`). Los partidos del Grupo Mixto se leen diputado a diputado.
- `src/data/votos-congreso.json`: recuento por grupo y voto de los diputados del Mixto, generado desde los datos abiertos del Congreso con `bun run votos`. Vuelve a ejecutarlo al añadir o cambiar una votación.
- `src/lib/cuestionario.ts`: postura de cada partido (+1 a favor, −1 en contra, 0 abstención; media si hay varias votaciones). La página explica el método y sus límites.

### Respuestas anónimas («Qué responde la gente»)

`worker/index.ts` atiende `/api/*`; el resto lo sirve `dist/` sin pasar por el Worker.

- `POST /api/respuestas` con `{ "respuestas": { "<id afirmación>": [valor (-1|0|1), importa (0|1)] } }`. Se guarda en la tabla `envios` de D1 (binding `DB`) solo el día y las respuestas: sin IP, cookies ni identificador. La IP se usa en memoria para el rate limit (binding `LIMITE`, 5 envíos/min por IPv4 o por prefijo /64 en IPv6, `claveLimite`) y no se guarda. No se envía `remoteip` a Turnstile. Desde el 1 de enero de 2027 (`BORRADO`) el Worker responde 410 a los envíos y el cron diario (`triggers.crons` en `wrangler.jsonc`) borra la tabla `envios`. Cada envío lleva un token de Cloudflare Turnstile (`token`, acción `compartir`). El Worker lo comprueba con siteverify y exige `success`, la acción `compartir` y un `hostname` de `TURNSTILE_HOSTNAMES`. Sin `TURNSTILE_SECRET` no se acepta ningún envío, y desde los previews tampoco (su hostname no está en la lista), así que no escriben en la D1 de producción.
- Turnstile: la clave pública está en `wrangler.jsonc` (`vars.TURNSTILE_SITEKEY`) y la secreta es un secret del Worker (Settings → Variables and Secrets → `TURNSTILE_SECRET`, tipo Secret). En local, `.dev.vars` (ignorado por git) puede usar las claves de prueba de Cloudflare: `TURNSTILE_SITEKEY=1x00000000000000000000AA`, `TURNSTILE_SECRET=1x0000000000000000000000000000000AA` y `TURNSTILE_HOSTNAMES=example.com`. Ojo: las claves de prueba no devuelven `action`, así que en local el envío acaba en 403; la lógica se prueba con `bun test worker`. La tabla se crea sola en la primera petición.
- `GET /api/resultados` devuelve, por afirmación, solo porcentajes enteros (nunca recuentos), calculados por lotes: solo cuentan los primeros envíos en múltiplos de 10 (`LOTE`), así que las cifras cambian cada 10 envíos nuevos y no se puede aislar uno solo comparando dos consultas seguidas. No da cifras con menos de 30 envíos (`MINIMO`), omite las afirmaciones con menos de 30 respuestas y no devuelve el total por debajo del mínimo. Tampoco publica nada durante la veda de sondeos (LOREG art. 69.7: del 24 de noviembre al cierre de colegios del 29; `VEDA` en `worker/respuestas.ts`).
- En local: `bun run build && bunx wrangler dev` (D1 local en `.wrangler/`).

## Fuentes oficiales

| Fuente | Qué se extrae |
| --- | --- |
| [BOE](https://www.boe.es) — API de datos abiertos | Leyes, reales decretos-leyes, reales decretos, leyes autonómicas, resoluciones |
| [Congreso de los Diputados](https://www.congreso.es) — notas de prensa y datos abiertos | Votaciones del Pleno, convalidaciones/derogaciones, proposiciones de ley por grupo (BOCG) |
| [Senado](https://www.senado.es) | Tramitación y votaciones |
| [Ministerio de Vivienda y Agenda Urbana](https://www.mivau.gob.es) | Planes, ayudas, anuncios |
| [La Moncloa](https://www.lamoncloa.gob.es) | Referencias del Consejo de Ministros |
| Webs oficiales de los partidos | Propuestas y programas de vivienda |

La lista exacta de dominios admitidos está en [`src/lib/fuentes.ts`](src/lib/fuentes.ts).

## Actualización diaria

1. Una **automation programada de Devin** se ejecuta cada mañana y sigue
   [`.agents/daily-update.md`](.agents/daily-update.md): consulta BOE, Congreso, Senado, Ministerio y
   webs de partidos; extrae las novedades de vivienda desde la última fecha publicada; deduplica
   contra lo ya publicado (`bun run scripts/seed-list.ts`) y publica cada novedad como documento
   Seed con `bun run scripts/seed-publish.ts` (valida el esquema antes de subir).
2. Dispara el rebuild de la web: deploy hook de Cloudflare (`CF_DEPLOY_HOOK`) o, en su defecto,
   un commit vacío en `main`.
3. El build lee las novedades de Seed y despliega en Cloudflare (Workers Builds).

Para lanzarla a mano: abre una sesión de Devin en este repo con el prompt
“Sigue `.agents/daily-update.md`”.

## Despliegue

### Cloudflare Workers Builds (por defecto)

El repo está conectado al Worker `vivienda-es` con Workers Builds: cada push a `main` construye y
publica, y cada PR genera un preview. `wrangler.jsonc` publica `dist/` como static assets y el
Worker `worker/index.ts` para `/api/*`, con la base de datos D1 `vivienda-es` (su ID va en
`d1_databases[0].database_id`). Ojo: los previews usan la misma D1 que producción. Configuración en el dashboard (Worker → Settings → Build):

- Build command: `bun run build`. Ya incluye `validate`, `bun test` y `astro check`, así que un
  commit que no pase los tests no se publica.
- Deploy command: `npx wrangler deploy` (el valor por defecto; sin flags como `--assets`, que
  ignorarían `wrangler.jsonc`).
- Variables de build: **`BUN_VERSION`** con la misma versión que `.bun-version` (obligatoria: la
  imagen de build trae Bun 1.2.15, que no lee el formato actual de `bun.lock`, y Cloudflare solo acepta
  la versión de Bun por variable, no por fichero). Opcional: `SITE_URL` si usas un dominio propio.

**Actualizar Bun:** cambia `.bun-version` (lo lee el CI de GitHub) y pon el mismo valor en
`BUN_VERSION` en Cloudflare.

`bun.lock` está en formato `lockfileVersion: 1` (generado con Bun 1.2.15) para que la imagen de
Cloudflare lo lea aunque no vea `BUN_VERSION`; Bun 1.4 lo lee y lo mantiene en v1 con `bun install`
y `bun add`. Si algún día pasa a v2 (`"lockfileVersion": 2`), `BUN_VERSION` es imprescindible.

`.github/workflows/deploy.yml` solo hace de CI en GitHub. Para publicar a mano:
`bun run build && bun run deploy`.

### GitHub Pages (alternativa)

`.github/workflows/github-pages.yml` (manual, `workflow_dispatch`) construye con
`SITE_URL=https://<usuario>.github.io` y `BASE_PATH=/vivienda-es` y publica con `actions/deploy-pages`.
Activa *Settings → Pages → Source: GitHub Actions* y, si quieres que sea el despliegue principal,
cambia su trigger a `push` a `main`.

## Aviso

Los resúmenes son una síntesis informativa; el texto con validez es siempre el de la fuente oficial
enlazada.

## Licencia

[Apache 2.0](LICENSE): código, datos y textos de este repositorio. Los documentos oficiales enlazados
(BOE, Congreso, etc.) se rigen por sus propias condiciones de reutilización.
