// Filtros del feed: estado en la query (?tipo=ley&partido=PSOE) para poder compartir enlaces.
// Con ClientRouter el módulo solo se ejecuta una vez: el arranque va en astro:page-load.
function init() {
  const form = document.querySelector<HTMLFormElement>("#filtros");
  if (!form) return;
  const contador = document.querySelector<HTMLElement>("#contador");
  const vacio = document.querySelector<HTMLElement>("#vacio");
  const limpiar = document.querySelector<HTMLButtonElement>("#limpiar");

  function aplicar(tipo: string, partido: string) {
    let visibles = 0;
    for (const dia of document.querySelectorAll<HTMLElement>(".dia")) {
      let enDia = 0;
      for (const card of dia.querySelectorAll<HTMLElement>(".novedad")) {
        const ok = (!tipo || card.dataset.tipo === tipo) && (!partido || card.dataset.partido === partido);
        card.hidden = !ok;
        if (ok) enDia++;
      }
      dia.hidden = enDia === 0;
      visibles += enDia;
    }
    if (contador) contador.textContent = `${visibles} ${visibles === 1 ? "novedad" : "novedades"}`;
    if (vacio) vacio.hidden = visibles > 0;
    if (limpiar) limpiar.hidden = !tipo && !partido;
  }

  function leerForm() {
    const data = new FormData(form!);
    return { tipo: String(data.get("tipo") ?? ""), partido: String(data.get("partido") ?? "") };
  }

  const params = new URLSearchParams(location.search);
  const tipo = params.get("tipo") ?? "";
  const partido = params.get("partido") ?? "";
  const radio = form.querySelector<HTMLInputElement>(`input[name="tipo"][value="${CSS.escape(tipo)}"]`);
  if (radio) radio.checked = true;
  const select = form.querySelector<HTMLSelectElement>("#partido");
  if (select && [...select.options].some((o) => o.value === partido)) select.value = partido;

  const sync = () => {
    const f = leerForm();
    aplicar(f.tipo, f.partido);
    const q = new URLSearchParams();
    if (f.tipo) q.set("tipo", f.tipo);
    if (f.partido) q.set("partido", f.partido);
    const qs = q.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  };
  form.addEventListener("change", sync);
  form.addEventListener("submit", (e) => e.preventDefault());
  limpiar?.addEventListener("click", () => {
    form.reset();
    sync();
  });
  sync();
}

document.addEventListener("astro:page-load", init);
