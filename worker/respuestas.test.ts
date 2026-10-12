import { describe, expect, test } from "bun:test";
import { MINIMO, VEDA, enVeda, resultados, validar } from "./respuestas";

describe("validar", () => {
  test("acepta respuestas de afirmaciones conocidas", () => {
    expect(validar({ respuestas: { urbanismo: [1, 0], sareb: [-1, 1] } })).toEqual({ urbanismo: [1, 0], sareb: [-1, 1] });
  });
  test.each([
    null, [], {}, { respuestas: {} }, { respuestas: [] },
    { respuestas: { inventada: [1, 0] } },
    { respuestas: { urbanismo: [2, 0] } },
    { respuestas: { urbanismo: [1, 2] } },
    { respuestas: { urbanismo: [1] } },
    { respuestas: { urbanismo: "1" } },
  ].map((b) => [b]))("rechaza %j", (b) => expect(validar(b)).toBeNull());
});

describe("veda electoral", () => {
  test("del 24 de noviembre al cierre de colegios del 29", () => {
    expect(enVeda(Date.parse("2026-11-23T22:59:59Z"))).toBe(false);
    expect(enVeda(Date.parse("2026-11-23T23:00:00Z"))).toBe(true);
    expect(enVeda(Date.parse("2026-11-29T19:59:59Z"))).toBe(true);
    expect(enVeda(VEDA.hasta)).toBe(false);
  });
  test("no publica cifras durante la veda", () => {
    expect(resultados(500, [], Date.parse("2026-11-26T12:00:00Z"))).toEqual({ veda: true, minimo: MINIMO });
  });
});

describe("resultados", () => {
  const fuera = Date.parse("2026-10-12T12:00:00Z");
  const fila = { id: "urbanismo", favor: 20, neutral: 5, contra: 10, importa: 3 };
  test("no publica cifras con pocos envíos", () => {
    expect(resultados(MINIMO - 1, [fila], fuera)).toEqual({ veda: false, minimo: MINIMO, total: MINIMO - 1 });
  });
  test("agrega por afirmación e ignora ids desconocidos", () => {
    expect(resultados(40, [fila, { ...fila, id: "otra" }], fuera).afirmaciones).toEqual({
      urbanismo: { favor: 20, neutral: 5, contra: 10, importa: 3 },
    });
  });
});
