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

/** Por debajo de este número de envíos (en total y por afirmación) no se publican porcentajes. */
export const MINIMO = 30;

export const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const ACCION = "compartir";

export const hostnames = (v: string | undefined) =>
  new Set((v ?? "").split(",").map((h) => h.trim()).filter(Boolean));

/** Canonical siteverify: success, the expected action and an approved frontend hostname. */
export async function verificarTurnstile(
  token: unknown,
  o: { secret?: string; hostnames: Set<string>; ip?: string | null },
  f: typeof fetch = fetch,
) {
  if (!o.secret || typeof token !== "string" || !token || token.length > 2048 || o.hostnames.size === 0) return false;
  let r: { success?: boolean; action?: string; hostname?: string };
  try {
    const body = new URLSearchParams({ secret: o.secret, response: token });
    if (o.ip) body.set("remoteip", o.ip);
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

/** Seconds a /api/resultados response may be cached: never past the start of the blackout. */
export function maxAge(ahora: number, normal = 300) {
  const hastaVeda = Math.floor((VEDA.desde - ahora) / 1000);
  return hastaVeda > 0 ? Math.min(normal, hastaVeda) : normal;
}

/**
 * Rate-limit key: the full address for IPv4 and the /64 prefix for IPv6, since a single
 * customer usually controls a whole /64 and could otherwise rotate addresses freely.
 */
export function claveLimite(ip: string | null | undefined): string {
  const v = (ip ?? "").trim().toLowerCase().replace(/%.*$/, "");
  if (!v.includes(":")) return v || "?";
  const mapeada = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapeada) return mapeada[1];
  const partes = v.split("::");
  if (partes.length > 2) return v;
  const trozos = (t: string) => (t ? t.split(":") : []);
  const izq = trozos(partes[0]);
  const der = partes.length === 2 ? trozos(partes[1]) : [];
  const ceros = 8 - izq.length - der.length;
  if (ceros < 0 || (partes.length === 1 && ceros !== 0)) return v;
  const grupos = [...izq, ...Array(ceros).fill("0"), ...der];
  if (!grupos.slice(0, 4).every((g) => /^[0-9a-f]{1,4}$/.test(g))) return v;
  return `${grupos.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`;
}

/**
 * Results are a daily snapshot: only submissions from previous days (UTC) count, so the
 * published figures change once a day and a single submission can't be isolated by
 * polling just before and after it.
 */
export const corte = (ahora: number) => new Date(ahora).toISOString().slice(0, 10);

/** Raw counts per statement (only ever used inside the Worker; never published). */
export interface Fila { id: string; favor: number; neutral: number; contra: number; importa: number }

/** Published per statement: whole percentages only. favor + neutral + contra = 100. */
export interface Porcentajes { favor: number; neutral: number; contra: number; importa: number }

/** Whole percentages that add up to 100 (largest remainder). */
export function redondear(n: number[]): number[] {
  const t = n.reduce((a, b) => a + b, 0);
  if (!t) return n.map(() => 0);
  const exactos = n.map((x) => (x * 100) / t);
  const out = exactos.map(Math.floor);
  let faltan = 100 - out.reduce((a, b) => a + b, 0);
  const orden = exactos.map((x, i) => [x - Math.floor(x), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (const [, i] of orden) if (faltan-- > 0) out[i]++;
  return out;
}

export function resultados(total: number, filas: Fila[], ahora: number) {
  if (enVeda(ahora)) return { veda: true as const, minimo: MINIMO };
  if (total < MINIMO) return { veda: false as const, minimo: MINIMO };
  const afirmaciones: Record<string, Porcentajes> = {};
  for (const f of filas) {
    const n = f.favor + f.neutral + f.contra;
    if (!IDS.has(f.id) || n < MINIMO) continue;
    const [favor, neutral, contra] = redondear([f.favor, f.neutral, f.contra]);
    afirmaciones[f.id] = { favor, neutral, contra, importa: Math.round((f.importa * 100) / n) };
  }
  return { veda: false as const, minimo: MINIMO, total: Math.floor(total / 10) * 10, afirmaciones };
}
