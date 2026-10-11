import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// SITE_URL/BASE_PATH permiten publicar el mismo build en GitHub Pages
// (https://horacioh.github.io/vivienda-es) sin tocar el código.
const site = process.env.SITE_URL ?? "https://vivienda-es.pages.dev";
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "never",
  build: {
    format: "file",
    inlineStylesheets: "always",
  },
  i18n: {
    locales: ["es"],
    defaultLocale: "es",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
