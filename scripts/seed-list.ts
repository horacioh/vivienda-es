// Lista las novedades publicadas en Seed (para deduplicar antes de escribir).
//   bun run scripts/seed-list.ts
import { listNovedadDocs, NOVEDADES_PATH } from "../src/lib/seed";

const docs = await listNovedadDocs();
for (const d of docs) {
  const m = d.metadata as Record<string, unknown>;
  console.log(`${d.path.replace(new RegExp(`^/?${NOVEDADES_PATH}/?`), "")}\t${m.fecha ?? ""}\t${m.fuente_url ?? ""}\t${m.titulo ?? m.name ?? ""}`);
}
console.error(`${docs.length} documentos bajo /${NOVEDADES_PATH}`);
