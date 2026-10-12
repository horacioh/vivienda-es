import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { describe, expect, test } from "bun:test";
import { sanearMarkdown, urlSegura } from "../src/lib/markdown-seguro";

const procesador = await createSatteriMarkdownProcessor({ hastPlugins: [sanearMarkdown] });
const html = async (md: string) => (await procesador.render(md)).code;

describe("sanearMarkdown", () => {
  test("elimina el HTML crudo en línea y en bloque", async () => {
    const out = await html("Hola <img src=x onerror=alert(1)> **ok**\n\n<script>alert(1)</script>\n\n<div onclick=\"x\">b</div>\n\n<!-- c -->");
    expect(out).toContain("<strong>ok</strong>");
    expect(out).not.toMatch(/<(img|script|div)|onerror|onclick|<!--/);
  });

  test("quita href/src javascript:, data: y vbscript:, también codificados", async () => {
    const out = await html(
      "[a](javascript:alert(1)) [b](java&#x73;cript:alert(1)) [c](<JaVaScRiPt:alert(1)>) [d](data:text/html,x) <javascript:alert(1)>\n\n![i](javascript:alert(1))\n\n[r][x]\n\n[x]: vbscript:msgbox(1)",
    );
    expect(out).not.toMatch(/(href|src)="[^"]*(javascript|data|vbscript):/i);
    expect(out).toContain("<a>a</a>");
  });

  test("mantiene enlaces https, mailto, rutas y anclas", async () => {
    const out = await html("[a](https://www.boe.es/x) [b](mailto:a@b.es) [c](/novedades) [d](#x) <https://boe.es>");
    for (const href of ["https://www.boe.es/x", "mailto:a@b.es", "/novedades", "#x", "https://boe.es"]) expect(out).toContain(`href="${href}"`);
  });
});

test("urlSegura ignora espacios y caracteres de control en el esquema", () => {
  expect(urlSegura("java\tscript:alert(1)")).toBe(false);
  expect(urlSegura(" \u0001javascript:alert(1)")).toBe(false);
  expect(urlSegura("https://boe.es")).toBe(true);
  expect(urlSegura("/x?a=b:c")).toBe(true);
});
