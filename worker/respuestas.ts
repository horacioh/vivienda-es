import { AFIRMACIONES } from "../src/data/cuestionario";

export const IDS = new Set(AFIRMACIONES.map((a) => a.id));

/** Respuestas por afirmación: [valor (-1, 0, 1), importa (0 | 1)]. Las saltadas no se envían. */
export type Envio = Record<string, [number, number]>;

export function validar(body: unknown): Envio | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const r = (body as { respuestas?: unknown }).respuestas;
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  const out: Envio = {};
  for (const [id, v] of Object.entries(r)) {
    if (!IDS.has(id) || !Array.isArray(v) || v.length !== 2) return null;
    const [valor, importa] = v;
    if (![-1, 0, 1].includes(valor) || ![0, 1].includes(importa)) return null;
    out[id] = [valor, importa];
  }
  return Object.keys(out).length ? out : null;
}

// LOREG art. 69.7: no se publican sondeos los cinco días anteriores a la votación,
// hasta el cierre de los colegios (20:00 en Canarias, 21:00 en la península).
export const VEDA = { desde: Date.parse("2026-11-24T00:00:00+01:00"), hasta: Date.parse("2026-11-29T21:00:00+01:00") };
export const enVeda = (t: number) => t >= VEDA.desde && t < VEDA.hasta;

/** Desde esta fecha no se aceptan envíos y la tarea diaria borra todos los guardados (ver /privacidad). */
export const BORRADO = Date.parse("2027-01-01T00:00:00+01:00");
export const cerrado = (t: number) => t >= BORRADO;

/** Por debajo de este número de envíos no se publican porcentajes. */
export const MINIMO = 30;

export const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const ACCION = "compartir";

export const hostnames = (v: string | undefined) =>
  new Set((v ?? "").split(",").map((h) => h.trim()).filter(Boolean));

/** Canonical siteverify: success, the expected action and an approved frontend hostname. */
export async function verificarTurnstile(
  token: unknown,
  o: { secret?: string; hostnames: Set<string> },
  f: typeof fetch = fetch,
) {
  if (!o.secret || typeof token !== "string" || !token || token.length > 2048 || o.hostnames.size === 0) return false;
  let r: { success?: boolean; action?: string; hostname?: string };
  try {
    const body = new URLSearchParams({ secret: o.secret, response: token });
    const res = await f(SITEVERIFY, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body,
    });
    if (!res.ok) return false;
    r = await res.json();
  } catch {
    return false;
  }
  return r.success === true && r.action === ACCION && !!r.hostname && o.hostnames.has(r.hostname);
}

/** Seconds a /api/resultados response may be cached: never past the start of the blackout or the deletion date. */
export function maxAge(ahora: number, normal = 300) {
  const limites = [VEDA.desde, BORRADO].filter((t) => t > ahora).map((t) => Math.floor((t - ahora) / 1000));
  return Math.min(normal, ...limites);
}

export interface Fila { id: string; favor: number; neutral: number; contra: number; importa: number }

export function resultados(total: number, filas: Fila[], ahora: number) {
  if (cerrado(ahora)) return { veda: false as const, cerrado: true as const, minimo: MINIMO };
  if (enVeda(ahora)) return { veda: true as const, minimo: MINIMO };
  if (total < MINIMO) return { veda: false as const, minimo: MINIMO, total };
  const afirmaciones = Object.fromEntries(
    filas.filter((f) => IDS.has(f.id)).map(({ id, ...n }) => [id, n]),
  );
  return { veda: false as const, minimo: MINIMO, total, afirmaciones };
}
