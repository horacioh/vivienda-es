interface Datos {
  afirmaciones: { id: string; corto: string; posturas: Record<string, number | null> }[];
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
  prepararCompartir(contestadas);
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

const api = (ruta: string) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/${ruta}`;
const COMPARTIDO = "vivienda-es:compartido";
const btnCompartir = $<HTMLButtonElement>("r-compartir");
const estadoCompartir = $("r-compartir-estado");

function yaCompartido() {
  try {
    return localStorage.getItem(COMPARTIDO) !== null;
  } catch {
    return false;
  }
}

interface Turnstile {
  render(el: HTMLElement, o: Record<string, unknown>): string;
  execute(id: string): void;
  reset(id: string): void;
}
declare global {
  interface Window { turnstile?: Turnstile }
}

let sitekey = "";
let widget: string | undefined;
let pedirToken: ((t: string | null) => void) | undefined;

function cargarTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window.turnstile ? ok(window.turnstile) : mal(new Error("turnstile")));
    s.onerror = mal;
    document.head.append(s);
  });
}

async function token(): Promise<string | null> {
  const ts = await cargarTurnstile();
  const listo = new Promise<string | null>((ok) => (pedirToken = ok));
  if (widget === undefined) {
    widget = ts.render($("r-turnstile"), {
      sitekey,
      action: "compartir",
      execution: "execute",
      appearance: "interaction-only",
      language: "es",
      callback: (t: string) => pedirToken?.(t),
      "error-callback": () => pedirToken?.(null),
      "timeout-callback": () => pedirToken?.(null),
    });
  }
  ts.execute(widget);
  return listo;
}

function reiniciarTurnstile() {
  if (widget !== undefined) window.turnstile?.reset(widget);
}

let hayApi = false;
let enviando = false;
let contestadasAhora = 0;

function prepararCompartir(contestadas = contestadasAhora) {
  contestadasAhora = contestadas;
  $("compartir").hidden = contestadas === 0 || !hayApi;
  if (enviando) return;
  const ya = yaCompartido();
  btnCompartir.hidden = ya;
  btnCompartir.disabled = false;
  estadoCompartir.textContent = ya ? "Ya compartiste tus respuestas desde este navegador." : "";
}

btnCompartir.addEventListener("click", async () => {
  if (enviando) return;
  enviando = true;
  const envio: Record<string, [number, number]> = {};
  datos.afirmaciones.forEach((a, i) => {
    const u = respuestas[i];
    if (u.valor !== null) envio[a.id] = [u.valor, u.importa ? 1 : 0];
  });
  btnCompartir.disabled = true;
  estadoCompartir.textContent = "Enviando…";
  let error = "No se han podido enviar. Inténtalo de nuevo.";
  try {
    const t = await token().catch(() => null);
    if (!t) throw new Error(error);
    const res = await fetch(api("respuestas"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ respuestas: envio, token: t }),
    });
    if (res.status === 403) error = "No se ha podido comprobar que no eres un robot. Inténtalo de nuevo.";
    if (res.status === 429) error = "Has enviado varias veces seguidas. Prueba dentro de un minuto.";
    if (!res.ok) throw new Error(error);
  } catch {
    reiniciarTurnstile();
    enviando = false;
    btnCompartir.disabled = false;
    estadoCompartir.textContent = error;
    return;
  }
  reiniciarTurnstile();
  enviando = false;
  try {
    localStorage.setItem(COMPARTIDO, new Date().toISOString().slice(0, 10));
  } catch {}
  btnCompartir.hidden = true;
  estadoCompartir.textContent = "Gracias. Tus respuestas se han añadido de forma anónima.";
  cargarOpiniones(true);
});

interface Opiniones {
  veda: boolean;
  cerrado?: boolean;
  minimo: number;
  turnstile?: string;
  total?: number;
  afirmaciones?: Record<string, { favor: number; neutral: number; contra: number; importa: number }>;
}

const TRAMOS = [
  ["favor", "bg-si", "✓", "de acuerdo"],
  ["neutral", "bg-abst", "–", "neutral"],
  ["contra", "bg-no", "✕", "en desacuerdo"],
] as const;

async function cargarOpiniones(recargar = false) {
  let d: Opiniones;
  try {
    const res = await fetch(api("resultados"), { cache: recargar ? "reload" : "default" });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return;
    d = await res.json();
  } catch {
    return;
  }
  if (!d.turnstile) return;
  sitekey = d.turnstile;
  if (hayApi === !!d.cerrado) (hayApi = !d.cerrado), prepararCompartir();
  $("opiniones").hidden = false;
  const estado = $("op-estado"), lista = $("op-lista");
  lista.replaceChildren();
  if (d.cerrado) {
    estado.textContent = "Las respuestas compartidas se borraron el 1 de enero de 2027, como indica la política de privacidad.";
    return;
  }
  if (d.veda) {
    estado.textContent = "La ley electoral no permite publicar sondeos en los cinco días anteriores a la votación. Volveremos a mostrar estos resultados el 29 de noviembre, tras el cierre de los colegios.";
    return;
  }
  if (!d.afirmaciones) {
    estado.textContent = `Todavía hay pocas respuestas (${d.total ?? 0}). Las mostraremos a partir de ${d.minimo} cuestionarios compartidos.`;
    return;
  }
  estado.textContent = `Basado en ${d.total!.toLocaleString("es-ES")} cuestionarios compartidos.`;
  for (const a of datos.afirmaciones) {
    const c = d.afirmaciones[a.id];
    const t = c ? c.favor + c.neutral + c.contra : 0;
    if (!c || !t) continue;
    const fila = document.createElement("div");
    const cab = document.createElement("p");
    cab.className = "flex items-baseline justify-between gap-3 text-sm font-semibold";
    const nombre = document.createElement("a");
    nombre.href = `#af-${a.id}`;
    nombre.className = "hover:underline hover:underline-offset-4";
    nombre.textContent = a.corto;
    const n = document.createElement("span");
    n.className = "shrink-0 text-xs font-medium tabular-nums text-muted";
    n.textContent = `${t.toLocaleString("es-ES")} respuestas`;
    cab.append(nombre, n);
    const barra = document.createElement("div");
    barra.className = "mt-1.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full";
    barra.setAttribute("aria-hidden", "true");
    const leyenda = document.createElement("p");
    leyenda.className = "mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-ink-2";
    for (const [k, color, simbolo, texto] of TRAMOS) {
      if (c[k]) {
        const s = document.createElement("span");
        s.className = color;
        s.style.width = `${(c[k] / t) * 100}%`;
        barra.append(s);
      }
      const l = document.createElement("span");
      l.textContent = `${simbolo} ${Math.round((c[k] / t) * 100)} % ${texto}`;
      leyenda.append(l);
    }
    fila.append(cab, barra, leyenda);
    lista.append(fila);
  }
}

q.hidden = false;
pintar();
cargarOpiniones();

