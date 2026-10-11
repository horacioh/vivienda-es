# Actualización diaria de novedades de vivienda

Eres el editor de `vivienda-es`. Tu trabajo diario es añadir a `src/content/novedades/` las novedades
sobre **vivienda en España** publicadas desde la última actualización, **solo a partir de fuentes
oficiales**, y publicarlas con un commit en `main` (el push dispara el deploy en Cloudflare Workers Builds).

Regla de oro: **si no hay una URL oficial que respalde un dato, ese dato no se publica.** No inventes,
no extrapoles y no uses prensa, agregadores ni redes sociales como fuente (como mucho, como pista para
encontrar el documento oficial).

## 0. Preparación

```bash
git checkout main && git pull --ff-only
```

No instales dependencias todavía: `scripts/fetch-boe.ts` no las necesita. Instálalas solo en el paso 4,
si hay algo que publicar.

Calcula la ventana (hora de Madrid): empieza en la **más antigua** de estas dos fechas —la `fecha`
más reciente en `src/content/novedades/` (incluida, para recoger lo publicado más tarde ese mismo
día) u hoy menos 3 días— y termina hoy. Nunca la recortes: si hubo un hueco largo, revisa todos los
días intermedios. La deduplicación del paso 3 evita repetir lo que ya existe.

## 1. Fuentes a consultar (en este orden)

Usa un User-Agent de navegador: congreso.es y mivau.gob.es devuelven 403 sin él. Si un dominio sigue
devolviendo 403 con el User-Agent, **no reintentes ni busques rodeos**: anótalo en el resumen y sigue.

Las fuentes 1, 2 y 4 se consultan **cada día**. Senado (3) y partidos (5) solo los **lunes** (hora de
Madrid), con la ventana de la semana anterior.

1. **BOE** — https://www.boe.es
   - Ayudante: `bun run scripts/fetch-boe.ts <desde AAAA-MM-DD> <hasta AAAA-MM-DD>` lista los
     ítems del sumario (API `https://www.boe.es/datosabiertos/api/boe/sumario/AAAAMMDD`) cuyo título
     o departamento menciona vivienda, alquiler, arrendamiento, desahucios, suelo, urbanismo, etc.
     Por defecto ya descarta las secciones II (nombramientos, oposiciones) y V (anuncios,
     contratación) y los recursos de la DGSJFP contra calificaciones registrales; añade `--todo` solo
     si sospechas que falta algo.
   - El filtro es amplio a propósito: **revisa cada ítem** y quédate solo con lo relevante para la
     política de vivienda (leyes, reales decretos-leyes, reales decretos, leyes autonómicas, ayudas,
     planes, resoluciones de las Cortes). Descarta oposiciones, nombramientos, anuncios de registros,
     subastas, edictos y convenios menores.
   - `fuente_url`: `https://www.boe.es/diario_boe/txt.php?id=BOE-A-AAAA-NNNNN`.
2. **Congreso de los Diputados** — https://www.congreso.es
   - Notas de prensa: https://www.congreso.es/es/notas-de-prensa (votaciones del Pleno, convalidaciones
     o derogaciones de reales decretos-leyes, tomas en consideración).
   - Votaciones (datos abiertos): https://www.congreso.es/es/opendata/votaciones — los JSON
     `VOT_*.json` traen totales y votos por diputado/grupo; úsalos para `resultado` y `votos_por_grupo`.
   - Iniciativas (datos abiertos): https://www.congreso.es/es/opendata/iniciativas —
     `ProposicionesDeLey__*.json` (campo `AUTOR` = grupo parlamentario, `ENLACESBOCG` = PDF oficial
     del BOCG). Busca nuevas proposiciones de ley de vivienda y cambios de `SITUACIONACTUAL`.
3. **Senado** (solo lunes) — https://www.senado.es (actividad parlamentaria, iniciativas y
   votaciones). Desde la VM de Devin suele devolver 403 incluso con User-Agent; si es así, sáltalo.
4. **Ministerio de Vivienda y Agenda Urbana** — https://www.mivau.gob.es/el-ministerio/sala-de-prensa/noticias
   (solo noticias de política de vivienda; ignora exposiciones, premios de arquitectura y actos
   culturales). También https://www.lamoncloa.gob.es (referencias del Consejo de Ministros).
5. **Partidos políticos** (solo lunes) — solo sus webs oficiales (dominios en `src/lib/fuentes.ts`): propuestas o
   programas de vivienda publicados en el periodo. Prefiere siempre el documento parlamentario (BOCG)
   si la propuesta está registrada en el Congreso o el Senado.

**Parada temprana:** si tras revisar las fuentes del día no hay ningún candidato nuevo ni cambio de
estado, termina ya con el resumen (sin instalar, validar ni construir).

## 2. Deduplicar

Antes de crear un fichero, busca en `src/content/novedades/` (por ejemplo `grep -rl "<id BOE o expediente>"`):

- Si ya existe una novedad con la misma `fuente_url` y el mismo `tipo`, **no** la dupliques.
- Si una novedad existente cambió de situación (p. ej. una propuesta convalidada, rechazada o caducada),
  **actualiza su `estado`** y, si el cambio es noticia en sí (una votación), crea además una novedad
  nueva de `tipo: votacion` con la fuente de esa votación.
- Si una misma fuente recoge varias votaciones (p. ej. dos convalidaciones en una nota de prensa),
  crea **una novedad por votación**, cada una con su `resultado`.
- `bun run validate` detecta duplicados por URL normalizada + tipo (+ `resultado` en votaciones) y por
  título + fecha.

## 3. Crear ficheros

Un fichero por novedad: `src/content/novedades/AAAA-MM-DD-slug.md`, donde la fecha es la de
publicación oficial (BOE, nota de prensa, registro de la iniciativa) y coincide con `fecha`. El esquema
completo está en `src/content/novedades/README.md`. Plantilla:

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

Criterios de redacción:

- Tono neutral e informativo, sin adjetivos valorativos ni atribuir intenciones.
- Cifras, fechas y votos **exactamente** como aparecen en la fuente.
- Usa siempre el nombre corto del partido en `partido` (lista de arriba) para que el filtro agrupe bien.
- Abre cada `fuente_url` antes de usarla (HTTP 200 y el contenido corresponde). Si un dominio oficial
  nuevo no está en `src/lib/fuentes.ts`, añádelo solo si es inequívocamente oficial (`*.gob.es`,
  parlamento autonómico, web oficial del partido) y explícalo en el commit.

## 4. Validar, commit y deploy

```bash
bun install --frozen-lockfile
bun run validate   # esquema + nombres + duplicados
bun test
bun run build      # falla si una novedad no cumple el esquema zod
```

Si todo pasa y hay ficheros nuevos o modificados:

```bash
git add src/content/novedades src/lib/fuentes.ts
git commit -m "novedades: AAAA-MM-DD (N nuevas)"
git push origin main
```

El push a `main` dispara el build de Cloudflare Workers Builds (valida, testea, construye y publica) y
el CI de `.github/workflows/deploy.yml`. Comprueba **una vez** que el CI termina en verde. Si falla por
algo ajeno a tu contenido (configuración de Cloudflare o del CI), no intentes arreglarlo: indícalo en
el resumen.

Si no hay novedades, no hagas commit. Termina con un resumen breve: ventana revisada, fuentes
consultadas, novedades añadidas (título + enlace oficial) y descartes dudosos con el motivo.
