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

/** Por debajo de este número de envíos no se publican porcentajes. */
export const MINIMO = 30;

export interface Fila { id: string; favor: number; neutral: number; contra: number; importa: number }

export function resultados(total: number, filas: Fila[], ahora: number) {
  if (enVeda(ahora)) return { veda: true as const, minimo: MINIMO };
  if (total < MINIMO) return { veda: false as const, minimo: MINIMO, total };
  const afirmaciones = Object.fromEntries(
    filas.filter((f) => IDS.has(f.id)).map(({ id, ...n }) => [id, n]),
  );
  return { veda: false as const, minimo: MINIMO, total, afirmaciones };
}
