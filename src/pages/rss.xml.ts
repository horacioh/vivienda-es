import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

export const GET: APIRoute = async ({ site }) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const items = (await getCollection("novedades"))
    .sort((a, b) => b.data.fecha.getTime() - a.data.fecha.getTime())
    .slice(0, 50)
    .map((n) => {
      const link = new URL(`${base}/novedades/${n.id}`, site).toString();
      return `<item><title>${esc(n.data.titulo)}</title><link>${link}</link><guid>${link}</guid><pubDate>${n.data.fecha.toUTCString()}</pubDate><description>${esc(`${n.data.resumen} Fuente oficial: ${n.data.fuente_url}`)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Vivienda ES</title><link>${new URL(`${base}/`, site)}</link><description>Novedades sobre vivienda en España con enlace a la fuente oficial.</description><language>es-ES</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
};
