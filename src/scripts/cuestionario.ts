interface Datos {
  afirmaciones: { id: string; posturas: Record<string, number | null> }[];
  actores: { id: string; nombre: string }[];
}

const datos = JSON.parse(document.getElementById("datos-cuestionario")!.textContent!) as Datos;
const textos = [...document.querySelectorAll<HTMLElement>(".afirmacion")].map((el) => ({
  id: el.dataset.id!,
  tema: el.querySelector("p")!.textContent!.trim(),
  texto: el.querySelector("h3")!.textContent!.trim(),
  contexto: el.querySelector("details > p")!.textContent!.trim(),
}));

type Respuesta = { valor: number | null; importa: boolean };
const respuestas: Respuesta[] = datos.afirmaciones.map(() => ({ valor: null, importa: false }));
let paso = 0;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const q = $("q"), r = $("r");
const botones = [...q.querySelectorAll<HTMLButtonElement>(".resp")];
const importa = $<HTMLInputElement>("q-importa");
const n = datos.afirmaciones.length;

function pintar() {
  const t = textos[paso];
  $("q-tema").textContent = t.tema;
  $("q-paso").textContent = `${paso + 1} de ${n}`;
  $("q-barra").style.width = `${(paso / n) * 100}%`;
  $("q-texto").textContent = t.texto;
  $("q-contexto").textContent = t.contexto;
  const resp = respuestas[paso];
  for (const b of botones) b.setAttribute("aria-pressed", String(resp.valor !== null && Number(b.dataset.valor) === resp.valor));
  importa.checked = resp.importa;
  $<HTMLButtonElement>("q-atras").disabled = paso === 0;
}

let pendiente: ReturnType<typeof setTimeout> | undefined;

function avanzar() {
  clearTimeout(pendiente);
  pendiente = undefined;
  if (paso < n - 1) {
    paso++;
    pintar();
    $("q-texto").focus({ preventScroll: true });
  } else resultado();
}

for (const b of botones) {
  b.addEventListener("click", () => {
    if (pendiente) return;
    respuestas[paso] = { valor: Number(b.dataset.valor), importa: importa.checked };
    for (const o of botones) o.setAttribute("aria-pressed", String(o === b));
    pendiente = setTimeout(avanzar, 160);
  });
}
importa.addEventListener("change", () => (respuestas[paso].importa = importa.checked));
$("q-atras").addEventListener("click", () => {
  clearTimeout(pendiente);
  pendiente = undefined;
  if (paso > 0) paso--;
  pintar();
});
$("q-saltar").addEventListener("click", () => {
  if (pendiente) return;
  respuestas[paso] = { valor: null, importa: false };
  avanzar();
});
$("r-repetir").addEventListener("click", () => {
  respuestas.forEach((x) => ((x.valor = null), (x.importa = false)));
  paso = 0;
  r.hidden = true;
  q.hidden = false;
  limpiarTarjetas();
  pintar();
  q.scrollIntoView({ behavior: "smooth", block: "start" });
});

function puntuar() {
  return datos.actores
    .map((actor) => {
      let peso = 0, suma = 0, cuenta = 0;
      datos.afirmaciones.forEach((a, i) => {
        const u = respuestas[i], p = a.posturas[actor.id];
        if (u.valor === null || p === null || p === undefined) return;
        const w = u.importa ? 2 : 1;
        peso += w;
        suma += w * (1 - Math.abs(u.valor - p) / 2);
        cuenta++;
      });
      return { ...actor, pct: peso ? Math.round((suma / peso) * 100) : null, cuenta };
    })
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || a.nombre.localeCompare(b.nombre, "es"));
}

function resultado() {
  const contestadas = respuestas.filter((x) => x.valor !== null).length;
  q.hidden = true;
  r.hidden = false;
  const lista = $("r-lista");
  lista.replaceChildren();
  $("r-resumen").textContent = contestadas
    ? `Has respondido ${contestadas} de ${n} afirmaciones.`
    : "No has respondido ninguna afirmación, así que no hay nada que comparar.";
  for (const a of puntuar()) {
    const li = document.createElement("li");
    li.className = "grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3 sm:grid-cols-[9rem_1fr_3.5rem]";
    const nombre = document.createElement("span");
    nombre.className = "truncate text-sm font-semibold";
    nombre.textContent = a.nombre;
    const pista = document.createElement("span");
    pista.className = "h-3 overflow-hidden rounded-full bg-ink/[0.06]";
    const barra = document.createElement("span");
    barra.className = "block h-full rounded-full bg-ink transition-[width] duration-500 ease-out";
    barra.style.width = "0";
    pista.append(barra);
    const pct = document.createElement("span");
    pct.className = "text-right font-display text-lg font-semibold tabular-nums";
    pct.textContent = a.pct === null ? "—" : `${a.pct} %`;
    li.title = a.pct === null ? "Sin votos comparables" : `Basado en ${a.cuenta} afirmación${a.cuenta === 1 ? "" : "es"}`;
    li.append(nombre, pista, pct);
    lista.append(li);
    requestAnimationFrame(() => requestAnimationFrame(() => (barra.style.width = `${a.pct ?? 0}%`)));
  }
  marcarTarjetas();
  marcarTemas();
  r.scrollIntoView({ behavior: "smooth", block: "start" });
  $("r-titulo").focus({ preventScroll: true });
}

const ETIQUETA: Record<string, [string, string]> = {
  "1": ["Tú: de acuerdo", "c-favor"],
  "0": ["Tú: neutral", "c-medio"],
  "-1": ["Tú: en desacuerdo", "c-contra"],
};

function marcarTarjetas() {
  $("leyenda-tu").hidden = false;
  document.querySelectorAll<HTMLElement>(".afirmacion").forEach((el, i) => {
    const u = respuestas[i];
    const badge = el.querySelector<HTMLElement>(".tu-resp")!;
    badge.className = "tu-resp shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold";
    if (u.valor === null) {
      badge.classList.add("hidden");
      return;
    }
    const [txt, cls] = ETIQUETA[String(u.valor)];
    badge.textContent = txt + (u.importa ? " · importa mucho" : "");
    badge.classList.add(cls);
    el.querySelectorAll<HTMLElement>(".celda").forEach((c) => {
      const p = datos.afirmaciones[i].posturas[c.dataset.actor!];
      c.classList.toggle("coincide", p !== null && Math.abs(u.valor! - p) <= 0.5);
      c.classList.toggle("lejos", p !== null && Math.abs(u.valor! - p) > 1);
    });
  });
}

function marcarTemas() {
  document.querySelectorAll<HTMLElement>(".tema").forEach((el, i) => {
    const u = respuestas[i].valor;
    const k = u === null ? null : u > 0 ? "favor" : u < 0 ? "contra" : "medio";
    el.querySelectorAll<HTMLElement>(".col").forEach((c) => {
      const mia = c.dataset.col === k;
      c.classList.toggle("mia", mia);
      c.querySelector<HTMLElement>(".tu-marca")!.hidden = !mia;
    });
    el.querySelector(".tema-nota")!.textContent = u === null ? "Sin responder" : respuestas[i].importa ? "Te importa mucho" : "";
  });
}

function limpiarTarjetas() {
  $("leyenda-tu").hidden = true;
  document.querySelectorAll(".tu-resp").forEach((b) => b.classList.add("hidden"));
  document.querySelectorAll(".celda").forEach((c) => c.classList.remove("coincide", "lejos"));
}

q.hidden = false;
pintar();
