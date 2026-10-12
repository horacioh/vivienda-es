// Publica novedades como documentos Seed bajo /<cuenta>/novedades/<slug>.
//
//   bun run scripts/seed-publish.ts                 # todo src/content/novedades
//   bun run scripts/seed-publish.ts <slug>          # una sola, por slug
//   bun run scripts/seed-publish.ts --file <md>     # un fichero suelto (slug = nombre)
//   SEED_KEY=<nombre> bun run scripts/seed-publish.ts ...
//
// Requisitos: la clave con permiso de escritura en la cuenta del sitio tiene que
// estar en el keyring de seed-cli (`npx @seed-hypermedia/cli@latest key import`).
// Los valores estructurados del frontmatter (resultado, votos_por_grupo) viajan
// como cadenas JSON porque los atributos Seed solo admiten escalares.
import { execFileSync } from "node:child_process";
import { basename, join } from "node:path";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import YAML from "yaml";
import { SEED_ACCOUNT, SEED_ORIGIN, listNovedadDocs, novedadPath, seedHmId } from "../src/lib/seed";
import { normalizarUrl } from "../src/lib/fuentes";
import { novedadSchema } from "../src/lib/novedad-schema";
import { slugify } from "../src/lib/novedades";
import { leerDirectorio, validarNovedades, type Fichero } from "./validate-novedades";

// La clave llega mejor por entorno (SEED_CLI_KEYFILE con el .hmkey.json sin
// cifrar, o SEED_CLI_MNEMONIC): funciona en máquinas sin keyring. Si no, se usa
// el nombre del keyring en SEED_KEY (por defecto "vivienda").
const key = process.env.SEED_CLI_KEYFILE || process.env.SEED_CLI_MNEMONIC ? "env" : (process.env.SEED_KEY ?? "vivienda");
const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");

let ficheros: Fichero[];
if (fileIdx >= 0) {
  const ruta = args[fileIdx + 1];
  ficheros = [{ nombre: basename(ruta), contenido: readFileSync(ruta, "utf8") }];
} else {
  const solo = args[0];
  ficheros = leerDirectorio().filter((f) => !solo || f.nombre === `${solo}.md`);
  if (solo && !ficheros.length) throw new Error(`no existe ${solo}.md en src/content/novedades`);
}

const errores = validarNovedades(ficheros);

// El validador replica el esquema a mano; además se aplica el esquema zod real
// a los campos tal como los verá el loader (objetos viajan como JSON en los
// metadatos). Sin esto, un `resultado` o `votos_por_grupo` mal formado se
// publicaría y el siguiente build fallaría con el documento ya en Seed.
const jsonAttr = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  try {
    const p = JSON.parse(v);
    return p && typeof p === "object" ? p : v;
  } catch {
    return v;
  }
};
for (const { nombre, contenido } of ficheros) {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(contenido);
  if (!m) continue; // ya lo reporta validarNovedades
  const fm = YAML.parse(m[1]) as Record<string, unknown>;
  const parse = novedadSchema.safeParse({
    fecha: fm.fecha instanceof Date ? fm.fecha : new Date(String(fm.fecha)),
    titulo: fm.titulo,
    resumen: fm.resumen,
    tipo: fm.tipo,
    partido: fm.partido,
    institucion: fm.institucion,
    estado: fm.estado,
    fuente_url: fm.fuente_url,
    fuente_nombre: fm.fuente_nombre,
    resultado: jsonAttr(fm.resultado),
    votos_por_grupo: jsonAttr(fm.votos_por_grupo),
  });
  if (!parse.success) {
    errores.push(`${nombre}: no cumple el esquema de la colección: ${parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
}

// Deduplica también contra lo ya publicado en Seed: validarNovedades solo ve
// los ficheros de esta ejecución, y un duplicado con otro slug haría fallar
// el build por las reglas del loader. Mismo slug no es duplicado: es update.
const publicados = await listNovedadDocs();
const clavesSeed = new Map<string, string>();
for (const info of publicados) {
  const slug = info.path.replace(new RegExp(`^/?novedades/?`), "");
  if (!slug || slug.includes("/")) continue;
  const m = info.metadata;
  const r = jsonAttr(m.resultado) as { si?: number; no?: number; abstencion?: number } | undefined;
  const votos = m.tipo === "votacion" && r ? `|${r.si}-${r.no}-${r.abstencion ?? 0}` : "";
  if (typeof m.fuente_url === "string") clavesSeed.set(`${normalizarUrl(m.fuente_url)}|${m.tipo}${votos}`, slug);
  const fecha = new Date(String(m.fecha ?? m.displayPublishTime)).toISOString().slice(0, 10);
  if (typeof m.titulo === "string") clavesSeed.set(`${fecha}|${slugify(m.titulo)}`, slug);
}
for (const { nombre, contenido } of ficheros) {
  const slug = nombre.replace(/\.md$/, "");
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(contenido);
  if (!m) continue;
  const fm = YAML.parse(m[1]) as Record<string, unknown>;
  const r = fm.resultado as { si?: number; no?: number; abstencion?: number } | undefined;
  const votos = fm.tipo === "votacion" && r && typeof r === "object" ? `|${r.si}-${r.no}-${r.abstencion ?? 0}` : "";
  const fecha = fm.fecha instanceof Date ? fm.fecha.toISOString().slice(0, 10) : String(fm.fecha).slice(0, 10);
  const candidatas = [
    `${normalizarUrl(String(fm.fuente_url))}|${fm.tipo}${votos}`,
    `${fecha}|${slugify(String(fm.titulo))}`,
  ];
  for (const clave of candidatas) {
    const previo = clavesSeed.get(clave);
    if (previo && previo !== slug) errores.push(`${nombre}: duplicada en Seed con el documento /novedades/${previo}`);
  }
}

if (errores.length) {
  console.error(`✗ ${errores.length} error(es):\n${errores.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}

const cli = (...cliArgs: string[]) =>
  execFileSync("npx", ["-y", "@seed-hypermedia/cli@latest", ...cliArgs], { stdio: ["ignore", "inherit", "inherit"] });

const existe = async (path: string) => {
  const res = await fetch(`${SEED_ORIGIN}/api/Resource?id=${encodeURIComponent(seedHmId(path))}`);
  if (!res.ok) return false;
  const { json } = (await res.json()) as { json?: { type?: string } };
  return json?.type === "document";
};

// Los atributos Seed son escalares (string/int/bool): objetos y arrays se
// serializan a JSON para que el loader los recupere con JSON.parse.
const escalar = (v: unknown) => (v && typeof v === "object" ? JSON.stringify(v) : v);

const tmp = mkdtempSync(join(tmpdir(), "seed-pub-"));
try {
  if (!(await existe("novedades"))) {
    writeFileSync(join(tmp, "indice.md"), "Novedades sobre vivienda en España.\n");
    cli(
      "document", "create", "-f", join(tmp, "indice.md"), "-p", "novedades",
      "--account", SEED_ACCOUNT, "--key", key,
      "--metadata", JSON.stringify({ name: "Novedades", summary: "Cambios normativos y votaciones sobre vivienda en España." }),
    );
  }

  for (const { nombre, contenido } of ficheros) {
    const slug = nombre.replace(/\.md$/, "");
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(contenido);
    if (!m) throw new Error(`${nombre}: frontmatter no encontrado`);
    const fm = YAML.parse(m[1]) as Record<string, unknown>;
    const fecha = fm.fecha instanceof Date ? fm.fecha.toISOString().slice(0, 10) : String(fm.fecha).slice(0, 10);

    const file = join(tmp, `${slug}.md`);
    writeFileSync(file, `${m[2].trim()}\n`);
    const metadata = JSON.stringify({
      name: fm.titulo,
      summary: fm.resumen,
      displayPublishTime: fecha,
      titulo: fm.titulo,
      resumen: fm.resumen,
      tipo: fm.tipo,
      partido: escalar(fm.partido),
      institucion: escalar(fm.institucion),
      estado: fm.estado,
      fuente_url: fm.fuente_url,
      fuente_nombre: fm.fuente_nombre,
      fecha,
      resultado: escalar(fm.resultado),
      votos_por_grupo: escalar(fm.votos_por_grupo),
    });

    const path = novedadPath(slug);
    const cmd = (await existe(path))
      ? ["document", "update", seedHmId(path), "-f", file, "--key", key]
      : ["document", "create", "-f", file, "-p", path, "--account", SEED_ACCOUNT, "--key", key];
    console.log(`${cmd[1] === "update" ? "actualizando" : "creando"} ${slug}`);
    cli(...cmd, "--metadata", metadata);
  }
  console.log(`Listo: ${ficheros.length} novedades en ${SEED_ORIGIN}/novedades`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
