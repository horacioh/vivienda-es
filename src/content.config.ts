import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { esFuenteOficial } from "./lib/fuentes";
import { ESTADOS, TIPOS } from "./lib/novedades";
import { novedadesSeedLoader } from "./lib/seed-loader";

const voto = z.object({
  grupo: z.string(),
  si: z.number().int().nonnegative(),
  no: z.number().int().nonnegative(),
  abstencion: z.number().int().nonnegative().default(0),
});

const novedades = defineCollection({
  loader: novedadesSeedLoader(),
  schema: z.object({
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
  }),
});

export const collections = { novedades };
