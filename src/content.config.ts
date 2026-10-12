import { defineCollection } from "astro:content";
import { novedadSchema } from "./lib/novedad-schema";
import { novedadesSeedLoader } from "./lib/seed-loader";

const novedades = defineCollection({
  loader: novedadesSeedLoader(),
  schema: novedadSchema,
});

export const collections = { novedades };
