// Dominios aceptados como fuente oficial. Para añadir uno nuevo (p. ej. la web
// oficial de un partido o de un parlamento autonómico), amplía esta lista en el
// mismo commit que la novedad que lo usa.
export const DOMINIOS_OFICIALES = [
  // Estado
  "boe.es",
  "congreso.es",
  "senado.es",
  "mivau.gob.es",
  "lamoncloa.gob.es",
  "casa47.gob.es",
  "tribunalconstitucional.es",
  "poderjudicial.es",
  "ine.es",
  "bde.es",
  // Unión Europea
  "europa.eu",
  // Partidos (webs oficiales)
  "psoe.es",
  "pp.es",
  "voxespana.es",
  "movimientosumar.es",
  "podemos.info",
  "esquerra.cat",
  "juntsxcat.cat",
  "ehbildu.eus",
  "eaj-pnv.eus",
  "bng.gal",
  "coalicioncanaria.org",
  "upn.org",
] as const;

export function esFuenteOficial(url: string): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  return DOMINIOS_OFICIALES.some((d) => host === d || host.endsWith(`.${d}`));
}

export function normalizarUrl(url: string): string {
  const u = new URL(url);
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  const params = [...u.searchParams.entries()]
    .filter(([k]) => !k.startsWith("utm_"))
    .sort(([a], [b]) => a.localeCompare(b));
  u.search = new URLSearchParams(params).toString();
  return u.toString().replace(/\/$/, "");
}
