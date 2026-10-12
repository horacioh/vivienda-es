// Renderiza el árbol de bloques HM (Seed) a HTML seguro: todo texto y atributo
// se escapa, y solo se emiten enlaces http(s)/mailto o rutas del sitio Seed.
import { SEED_ACCOUNT, SEED_ORIGIN, type SeedBlockNode } from "./seed";

const esc = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Devuelve un href seguro o null si el destino no es navegable. */
function hrefSeguro(link: string): string | null {
  if (/^https?:\/\//i.test(link) || /^mailto:/i.test(link)) return esc(link);
  const hm = /^hm:\/\/([A-Za-z0-9]+)(\/[^\s?#]*)?([?&]v=([^\s&#]+))?#?/.exec(link);
  if (hm) {
    const [, uid, path = "", , version] = hm;
    if (uid === SEED_ACCOUNT) return esc(`${SEED_ORIGIN}${path || "/"}${version ? `?v=${version}` : ""}`);
    return esc(`https://hyper.media/hm/${uid}${path || ""}`);
  }
  return null;
}

/** Aplica anotaciones (negrita, cursiva, código, enlaces…) a `text` de un bloque. */
function inline(block: { text?: string; link?: string; annotations?: { type: string; starts: number[]; ends: number[]; link?: string }[] }): string {
  const text = block.text ?? "";
  if (!text) return "";
  const anns = block.annotations ?? [];
  // Puntos de corte: 0, todos los starts/ends, y len del texto (offsets en puntos de código).
  const cortes = new Set<number>([0, [...text].length]);
  for (const a of anns) for (let i = 0; i < a.starts.length; i++) {
    cortes.add(a.starts[i]);
    cortes.add(a.ends[i] ?? a.starts[i]);
  }
  const cps = [...text];
  let out = "";
  const orden = [...cortes].sort((a, b) => a - b);
  for (let i = 0; i + 1 < orden.length; i++) {
    const [s, e] = [orden[i], orden[i + 1]];
    if (e <= s) continue;
    const frag = esc(cps.slice(s, e).join(""));
    const activas = anns.filter((a) => a.starts.some((st, j) => st <= s && (a.ends[j] ?? st) > s));
    const esLink = (t: string) => {
      const a = activas.find((x) => x.type === t);
      return a;
    };
    let html = frag;
    if (esLink("Code")) html = `<code>${html}</code>`;
    if (esLink("Bold")) html = `<strong>${html}</strong>`;
    if (esLink("Italic")) html = `<em>${html}</em>`;
    if (esLink("Underline")) html = `<u>${html}</u>`;
    if (esLink("Strike")) html = `<s>${html}</s>`;
    const link = esLink("Link");
    if (link?.link) {
      const href = hrefSeguro(link.link);
      if (href) html = `<a href="${href}" target="_blank" rel="noopener">${html}</a>`;
    }
    out += html;
  }
  // Enlace a nivel de bloque (bloques sin texto propio, p. ej. Embed con título).
  if (!out && block.link) {
    const href = hrefSeguro(block.link);
    return href ? `<a href="${href}" target="_blank" rel="noopener">${esc(block.link)}</a>` : "";
  }
  return out;
}

const ipfs = (ref: string | undefined) =>
  ref && ref.startsWith("ipfs://") ? `${SEED_ORIGIN}/ipfs/${ref.slice("ipfs://".length)}` : null;

function blockHtml(n: SeedBlockNode): string {
  const b = n.block;
  const inner = inline(b);
  switch (b.type) {
    case "Paragraph":
      return inner ? `<p>${inner}</p>` : "";
    case "Heading":
      return inner ? `<h3>${inner}</h3>` : "";
    case "Code":
      return `<pre><code>${esc(b.text ?? "")}</code></pre>`;
    case "Math":
      return `<pre>${esc(b.text ?? "")}</pre>`;
    case "Image": {
      const src = ipfs((b.attributes?.url as string) || b.link);
      return src ? `<img src="${esc(src)}" alt="${esc(b.text ?? "")}" loading="lazy" />` : inner ? `<p>${inner}</p>` : "";
    }
    case "Embed":
    case "WebEmbed": {
      const href = hrefSeguro(b.link ?? "");
      const label = inner || (href ? esc(b.link ?? "") : "");
      return href ? `<p><a href="${href}" target="_blank" rel="noopener">${label}</a></p>` : inner ? `<p>${inner}</p>` : "";
    }
    case "Video":
    case "File": {
      const src = ipfs(b.link || (b.attributes?.url as string)) || hrefSeguro(b.link ?? "");
      return src ? `<p><a href="${src}" target="_blank" rel="noopener">${inner || esc(b.text || b.link || "Archivo")}</a></p>` : "";
    }
    default:
      return inner ? `<p>${inner}</p>` : "";
  }
}

// Un bloque declara en `childrenType` cómo se disponen sus hijos: lista con
// viñetas/numerada (los ítems son párrafos, dentro del <li> va el texto en
// línea sin la envoltura <p>), cita o grupo.
function hijosHtml(n: SeedBlockNode): string {
  const tipo = n.block.attributes?.childrenType as string | undefined;
  const item = (c: SeedBlockNode) => inline(c.block) + hijosHtml(c);
  if (tipo === "Unordered") return `<ul>${n.children.map((c) => `<li>${item(c)}</li>`).join("")}</ul>`;
  if (tipo === "Ordered") return `<ol>${n.children.map((c) => `<li>${item(c)}</li>`).join("")}</ol>`;
  if (tipo === "Blockquote") return `<blockquote>${n.children.map(nodo).join("")}</blockquote>`;
  return n.children.map(nodo).join("");
}

function nodo(n: SeedBlockNode): string {
  return blockHtml(n) + hijosHtml(n);
}

/** Árbol HMBlockNode[] → HTML. Solo cubre el subconjunto que publican las
 * novedades; bloques desconocidos se degradan a párrafo con su texto. */
export function renderBloques(nodes: SeedBlockNode[] | undefined): string {
  return (nodes ?? []).map(nodo).join("");
}
