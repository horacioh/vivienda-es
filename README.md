# Vivienda ES

Novedades diarias sobre **vivienda en España** — leyes, aprobaciones, propuestas de los partidos y
votaciones en el Parlamento — **siempre con enlace a la fuente oficial**.

- Web: https://vivienda-es.hhg.app (Cloudflare Workers, static assets; dominio propio)
- Filtros por URL: [`/?tipo=votacion`](https://vivienda-es.hhg.app/?tipo=votacion),
  [`/?partido=Sumar`](https://vivienda-es.hhg.app/?partido=Sumar),
  [`/?tipo=propuesta&partido=PP`](https://vivienda-es.hhg.app/?tipo=propuesta&partido=PP)

## Arquitectura

```
src/content/novedades/*.md   ← una novedad por fichero (fuente de la verdad, versionada en git)
src/content.config.ts        ← collection `novedades` (glob loader + esquema zod)
src/lib/fuentes.ts           ← lista de dominios oficiales admitidos en `fuente_url`
src/pages/index.astro        ← feed cronológico inverso agrupado por día + filtros
src/pages/novedades/[id].astro ← página de detalle por novedad
src/pages/rss.xml.ts         ← RSS con las 50 últimas
src/scripts/filtros.ts       ← filtrado en cliente (tipo/partido) sincronizado con ?tipo=&partido=
scripts/validate-novedades.ts← validación + deduplicación (Bun) antes del build/commit
scripts/fetch-boe.ts         ← ayudante: ítems de vivienda del sumario del BOE (API de datos abiertos)
.agents/daily-update.md      ← prompt de la actualización diaria (lo ejecuta una automation de Devin)
.github/workflows/deploy.yml ← CI: test + typecheck + build en cada push y PR
```

- **Astro estático** (`output: "static"`), Tailwind CSS v4 vía `@tailwindcss/vite`, mismo patrón que
  `apps/blog` de `horacioh/bjj-scheduler`.
- **Content collections**: cada `.md` se valida con zod en el build. `fuente_url` es obligatorio
  (`z.string().url()`) y además debe ser `https` y de un dominio oficial; si no, **el build falla**.
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

`/elecciones` compara las respuestas del usuario con lo que votó cada partido en el Pleno del Congreso. Todo se calcula en el navegador; no se guarda nada.

- `src/data/cuestionario.ts`: las afirmaciones, la votación (o votaciones) del Congreso que respalda cada una, qué voto equivale a «de acuerdo» (`sentido`) y los partidos comparados (`ACTORES`). Los partidos del Grupo Mixto se leen diputado a diputado.
- `src/data/votos-congreso.json`: recuento por grupo y voto de los diputados del Mixto, generado desde los datos abiertos del Congreso con `bun run votos`. Vuelve a ejecutarlo al añadir o cambiar una votación.
- `src/lib/cuestionario.ts`: postura de cada partido (+1 a favor, −1 en contra, 0 abstención; media si hay varias votaciones). La página explica el método y sus límites.

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
   webs de partidos; extrae las novedades de vivienda desde la última fecha publicada; deduplica contra
   `src/content/novedades/`; y crea los nuevos `.md` respetando el esquema.
2. Ejecuta `bun run validate`, `bun test` y `bun run build`.
3. Hace commit (`novedades: AAAA-MM-DD (N nuevas)`) y push a `main`.
4. El push a `main` dispara el build y el despliegue en Cloudflare (Workers Builds).

Para lanzarla a mano: abre una sesión de Devin en este repo con el prompt
“Sigue `.agents/daily-update.md`”.

## Despliegue

### Cloudflare Workers Builds (por defecto)

El repo está conectado al Worker `vivienda-es` con Workers Builds: cada push a `main` construye y
publica, y cada PR genera un preview. `wrangler.jsonc` publica `dist/` como static assets (sin
código de Worker). Configuración en el dashboard (Worker → Settings → Build):

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
