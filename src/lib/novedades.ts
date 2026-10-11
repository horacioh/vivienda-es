export const TIPOS = ["ley", "propuesta", "votacion", "aprobacion", "otro"] as const;
export type Tipo = (typeof TIPOS)[number];

export const ESTADOS = ["propuesta", "en-tramite", "aprobada", "rechazada", "caducada"] as const;
export type Estado = (typeof ESTADOS)[number];

export const TIPO_LABEL: Record<Tipo, string> = {
  ley: "Ley",
  propuesta: "Propuesta",
  votacion: "Votación",
  aprobacion: "Aprobación",
  otro: "Otro",
};

export const ESTADO_LABEL: Record<Estado, string> = {
  propuesta: "Propuesta",
  "en-tramite": "En trámite",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  caducada: "Caducada",
};

export const NOMBRE_FICHERO = /^(\d{4}-\d{2}-\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const dia = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const corta = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export const isoDia = (d: Date) => d.toISOString().slice(0, 10);
export const fechaLarga = (d: Date) => {
  const s = dia.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const fechaCorta = (d: Date) => corta.format(d);
