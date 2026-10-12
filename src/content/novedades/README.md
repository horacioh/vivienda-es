# `src/content/novedades`

Cada fichero Markdown de esta carpeta es **una novedad** y la fuente de la verdad del sitio. El
esquema está en [`src/content.config.ts`](../../content.config.ts) (zod): si un fichero no lo cumple,
`astro build` falla. `bun run validate` ([`scripts/validate-novedades.ts`](../../../scripts/validate-novedades.ts))
añade comprobaciones de nombre de fichero y duplicados.

## Nombre del fichero

`AAAA-MM-DD-slug.md` — la fecha es la de publicación oficial y debe coincidir con `fecha`. El nombre
(sin `.md`) es el `id` de la novedad y su URL de detalle: `/novedades/<id>`.

## Campos (frontmatter)

| Campo | Tipo | Obligatorio | Descripción |
| --- | --- | --- | --- |
| `fecha` | fecha `AAAA-MM-DD` | sí | Fecha de publicación en la fuente oficial (BOE, nota de prensa, registro). |
| `titulo` | texto | sí | Título claro en español. En el feed enlaza a la página de detalle; ahí, a `fuente_url`. |
| `resumen` | texto | sí | 1–3 frases neutrales con hechos de la fuente. |
| `tipo` | `ley` \| `propuesta` \| `votacion` \| `aprobacion` \| `otro` | sí | Clase de novedad (filtro “Tipo”). |
| `partido` | texto | no | Partido o grupo que la impulsa, con nombre corto: `PSOE`, `PP`, `VOX`, `Sumar`, `ERC`, `Junts`, `EH Bildu`, `PNV`, `BNG`, `CC`, `UPN`, `Podemos`, `Grupo Mixto` (filtro “Partido”). |
| `institucion` | texto | no | Órgano emisor: Gobierno, Congreso, Senado, ministerio, comunidad autónoma… |
| `estado` | `propuesta` \| `en-tramite` \| `aprobada` \| `rechazada` \| `caducada` | no | Situación actual. `caducada` = decayó por disolución de las Cortes. |
| `fuente_url` | URL `https` | **sí** | Enlace al documento oficial. `z.string().url()` + dominio en la lista de [`src/lib/fuentes.ts`](../../lib/fuentes.ts). |
| `fuente_nombre` | texto | sí | Nombre visible de la fuente, p. ej. `BOE núm. BOE-A-2026-20823`. |
| `resultado` | `{ si, no, abstencion }` | no | Totales de una votación. |
| `votos_por_grupo` | lista de `{ grupo, si, no, abstencion, ausentes? }` | no | Desglose por grupo parlamentario (datos abiertos del Congreso). |

El cuerpo Markdown (opcional) se muestra en la página de detalle; solo debe contener hechos de la fuente.

## Ejemplo

```markdown
---
fecha: 2026-10-07
titulo: "Real Decreto-ley 28/2026, de medidas urgentes para reforzar la estabilidad de los contratos de arrendamiento de vivienda habitual"
resumen: "Modifica el artículo 10 de la Ley de Arrendamientos Urbanos sobre la prórroga de los contratos de alquiler de vivienda habitual."
tipo: ley
institucion: "Gobierno de España (Consejo de Ministros)"
estado: en-tramite
fuente_url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20822"
fuente_nombre: "BOE núm. BOE-A-2026-20822"
---
```

## Duplicados

`bun run validate` rechaza dos novedades con la misma `fuente_url` (normalizada: sin `www`, `utm_*`
ni `#`) **y** el mismo `tipo`, o con el mismo título y fecha. Una misma fuente puede respaldar novedades
de distinto tipo (p. ej. la ley y su votación). Si una fuente recoge varias votaciones, se crea una
novedad por votación, cada una con su `resultado`; para `votacion` con `resultado`, el resultado forma
parte de la clave de duplicado.
