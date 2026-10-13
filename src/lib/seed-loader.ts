// Loader de la colección `novedades`: la fuente de datos son los documentos
// Seed publicados bajo /<cuenta>/novedades/ en el sitio del proyecto
// (vivienda-es.hyper.media). Los metadatos del documento guardan los campos del
// frontmatter original (tipo, estado, fuente_url, resultado, votos_por_grupo…)
// y el contenido del documento es el cuerpo en bloques HM.
import type { Loader } from "astro/loaders";
import { getDocument, listNovedadDocs, NOVEDADES_PATH } from "./seed";
import { renderBloques } from "./seed-render";
import { normalizarUrl } from "./fuentes";
import { slugify } from "./novedades";

// Los atributos Seed son escalares: los campos estructurados viajan como JSON.
const jsonAttr = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  try {
    const p = JSON.parse(v);
    return p && typeof p === "object" ? p : v;
  } catch {
    return v;
  }
};

export function novedadesSeedLoader(): Loader {
  return {
    name: "novedades-seed",
    async load({ store, parseData, generateDigest, logger }) {
      store.clear();
      const docs = await listNovedadDocs();
      // Con cero documentos el build generaría una portada vacía: mejor fallar.
      if (!docs.length) throw new Error(`Seed no devolvió novedades (¿falta publicar en ${NOVEDADES_PATH}?)`);
      const porUrl = new Set<string>();
      const porTitulo = new Set<string>();
      for (const info of docs) {
        // La API devuelve rutas con barra inicial ("/novedades/<slug>").
        const slug = info.path.replace(new RegExp(`^/?${NOVEDADES_PATH}/?`), "");
        if (!slug || slug.includes("/")) {
          logger.warn(`ignorando documento con ruta inesperada: ${info.path}`);
          continue;
        }
        const doc = await getDocument(info.path);
        const m = doc.metadata;
        const data = await parseData({
          id: slug,
          data: {
            fecha: new Date(String(m.fecha ?? m.displayPublishTime)),
            titulo: m.titulo ?? m.name,
            resumen: m.resumen ?? m.summary,
            tipo: m.tipo,
            partido: m.partido,
            institucion: m.institucion,
            estado: m.estado,
            fuente_url: m.fuente_url,
            fuente_nombre: m.fuente_nombre,
            legalize_id: m.legalize_id,
            resultado: jsonAttr(m.resultado),
            votos_por_grupo: jsonAttr(m.votos_por_grupo),
          },
        });
        // Las mismas reglas de duplicados que valida scripts/validate-novedades.
        const res = data.resultado as { si?: number; no?: number; abstencion?: number } | undefined;
        const votos = data.tipo === "votacion" && res ? `|${res.si}-${res.no}-${res.abstencion ?? 0}` : "";
        const claveUrl = `${normalizarUrl(String(data.fuente_url))}|${data.tipo}${votos}`;
        if (porUrl.has(claveUrl)) throw new Error(`novedad duplicada (fuente + tipo): ${info.path}`);
        porUrl.add(claveUrl);
        const claveTitulo = `${(data.fecha as Date).toISOString().slice(0, 10)}|${slugify(String(data.titulo))}`;
        if (porTitulo.has(claveTitulo)) throw new Error(`novedad duplicada (título + fecha): ${info.path}`);
        porTitulo.add(claveTitulo);
        store.set({
          id: slug,
          data,
          // La versión CID del documento Seed es un digest perfecto.
          digest: doc.version || generateDigest(info.path),
          rendered: { html: renderBloques(doc.content) },
        });
      }
      // Solo un doc índice (/novedades) también desplegaría la portada vacía.
      if (!store.keys().length) throw new Error(`Seed no devolvió novedades válidas (¿falta publicar en ${NOVEDADES_PATH}?)`);
      logger.info(`${store.keys().length} novedades desde Seed`);
    },
  };
}
