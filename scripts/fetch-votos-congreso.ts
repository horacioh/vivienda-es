// Descarga de los datos abiertos del Congreso las votaciones usadas en el
// cuestionario (src/data/cuestionario.ts) y guarda, por votación, el recuento
// por grupo parlamentario y el voto de los diputados del Grupo Mixto.
// Uso: bun run votos
import { writeFileSync } from "node:fs";
import { AFIRMACIONES, ACTORES } from "../src/data/cuestionario";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";
const BASE = "https://www.congreso.es";
const OUT = new URL("../src/data/votos-congreso.json", import.meta.url);

type Voto = "Sí" | "No" | "Abstención" | "No vota";
interface Raw {
  informacion: { sesion: number; numeroVotacion: number; fecha: string; titulo: string; textoExpediente: string };
  totales: { presentes: number; afavor: number; enContra: number; abstenciones: number; noVotan: number };
  votaciones: { diputado: string; grupo: string; voto: Voto }[];
}

const mixto = new Set(ACTORES.flatMap((a) => a.diputados ?? []));
const rutas = [...new Set(AFIRMACIONES.flatMap((a) => a.evidencias.map((e) => e.votacion)))];
const salida: Record<string, unknown> = {};

for (const ruta of rutas) {
  const res = await fetch(BASE + ruta, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${ruta}`);
  const raw = JSON.parse((await res.text()).replace(/^\uFEFF/, "")) as Raw;
  const grupos: Record<string, Partial<Record<Voto, number>>> = {};
  const diputados: Record<string, Voto> = {};
  for (const v of raw.votaciones) {
    const g = (grupos[v.grupo] ??= {});
    g[v.voto] = (g[v.voto] ?? 0) + 1;
    if (mixto.has(v.diputado)) diputados[v.diputado] = v.voto;
  }
  salida[ruta] = {
    sesion: raw.informacion.sesion,
    numero: raw.informacion.numeroVotacion,
    fecha: raw.informacion.fecha,
    totales: {
      si: raw.totales.afavor,
      no: raw.totales.enContra,
      abstencion: raw.totales.abstenciones,
      no_votan: raw.totales.noVotan,
    },
    grupos,
    diputados,
  };
  await Bun.sleep(300);
}

writeFileSync(OUT, JSON.stringify(salida, null, 2) + "\n");
console.log(`${rutas.length} votaciones → ${OUT.pathname}`);
