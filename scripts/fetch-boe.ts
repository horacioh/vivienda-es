// Lista disposiciones del BOE relacionadas con vivienda en un rango de fechas.
// Uso: bun run scripts/fetch-boe.ts [AAAA-MM-DD] [AAAA-MM-DD]
// Fuente: API de datos abiertos del BOE (https://www.boe.es/datosabiertos/).

const KEYWORDS =
  /vivienda|alquiler|arrendamiento|hipotec|desahucio|suelo|urbanismo|rehabilitaci[oó]n|habitacional|inquilin|okupa|SEPES|Casa 47/i;

export type BoeItem = {
  fecha: string;
  identificador: string;
  titulo: string;
  seccion: string;
  departamento: string;
  url_html: string;
};

const asArray = <T>(v: T | T[] | undefined): T[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v];

type Node = Record<string, unknown>;

function collectItems(node: Node, ctx: { seccion: string; departamento: string }, out: Node[]) {
  for (const item of asArray(node.item as Node | Node[])) out.push({ ...item, ...ctx });
  for (const epigrafe of asArray(node.epigrafe as Node | Node[])) collectItems(epigrafe, ctx, out);
}

export async function fetchBoeDay(date: string): Promise<BoeItem[]> {
  const compact = date.replaceAll("-", "");
  const res = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumario/${compact}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`BOE ${date}: HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { sumario?: { diario?: Node | Node[] } } };
  const raw: Node[] = [];
  for (const diario of asArray(json.data?.sumario?.diario)) {
    for (const seccion of asArray(diario.seccion as Node | Node[])) {
      for (const dep of asArray(seccion.departamento as Node | Node[])) {
        collectItems(dep, { seccion: String(seccion.nombre ?? ""), departamento: String(dep.nombre ?? "") }, raw);
      }
    }
  }
  return raw
    .filter((i) => KEYWORDS.test(String(i.titulo ?? "")) || /VIVIENDA/i.test(String(i.departamento ?? "")))
    .map((i) => ({
      fecha: date,
      identificador: String(i.identificador),
      titulo: String(i.titulo),
      seccion: String(i.seccion),
      departamento: String(i.departamento),
      url_html: String((i.url_html as string) ?? `https://www.boe.es/diario_boe/txt.php?id=${i.identificador}`),
    }));
}

function* days(from: string, to: string) {
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

if (import.meta.main) {
  const today = new Date().toISOString().slice(0, 10);
  const [from = today, to = from] = process.argv.slice(2);
  const all: BoeItem[] = [];
  for (const day of days(from, to)) all.push(...(await fetchBoeDay(day)));
  console.log(JSON.stringify(all, null, 2));
}
