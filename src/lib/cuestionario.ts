import { ACTORES, AFIRMACIONES, type Actor, type Afirmacion, type Evidencia } from "../data/cuestionario";
import votosJson from "../data/votos-congreso.json";

export type Voto = "Sí" | "No" | "Abstención" | "No vota";
type Recuento = Partial<Record<Voto, number>>;

interface VotacionCongreso {
  sesion: number;
  numero: number;
  fecha: string;
  totales: { si: number; no: number; abstencion: number; no_votan: number };
  grupos: Record<string, Recuento>;
  diputados: Record<string, Voto>;
}

const VOTOS = votosJson as Record<string, VotacionCongreso>;
const CONGRESO = "https://www.congreso.es";

export const urlDatos = (ruta: string) => CONGRESO + ruta;
export const urlIniciativa = (expediente: string) =>
  `${CONGRESO}/es/busqueda-de-iniciativas?p_p_id=iniciativas&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view&_iniciativas_mode=mostrarDetalle&_iniciativas_legislatura=XV&_iniciativas_id=${expediente}`;

/** Postura: +1 a favor de la afirmación, −1 en contra, 0 abstención; null si no votó. */
export interface PosturaEvidencia {
  evidencia: Evidencia;
  voto: Voto | null;
  recuento: Recuento;
  postura: number | null;
  unanime: boolean;
}

export interface Postura {
  actor: Actor;
  valor: number | null;
  evidencias: PosturaEvidencia[];
}

function recuentoActor(actor: Actor, v: VotacionCongreso): Recuento {
  if (!actor.diputados) return v.grupos[actor.grupo] ?? {};
  const r: Recuento = {};
  for (const d of actor.diputados) {
    const voto = v.diputados[d];
    if (voto) r[voto] = (r[voto] ?? 0) + 1;
  }
  return r;
}

function mayoria(r: Recuento): Voto | null {
  const emitidos = (["Sí", "No", "Abstención"] as const).map((k) => [k, r[k] ?? 0] as const).filter(([, n]) => n > 0);
  if (!emitidos.length) return null;
  emitidos.sort((a, b) => b[1] - a[1]);
  return emitidos[0][0];
}

function signo(voto: Voto | null, sentido: Evidencia["sentido"]): number | null {
  if (voto === "Abstención") return 0;
  if (voto === "Sí") return sentido === "si" ? 1 : -1;
  if (voto === "No") return sentido === "si" ? -1 : 1;
  return null;
}

export function postura(actor: Actor, a: Afirmacion): Postura {
  const evidencias = a.evidencias.map((evidencia) => {
    const v = VOTOS[evidencia.votacion];
    if (!v) throw new Error(`Falta ${evidencia.votacion} en votos-congreso.json: ejecuta \`bun run votos\``);
    const recuento = recuentoActor(actor, v);
    const voto = mayoria(recuento);
    const emitidos = (["Sí", "No", "Abstención"] as const).filter((k) => (recuento[k] ?? 0) > 0);
    return { evidencia, voto, recuento, postura: signo(voto, evidencia.sentido), unanime: emitidos.length <= 1 };
  });
  const validas = evidencias.map((e) => e.postura).filter((p): p is number => p !== null);
  const valor = validas.length ? validas.reduce((s, p) => s + p, 0) / validas.length : null;
  return { actor, valor, evidencias };
}

export function totales(ruta: string) {
  return VOTOS[ruta]?.totales;
}

export const MATRIZ = AFIRMACIONES.map((a) => ({ afirmacion: a, posturas: ACTORES.map((actor) => postura(actor, a)) }));
export { ACTORES, AFIRMACIONES };
