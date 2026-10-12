/**
 * Valida y deduplica src/content/novedades/*.md antes del commit/build.
 * Las reglas replican el esquema zod de src/content.config.ts y añaden
 * comprobaciones que zod no puede hacer (nombre de fichero, duplicados).
 *
 *   bun run validate
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import { esFuenteOficial, normalizarUrl } from "../src/lib/fuentes";
import { ESTADOS, NOMBRE_FICHERO, TIPOS, slugify } from "../src/lib/novedades";

export const DIR = join(import.meta.dir, "../src/content/novedades");

export interface Fichero {
  nombre: string;
  contenido: string;
}

export function leerFrontmatter(contenido: string): Record<string, unknown> | null {
  const m = contenido.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!m) return null;
  const data = YAML.parse(m[1]);
  return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
}

const texto = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function isoFecha(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v))) return v;
  return null;
}

export function validarNovedades(ficheros: Fichero[]): string[] {
  const errores: string[] = [];
  const porUrl = new Map<string, string>();
  const porTitulo = new Map<string, string>();

  for (const { nombre, contenido } of ficheros) {
    const err = (msg: string) => errores.push(`${nombre}: ${msg}`);
    const nombreOk = NOMBRE_FICHERO.exec(nombre);
    if (!nombreOk) err("el nombre debe seguir AAAA-MM-DD-slug.md (minúsculas, números y guiones)");

    let d: Record<string, unknown> | null;
    try {
      d = leerFrontmatter(contenido);
    } catch (e) {
      err(`frontmatter YAML inválido (${(e as Error).message})`);
      continue;
    }
    if (!d) {
      err("falta el frontmatter (--- ... ---)");
      continue;
    }

    const fecha = isoFecha(d.fecha);
    if (!fecha) err("`fecha` es obligatoria y debe ser AAAA-MM-DD");
    else if (nombreOk && nombreOk[1] !== fecha) err(`la fecha del nombre (${nombreOk[1]}) no coincide con \`fecha\` (${fecha})`);

    for (const campo of ["titulo", "resumen", "fuente_nombre"]) if (!texto(d[campo])) err(`\`${campo}\` es obligatorio`);
    if (!TIPOS.includes(d.tipo as never)) err(`\`tipo\` debe ser uno de: ${TIPOS.join(", ")}`);
    if (d.estado !== undefined && !ESTADOS.includes(d.estado as never)) err(`\`estado\` debe ser uno de: ${ESTADOS.join(", ")}`);
    for (const campo of ["partido", "institucion"]) if (d[campo] !== undefined && !texto(d[campo])) err(`\`${campo}\` no puede estar vacío`);

    if (!texto(d.fuente_url)) {
      err("`fuente_url` es obligatorio");
      continue;
    }
    const url = d.fuente_url as string;
    if (!esFuenteOficial(url)) {
      err(`\`fuente_url\` no es https o su dominio no está en src/lib/fuentes.ts: ${url}`);
      continue;
    }

    const r = d.resultado as Record<string, unknown> | undefined;
    const votos = d.tipo === "votacion" && r && typeof r === "object" ? `|${r.si}-${r.no}-${r.abstencion ?? 0}` : "";
    const claveUrl = `${normalizarUrl(url)}|${d.tipo}${votos}`;
    const previo = porUrl.get(claveUrl);
    if (previo) err(`duplicada: misma fuente_url y tipo que ${previo}`);
    else porUrl.set(claveUrl, nombre);

    if (fecha && texto(d.titulo)) {
      const claveTitulo = `${fecha}|${slugify(d.titulo as string)}`;
      const previoT = porTitulo.get(claveTitulo);
      if (previoT) err(`duplicada: mismo título y fecha que ${previoT}`);
      else porTitulo.set(claveTitulo, nombre);
    }
  }
  return errores;
}

export function leerDirectorio(dir = DIR): Fichero[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort()
    .map((nombre) => ({ nombre, contenido: readFileSync(join(dir, nombre), "utf8") }));
}

if (import.meta.main) {
  const ficheros = leerDirectorio();
  const errores = validarNovedades(ficheros);
  if (errores.length) {
    console.error(`✗ ${errores.length} error(es) en src/content/novedades:\n${errores.map((e) => `  - ${e}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`✓ ${ficheros.length} novedades válidas y sin duplicados`);
}
