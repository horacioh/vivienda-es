import { describe, expect, test } from "bun:test";
import { esFuenteOficial, normalizarUrl } from "../src/lib/fuentes";
import { leerDirectorio, validarNovedades } from "./validate-novedades";

const md = (fm: Record<string, string>) =>
  `---\n${Object.entries(fm)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n`;

const base = {
  fecha: "2026-10-07",
  titulo: '"Real Decreto-ley 29/2026"',
  resumen: '"Resumen."',
  tipo: "ley",
  fuente_url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-20823",
  fuente_nombre: '"BOE"',
};

describe("validarNovedades", () => {
  test("acepta una novedad válida", () => {
    expect(validarNovedades([{ nombre: "2026-10-07-rdl-29.md", contenido: md(base) }])).toEqual([]);
  });

  test("falla si falta fuente_url", () => {
    const { fuente_url: _, ...sinUrl } = base;
    const errores = validarNovedades([{ nombre: "2026-10-07-rdl-29.md", contenido: md(sinUrl) }]);
    expect(errores.join()).toContain("`fuente_url` es obligatorio");
  });

  test("falla con dominios no oficiales o http", () => {
    for (const url of ["https://www.elpais.com/x", "http://www.boe.es/x", "https://boe.es.evil.com/x"]) {
      const errores = validarNovedades([{ nombre: "2026-10-07-x.md", contenido: md({ ...base, fuente_url: url }) }]);
      expect(errores.join()).toContain("fuente_url");
    }
  });

  test("falla con tipo/estado inválidos y nombre que no coincide con la fecha", () => {
    const errores = validarNovedades([
      { nombre: "2026-10-08-x.md", contenido: md({ ...base, tipo: "decreto", estado: "vigente" }) },
    ]).join("\n");
    expect(errores).toContain("`tipo`");
    expect(errores).toContain("`estado`");
    expect(errores).toContain("no coincide");
  });

  test("detecta duplicados por URL normalizada y tipo", () => {
    const otra = { ...base, titulo: '"Otro título"', fuente_url: "https://boe.es/diario_boe/txt.php?id=BOE-A-2026-20823&utm_source=x#a" };
    const errores = validarNovedades([
      { nombre: "2026-10-07-a.md", contenido: md(base) },
      { nombre: "2026-10-07-b.md", contenido: md(otra) },
    ]);
    expect(errores).toEqual(["2026-10-07-b.md: duplicada: misma fuente_url y tipo que 2026-10-07-a.md"]);
  });

  test("permite la misma fuente con distinto tipo", () => {
    const votacion = { ...base, tipo: "votacion", titulo: '"Votación"' };
    expect(
      validarNovedades([
        { nombre: "2026-10-07-a.md", contenido: md(base) },
        { nombre: "2026-10-07-b.md", contenido: md(votacion) },
      ]),
    ).toEqual([]);
  });

  test("detecta duplicados por título y fecha", () => {
    const otra = { ...base, fuente_url: "https://www.congreso.es/es/notas-de-prensa" };
    const errores = validarNovedades([
      { nombre: "2026-10-07-a.md", contenido: md(base) },
      { nombre: "2026-10-07-b.md", contenido: md(otra) },
    ]);
    expect(errores.join()).toContain("mismo título y fecha");
  });
});

describe("fuentes", () => {
  test("esFuenteOficial acepta subdominios oficiales", () => {
    expect(esFuenteOficial("https://www.mivau.gob.es/x")).toBe(true);
    expect(esFuenteOficial("https://ec.europa.eu/x")).toBe(true);
    expect(esFuenteOficial("https://notboe.es/x")).toBe(false);
  });

  test("normalizarUrl ignora www, utm, hash y orden de parámetros", () => {
    expect(normalizarUrl("https://www.boe.es/a?b=2&a=1&utm_x=y#z")).toBe(normalizarUrl("https://boe.es/a?a=1&b=2"));
  });
});

test("las novedades del repo son válidas", () => {
  expect(validarNovedades(leerDirectorio())).toEqual([]);
});
