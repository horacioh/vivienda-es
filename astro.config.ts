import { satteri } from "@astrojs/markdown-satteri";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { sanearMarkdown } from "./src/lib/markdown-seguro";

// SITE_URL/BASE_PATH permiten publicar el mismo build en GitHub Pages
// (https://horacioh.github.io/vivienda-es) sin tocar el código.
const site = process.env.SITE_URL || "https://vivienda-es.hhg.app";
const base = process.env.BASE_PATH || "/";

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "never",
  build: {
    format: "file",
    inlineStylesheets: "always",
  },
  // El cuerpo de las novedades lo escribe un agente a partir de webs externas:
  // nunca se publica HTML crudo ni enlaces `javascript:`/`data:`.
  markdown: {
    processor: satteri({ hastPlugins: [sanearMarkdown] }),
  },
  i18n: {
    locales: ["es"],
    defaultLocale: "es",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
