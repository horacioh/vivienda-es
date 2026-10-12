// Esquema zod compartido de una novedad: lo usa el loader de la colección en
// el build y también scripts/seed-publish.ts, que valida contra él cada
// documento antes de publicarlo en Seed. Así un campo mal formado no llega a
// producción y el siguiente build no falla con un documento ya publicado.
import { z } from "astro/zod";
import { esFuenteOficial } from "./fuentes";
import { ESTADOS, TIPOS } from "./novedades";

const voto = z.object({
  grupo: z.string(),
  si: z.number().int().nonnegative(),
  no: z.number().int().nonnegative(),
  abstencion: z.number().int().nonnegative().default(0),
});

export const novedadSchema = z.object({
  fecha: z.date(),
  titulo: z.string().min(1),
  resumen: z.string().min(1),
  tipo: z.enum(TIPOS),
  partido: z.string().optional(),
  institucion: z.string().optional(),
  estado: z.enum(ESTADOS).optional(),
  fuente_url: z
    .string()
    .url()
    .refine(esFuenteOficial, "fuente_url debe ser https y de un dominio oficial (src/lib/fuentes.ts)"),
  fuente_nombre: z.string().min(1),
  resultado: z
    .object({
      si: z.number().int().nonnegative(),
      no: z.number().int().nonnegative(),
      abstencion: z.number().int().nonnegative().default(0),
    })
    .optional(),
  votos_por_grupo: z.array(voto).optional(),
});

export type Novedad = z.infer<typeof novedadSchema>;
