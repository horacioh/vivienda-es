import { describe, expect, test } from "bun:test";
import { MINIMO, VEDA, claveLimite, corte, enVeda, maxAge, redondear, resultados, validar, verificarTurnstile, ACCION, hostnames } from "./respuestas";

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
  test("con pocos envíos no publica cifras ni el total", () => {
    expect(resultados(MINIMO - 1, [fila], fuera)).toEqual({ veda: false, minimo: MINIMO });
  });
  test("publica porcentajes redondeados, nunca recuentos, e ignora ids desconocidos", () => {
    expect(resultados(40, [fila, { ...fila, id: "otra" }], fuera).afirmaciones).toEqual({
      urbanismo: { favor: 57, neutral: 14, contra: 29, importa: 9 },
    });
  });
  test("omite las afirmaciones con menos de MINIMO respuestas", () => {
    const poca = { id: "sareb", favor: MINIMO - 2, neutral: 0, contra: 1, importa: 0 };
    expect(resultados(40, [fila, poca], fuera).afirmaciones).not.toHaveProperty("sareb");
  });
  test("redondea el total a la decena inferior", () => {
    expect(resultados(47, [], fuera).total).toBe(40);
    expect(resultados(MINIMO, [], fuera).total).toBe(30);
  });
  test("un envío más no siempre cambia los porcentajes", () => {
    const base = { id: "urbanismo", favor: 400, neutral: 100, contra: 500, importa: 300 };
    const uno = { ...base, favor: 401, importa: 301 };
    expect(resultados(1001, [uno], fuera)).toEqual(resultados(1000, [base], fuera));
  });
});

describe("redondear", () => {
  test("suma 100", () => {
    expect(redondear([1, 1, 1])).toEqual([34, 33, 33]);
    expect(redondear([20, 5, 10])).toEqual([57, 14, 29]);
    expect(redondear([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe("corte diario", () => {
  test("solo cuentan los envíos de días anteriores (UTC)", () => {
    expect(corte(Date.parse("2026-10-12T00:00:00Z"))).toBe("2026-10-12");
    expect(corte(Date.parse("2026-10-12T23:59:59Z"))).toBe("2026-10-12");
  });
});

describe("claveLimite", () => {
  test("IPv4 completa", () => expect(claveLimite("203.0.113.7")).toBe("203.0.113.7"));
  test("IPv6: todas las direcciones de un /64 comparten clave", () => {
    const k = claveLimite("2001:db8:1:2::1");
    expect(k).toBe("2001:db8:1:2::/64");
    expect(claveLimite("2001:0DB8:0001:0002:ffff:eeee:dddd:cccc")).toBe(k);
    expect(claveLimite("2001:db8:1:2:abcd::")).toBe(k);
    expect(claveLimite("2001:db8:1:3::1")).not.toBe(k);
  });
  test("IPv6 comprimida al principio y con zona", () => {
    expect(claveLimite("::1")).toBe("0:0:0:0::/64");
    expect(claveLimite("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });
  test("IPv4 mapeada en IPv6", () => expect(claveLimite("::ffff:203.0.113.7")).toBe("203.0.113.7"));
  test("sin IP", () => {
    expect(claveLimite(null)).toBe("?");
    expect(claveLimite("")).toBe("?");
  });
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
  test("envía remoteip si hay IP", async () => {
    let enviado = "";
    const espia = (async (_u: string, i: RequestInit) => ((enviado = String(i.body)), new Response(JSON.stringify(bueno)))) as unknown as typeof fetch;
    await verificarTurnstile("t", { ...o, ip: "203.0.113.1" }, espia);
    expect(enviado).toContain("remoteip=203.0.113.1");
  });
});
