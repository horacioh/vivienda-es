import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";

type HastPlugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number];

const ESQUEMAS_SEGUROS = new Set(["http", "https", "mailto"]);

/** `true` si la URL es relativa o usa http(s)/mailto. Los navegadores ignoran
 *  espacios y caracteres de control al leer el esquema, así que se quitan antes. */
export function urlSegura(url: string): boolean {
  const limpia = url.replace(/[\u0000-\u0020\u007f]/g, "");
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(limpia);
  return !esquema || ESQUEMAS_SEGUROS.has(esquema[1].toLowerCase());
}

/** Plugin HAST de Sätteri: el cuerpo de una novedad se publica sin HTML crudo
 *  y sin enlaces o imágenes `javascript:`, `data:`, etc. */
export const sanearMarkdown: HastPlugin = {
  name: "sanear-markdown",
  raw(node, ctx) {
    ctx.removeNode(node);
  },
  element: {
    filter: ["a", "img"],
    visit(node, ctx) {
      for (const attr of ["href", "src"]) {
        const valor = node.properties?.[attr];
        if (valor !== undefined && (typeof valor !== "string" || !urlSegura(valor))) ctx.setProperty(node, attr, null);
      }
    },
  },
};
