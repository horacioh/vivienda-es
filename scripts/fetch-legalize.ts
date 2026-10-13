// Ayudante de la actualización diaria: consulta la API de legalize.dev
// (https://legalize.dev/api/v1, clave en LEGALIZE_API_KEY) para descubrir leyes
// de vivienda nuevas, seguir reformas de las leyes vigiladas y comprobar su
// estado frente a los documentos Seed publicados.
//
//   bun run scripts/fetch-legalize.ts nuevas <desde> [hasta]      # leyes ES publicadas en la ventana
//   bun run scripts/fetch-legalize.ts ley <BOE-A-...>             # metadatos de una ley (JSON)
//   bun run scripts/fetch-legalize.ts reformas [desde]            # reformas de LEYES_VIGILADAS desde una fecha
//   bun run scripts/fetch-legalize.ts estados                     # estado Legalize vs `estado` de cada doc Seed
//
// `nuevas` aplica un filtro amplio de palabras clave de vivienda (revisa cada
// línea antes de publicar). `estados` cruza los docs Seed que tienen
// legalize_id con el status real en Legalize e imprime los desajustes.
import { LEYES_VIGILADAS } from "./leyes-vigiladas";
import { listNovedadDocs } from "../src/lib/seed";

const API = "https://legalize.dev/api/v1";
const KEY = process.env.LEGALIZE_API_KEY;

const KEYWORDS = [
  "vivienda",
  "alquiler",
  "arrendamiento",
  "desahucio",
  "lanzamiento",
  "suelo",
  "urbanismo",
  "habitación",
  "habitaciones",
  "temporada",
  "inquilino",
  "propiedad horizontal",
  "rehabilitación",
  "alojamiento",
  "turístic",
  "ocupación ilegal",
];

// Contradicciones entre el status de Legalize y el `estado` del esquema de
// novedades (que es parlamentario: propuesta/aprobada/rechazada/caducada).
// Solo se marca DESAJUSTE cuando chocan de verdad; in_force con aprobada o
// sin estado es lo normal.
const CONTRADICE: Record<string, string[]> = {
  in_force: ["rechazada", "caducada", "derogada"],
  repealed: ["aprobada", "en-tramite", "propuesta"],
  annulled: ["aprobada", "en-tramite", "propuesta"],
};

interface LawSummary {
  id: string;
  title: string;
  publication_date?: string;
  law_type?: string;
  status?: string;
}

interface LawDetail extends LawSummary {
  frontmatter?: Record<string, string>;
  reform_count?: number;
  content?: string;
}

interface Reform {
  date: string;
  source_id?: string;
  source_title?: string;
  articles_affected?: string;
}

async function lg(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${KEY}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Legalize ${path} -> ${res.status} ${await res.text()}`);
  return (await res.json()) as Record<string, unknown>;
}

async function* paginarLeyes(params: Record<string, string | number>) {
  let page = 1;
  for (;;) {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries({ ...params, page, per_page: 100 }).map(([k, v]) => [k, String(v)])),
    );
    const data = await lg(`/es/laws?${q}`);
    const results = (data?.results ?? []) as LawSummary[];
    if (!results.length) return;
    yield* results;
    const total = (data?.total as number) ?? 0;
    if (page * 100 >= total) return;
    page += 1;
  }
}

function esDeVivienda(ley: LawSummary): boolean {
  const t = (ley.title ?? "").toLowerCase();
  return KEYWORDS.some((k) => t.includes(k));
}

async function cmdNuevas(desde: string, hasta?: string) {
  for await (const ley of paginarLeyes({ from_date: desde, ...(hasta ? { to_date: hasta } : {}) })) {
    if (!esDeVivienda(ley)) continue;
    console.log(
      [ley.id, ley.publication_date ?? "", ley.status ?? "", ley.law_type ?? "", ley.title ?? ""].join("\t"),
    );
  }
}

async function cmdLey(id: string) {
  const data = (await lg(`/es/laws/${id}`)) as unknown as LawDetail | null;
  if (!data) {
    console.error(`Legalize no conoce la ley ${id}`);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function cmdReformas(desde?: string) {
  for (const { id, nombre } of LEYES_VIGILADAS) {
    const data = await lg(`/es/laws/${id}/reforms`);
    if (!data) {
      console.log(`${id}\t-- no indexada en Legalize --\t${nombre}`);
      continue;
    }
    const reforms = (data.reforms ?? []) as Reform[];
    for (const r of reforms) {
      if (desde && r.date < desde) continue;
      let arts = "";
      try {
        arts = (JSON.parse(r.articles_affected ?? "[]") as string[]).join(", ");
      } catch {
        arts = r.articles_affected ?? "";
      }
      console.log(
        [id, r.date, arts || "-", r.source_id ?? "", r.source_title ?? ""].join("\t"),
      );
    }
  }
}

async function cmdEstados() {
  const docs = await listNovedadDocs();
  // Varios documentos pueden compartir legalize_id (una ley, sus reformas y
  // sus votaciones apuntan a la misma norma): se audita cada uno.
  const porId = new Map<string, { slug: string; estadoDoc?: string }[]>();
  const anota = (id: string, entrada: { slug: string; estadoDoc?: string }) => {
    const lista = porId.get(id) ?? [];
    lista.push(entrada);
    porId.set(id, lista);
  };
  for (const { id } of LEYES_VIGILADAS) {
    anota(id, { slug: "(vigilada)" });
  }
  for (const d of docs) {
    const lid = d.metadata?.legalize_id;
    const slug = d.path?.replace(/^\/novedades\//, "") ?? "";
    if (typeof lid === "string" && lid) {
      anota(lid, {
        slug,
        estadoDoc: typeof d.metadata?.estado === "string" ? d.metadata.estado : undefined,
      });
    }
  }
  for (const [id, entradas] of porId) {
    const data = (await lg(`/es/laws/${id}`)) as unknown as LawDetail | null;
    const status = (data?.status ?? data?.frontmatter?.status) as string | undefined;
    if (!status) {
      console.log(`${id}\t(no indexada)\t${entradas.map((e) => e.slug).join(", ")}`);
      continue;
    }
    for (const info of entradas) {
      const marca = info.estadoDoc && (CONTRADICE[status] ?? []).includes(info.estadoDoc) ? "DESAJUSTE" : "ok";
      console.log(`${marca}\t${id}\tstatus=${status}\testado_doc=${info.estadoDoc ?? "-"}\t${info.slug}`);
    }
  }
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!KEY) {
    console.error("Falta LEGALIZE_API_KEY en el entorno (clave leg_* de legalize.dev).");
    process.exit(1);
  }
  switch (cmd) {
    case "nuevas": {
      if (!args[0]) throw new Error("uso: nuevas <AAAA-MM-DD> [hasta]");
      await cmdNuevas(args[0], args[1]);
      break;
    }
    case "ley": {
      if (!args[0]) throw new Error("uso: ley <BOE-A-...>");
      await cmdLey(args[0]);
      break;
    }
    case "reformas":
      await cmdReformas(args[0]);
      break;
    case "estados":
      await cmdEstados();
      break;
    default:
      console.error(
        "uso: fetch-legalize.ts nuevas <desde> [hasta] | ley <id> | reformas [desde] | estados",
      );
      process.exitCode = 1;
  }
}

await main();
