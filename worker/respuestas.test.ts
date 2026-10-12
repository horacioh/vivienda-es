import { describe, expect, test } from "bun:test";
import { BORRADO, MINIMO, VEDA, cerrado, enVeda, maxAge, resultados, validar, verificarTurnstile, ACCION, hostnames } from "./respuestas";

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

describe("borrado", () => {
  test("acepta envíos hasta el 31 de diciembre de 2026", () => {
    expect(cerrado(Date.parse("2026-12-31T22:59:59Z"))).toBe(false);
    expect(cerrado(Date.parse("2026-12-31T23:00:00Z"))).toBe(true);
  });
  test("después del borrado no hay cifras", () => {
    expect(resultados(500, [], BORRADO)).toEqual({ veda: false, cerrado: true, minimo: MINIMO });
  });
  test("no se cachea más allá del borrado", () => expect(maxAge(BORRADO - 30_000)).toBe(30));
});

describe("maxAge", () => {
  test("5 minutos lejos de la veda", () => expect(maxAge(VEDA.desde - 3600_000)).toBe(300));
  test("no se cachea más allá del inicio de la veda", () => expect(maxAge(VEDA.desde - 60_000)).toBe(60));
  test("durante y después de la veda, 5 minutos", () => {
    expect(maxAge(VEDA.desde + 1)).toBe(300);
    expect(maxAge(VEDA.hasta + 1)).toBe(300);
  });
});

describe("verificarTurnstile", () => {
  const hs = hostnames("vivienda-es.hhg.app");
  const o = { secret: "s", hostnames: hs };
  const responde = (r: unknown, ok = true) => (async () => new Response(JSON.stringify(r), { status: ok ? 200 : 500 })) as unknown as typeof fetch;
  const bueno = { success: true, action: ACCION, hostname: "vivienda-es.hhg.app" };
  test("acepta éxito con la acción y el hostname esperados", async () => expect(await verificarTurnstile("t", o, responde(bueno))).toBe(true));
  test("rechaza otra acción", async () => expect(await verificarTurnstile("t", o, responde({ ...bueno, action: "login" }))).toBe(false));
  test("rechaza sin acción (claves de prueba)", async () => expect(await verificarTurnstile("t", o, responde({ success: true, hostname: "vivienda-es.hhg.app" }))).toBe(false));
  test("rechaza otro hostname", async () => expect(await verificarTurnstile("t", o, responde({ ...bueno, hostname: "localhost" }))).toBe(false));
  test("rechaza si Cloudflare dice que no", async () => expect(await verificarTurnstile("t", o, responde({ ...bueno, success: false }))).toBe(false));
  test("rechaza si Cloudflare falla o no responde", async () => {
    expect(await verificarTurnstile("t", o, responde({}, false))).toBe(false);
    const cae = (async () => { throw new Error("red"); }) as unknown as typeof fetch;
    expect(await verificarTurnstile("t", o, cae)).toBe(false);
  });
  test("sin secret, sin hostnames o sin token no llama a Cloudflare", async () => {
    const nunca = (() => { throw new Error("no debería llamar"); }) as unknown as typeof fetch;
    expect(await verificarTurnstile("t", { ...o, secret: undefined }, nunca)).toBe(false);
    expect(await verificarTurnstile("t", { ...o, hostnames: hostnames(" , ") }, nunca)).toBe(false);
    expect(await verificarTurnstile("", o, nunca)).toBe(false);
    expect(await verificarTurnstile("x".repeat(2049), o, nunca)).toBe(false);
  });
  test("no envía la IP a Cloudflare", async () => {
    let enviado = "";
    const espia = (async (_u: string, i: RequestInit) => ((enviado = String(i.body)), new Response(JSON.stringify(bueno)))) as unknown as typeof fetch;
    await verificarTurnstile("t", o, espia);
    expect(enviado).not.toContain("remoteip");
  });
});
