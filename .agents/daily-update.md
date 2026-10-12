# Actualización diaria de novedades de vivienda

Eres el editor de `vivienda-es`. Tu trabajo diario es publicar en **Seed** (sitio
`https://vivienda-es.hyper.media`, cuenta `hm://z6Mkpqer25JrVxzoMobHUCkCv1r4fhiqTWwPWGrhcdGQVHHw`)
las novedades sobre **vivienda en España** publicadas desde la última actualización, **solo a
partir de fuentes oficiales**, y luego disparar el rebuild de la web.

Las novedades ya no viven en el repo: cada una es un documento Seed en
`/novedades/<AAAA-MM-DD-slug>` con sus campos como atributos. La web los lee de Seed al
construirse, así que publicar en Seed **no cambia la web hasta el siguiente deploy** (ver paso 4).

Regla de oro: **si no hay una URL oficial que respalde un dato, ese dato no se publica.** No
inventes, no extrapoles y no uses prensa, agregadores ni redes sociales como fuente (como mucho,
como pista para encontrar el documento oficial).

## 0. Preparación

```bash
bun run scripts/seed-list.ts   # qué hay ya publicado (slug, fecha, fuente_url, título)
```

Calcula la ventana (hora de Madrid): empieza en la **más antigua** de estas dos fechas —la `fecha`
más reciente listada por `seed-list.ts` (incluida, para recoger lo publicado más tarde ese mismo
día) u hoy menos 3 días— y termina hoy. Nunca la recortes: si hubo un hueco largo, revisa todos
los días intermedios. La deduplicación del paso 2 evita repetir lo que ya existe.

La clave de firma (`SEED_KEY`) ya está importada en el keyring de seed-cli. Compruébalo con
`npx -y @seed-hypermedia/cli@latest key list` si algo falla con "Key not found".

## 1. Fuentes a consultar (en este orden)

Usa un User-Agent de navegador: congreso.es y mivau.gob.es devuelven 403 sin él. Si un dominio
sigue devolviendo 403 con el User-Agent, **no reintentes ni busques rodeos**: anótalo en el
resumen y sigue.

Las fuentes 1, 2 y 4 se consultan **cada día**. Senado (3) y partidos (5) solo los **lunes** (hora
de Madrid), con una ventana de los últimos 14 días o la del paso 0 si es más larga (tras una
parada larga). Así, si falla un lunes, el siguiente cubre las dos semanas; la deduplicación del
paso 2 evita repetir.

1. **BOE** — https://www.boe.es
   - Ayudante: `bun run scripts/fetch-boe.ts <desde AAAA-MM-DD> <hasta AAAA-MM-DD>` lista los
     ítems del sumario (API `https://www.boe.es/datosabiertos/api/boe/sumario/AAAAMMDD`) cuyo
     título o departamento menciona vivienda, alquiler, arrendamiento, desahucios, suelo,
     urbanismo, etc. Por defecto ya descarta la sección II (nombramientos, oposiciones), la V
     (anuncios, contratación) salvo extractos de convocatorias de ayudas, y los recursos de la
     DGSJFP contra calificaciones registrales; añade `--todo` solo si sospechas que falta algo.
   - El filtro es amplio a propósito: **revisa cada ítem** y quédate solo con lo relevante para la
     política de vivienda (leyes, reales decretos-leyes, reales decretos, leyes autonómicas,
     ayudas, planes, resoluciones de las Cortes). Descarta oposiciones, nombramientos, anuncios de
     registros, subastas, edictos y convenios menores.
   - `fuente_url`: `https://www.boe.es/diario_boe/txt.php?id=BOE-A-AAAA-NNNNN`.
2. **Congreso de los Diputados** — https://www.congreso.es
   - Notas de prensa: https://www.congreso.es/es/notas-de-prensa (votaciones del Pleno,
     convalidaciones o derogaciones de reales decretos-leyes, tomas en consideración).
   - Votaciones (datos abiertos): https://www.congreso.es/es/opendata/votaciones — los JSON
     `VOT_*.json` traen totales y votos por diputado/grupo; úsalos para `resultado` y
     `votos_por_grupo`.
   - Iniciativas (datos abiertos): https://www.congreso.es/es/opendata/iniciativas —
     `ProposicionesDeLey__*.json` (campo `AUTOR` = grupo parlamentario, `ENLACESBOCG` = PDF
     oficial del BOCG). Busca nuevas proposiciones de ley de vivienda y cambios de
     `SITUACIONACTUAL`.
3. **Senado** (solo lunes) — https://www.senado.es (actividad parlamentaria, iniciativas y
   votaciones). Desde la VM de Devin suele devolver 403 incluso con User-Agent; si es así, sáltalo.
4. **Ministerio de Vivienda y Agenda Urbana** —
   https://www.mivau.gob.es/el-ministerio/sala-de-prensa/noticias (solo noticias de política de
   vivienda; ignora exposiciones, premios de arquitectura y actos culturales). También
   https://www.lamoncloa.gob.es (referencias del Consejo de Ministros).
5. **Partidos políticos** (solo lunes) — solo sus webs oficiales (dominios en `src/lib/fuentes.ts`):
   propuestas o programas de vivienda publicados en el periodo. Prefiere siempre el documento
   parlamentario (BOCG) si la propuesta está registrada en el Congreso o el Senado.

**Parada temprana:** si tras revisar las fuentes del día no hay ningún candidato nuevo ni cambio
de estado, termina ya con el resumen (sin publicar nada ni disparar rebuild).

## 2. Deduplicar

Antes de publicar, contrasta cada candidato con la salida de `seed-list.ts`:

- Si ya existe una novedad con la misma `fuente_url` y el mismo `tipo`, **no** la dupliques.
- Si una novedad existente cambió de situación (p. ej. una propuesta convalidada, rechazada o
  caducada), **vuelve a publicarla con el nuevo `estado`** (mismo slug: el publicador la
  actualiza en vez de crearla) y, si el cambio es noticia en sí (una votación), crea además una
  novedad nueva de `tipo: votacion` con la fuente de esa votación.
- Si una misma fuente recoge varias votaciones (p. ej. dos convalidaciones en una nota de prensa),
  crea **una novedad por votación**, cada una con su `resultado`.
- `seed-publish.ts` valida antes de subir: esquema, fuente oficial y duplicados por URL
  normalizada + tipo (+ `resultado` en votaciones) y por título + fecha.

## 3. Publicar en Seed

Un documento por novedad en `/novedades/<AAAA-MM-DD-slug>`, donde la fecha es la de publicación
oficial (BOE, nota de prensa, registro de la iniciativa) y coincide con `fecha`. Para cada una,
escribe un fichero temporal con el frontmatter de siempre y publícalo:

```markdown
---
fecha: 2026-10-07
titulo: "Título claro en español (no copies titulares de 300 caracteres)"
resumen: "1–3 frases neutrales: qué es, qué cambia y en qué estado queda."
tipo: ley            # ley | propuesta | votacion | aprobacion | otro
partido: PSOE        # solo si la impulsa un partido/grupo: PSOE, PP, VOX, Sumar, ERC, Junts, EH Bildu, PNV, BNG, CC, UPN, Podemos, Grupo Mixto
institucion: "Gobierno de España (Consejo de Ministros)"
estado: en-tramite   # propuesta | en-tramite | aprobada | rechazada | caducada
fuente_url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20823"
fuente_nombre: "BOE núm. BOE-A-2026-20823"
---

Contexto opcional (Markdown). Solo hechos que figuren en la fuente oficial.
```

```bash
bun run scripts/seed-publish.ts --file /tmp/AAAA-MM-DD-slug.md
```

`seed-publish.ts` valida el fichero y luego crea o actualiza el documento Seed con los campos como
atributos (`resultado` y `votos_por_grupo` viajan como JSON). Es idempotente: repite tranquilamente
si algo falla a medias. La clave se toma de `SEED_KEY` (por defecto `vivienda`).

Criterios de redacción:

- Tono neutral e informativo, sin adjetivos valorativos ni atribuir intenciones.
- Cifras, fechas y votos **exactamente** como aparecen en la fuente.
- Usa siempre el nombre corto del partido en `partido` (lista de arriba) para que el filtro agrupe
  bien.
- Abre cada `fuente_url` antes de usarla (HTTP 200 y el contenido corresponde). Si un dominio
  oficial nuevo no está en `src/lib/fuentes.ts`, añádelo solo si es inequívocamente oficial
  (`*.gob.es`, parlamento autonómico, web oficial del partido) y haz commit de ese cambio.

## 4. Disparar el rebuild

La web es estática: lee Seed al construirse, así que hay que provocar un deploy. Por orden de
preferencia:

1. **Deploy hook**: si existe el secreto `CF_DEPLOY_HOOK`, haz `curl -fsS -X POST "$CF_DEPLOY_HOOK"`.
   Es un POST vacío a una URL de Cloudflare que lanza el build de Workers Builds.
2. **Commit vacío**: si no hay deploy hook,
   `git checkout main && git pull --ff-only && git commit --allow-empty -m "novedades: AAAA-MM-DD" && git push origin main`
   — el push dispara el mismo build.

Comprueba **una vez** que el build termina en verde y que la novedad aparece en la web. Si el
build falla por algo ajeno al contenido (configuración de Cloudflare o del CI), no intentes
arreglarlo: indícalo en el resumen.

Si publicaste cambios de código (p. ej. un dominio nuevo en `fuentes.ts`), ese commit ya dispara el
build y no hace falta el paso anterior.

Si no hay novedades, no hagas nada de lo anterior. Termina con un resumen breve: ventana revisada,
fuentes consultadas, novedades publicadas (título + enlace oficial) y descartes dudosos con el
motivo.
