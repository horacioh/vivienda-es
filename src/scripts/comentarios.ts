// Sección de comentarios de una novedad: lee los comentarios del documento
// Seed correspondiente vía la API pública del sitio y los pinta en el DOM.
// Escribir se hace en la página del documento en Seed, donde los usuarios
// inician sesión con su Seed vault.
import { renderBloques } from "../lib/seed-render";
import type { SeedComment } from "../lib/seed";

interface AutorMeta {
  metadata?: { name?: string; icon?: string };
}

const cont = document.getElementById("comentarios");
if (cont) {
  const target = cont.dataset.target;
  const docUrl = cont.dataset.docUrl;
  const apiOrigin = cont.dataset.apiOrigin;
  const lista = cont.querySelector<HTMLElement>("[data-lista]");
  const estado = cont.querySelector<HTMLElement>("[data-estado]");
  const recuento = cont.querySelector<HTMLElement>("[data-recuento]");

  const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const nombreAutor = (uid: string, authors: Record<string, AutorMeta>) =>
    authors[uid]?.metadata?.name || `${uid.slice(0, 8)}…`;

  const esc = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

  async function cargar() {
    const res = await fetch(`${apiOrigin}/api/ListComments?targetId=${encodeURIComponent(target!)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { json } = (await res.json()) as {
      json: { comments: SeedComment[]; authors: Record<string, AutorMeta> };
    };
    const comments = json.comments ?? [];
    if (!comments.length) {
      estado!.textContent = "Todavía no hay comentarios.";
      return;
    }
    estado!.hidden = true;
    lista!.innerHTML = comments
      .map(
        (c) => `<li class="comentario">
          <header>
            <strong>${esc(nombreAutor(c.author, json.authors ?? {}))}</strong>
            <time datetime="${esc(c.createTime)}">${esc(fmt.format(new Date(c.createTime)))}</time>
          </header>
          <div class="prose-novedad">${renderBloques(c.content)}</div>
        </li>`,
      )
      .join("");
    if (recuento) recuento.textContent = `(${comments.length})`;
  }

  cargar().catch(() => {
    estado!.innerHTML =
      `No se pudieron cargar los comentarios. <a href="${docUrl}" target="_blank" rel="noopener">Verlos en Seed →</a>`;
  });
}
