import { describe, expect, test } from "bun:test";
import { esRuido } from "./fetch-boe";

describe("esRuido", () => {
  test("conserva disposiciones generales y otras disposiciones relevantes", () => {
    expect(esRuido({ seccion: "I. Disposiciones generales", titulo: "Real Decreto-ley 29/2026" })).toBe(false);
    expect(
      esRuido({ seccion: "III. Otras disposiciones", titulo: "Resolución del Banco de España sobre tipos de interés" }),
    ).toBe(false);
  });

  test("descarta nombramientos, oposiciones y anuncios", () => {
    for (const seccion of [
      "II. Autoridades y personal. - A. Nombramientos, situaciones e incidencias",
      "II. Autoridades y personal. - B. Oposiciones y concursos",
      "V. Anuncios. - A. Contratación del Sector Público",
      "V. Anuncios. - B. Otros anuncios oficiales",
    ]) {
      expect(esRuido({ seccion, titulo: "Vivienda" })).toBe(true);
    }
  });

  test("descarta recursos de la DGSJFP contra calificaciones registrales", () => {
    expect(
      esRuido({
        seccion: "III. Otras disposiciones",
        titulo:
          "Resolución de 27 de mayo de 2026, de la Dirección General de Seguridad Jurídica y Fe Pública, en el recurso interpuesto contra la nota de calificación negativa de la registradora de la propiedad",
      }),
    ).toBe(true);
  });
});
