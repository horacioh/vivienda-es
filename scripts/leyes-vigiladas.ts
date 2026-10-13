// Leyes de vivienda cuyas reformas y estado se siguen con Legalize.
// `id` = identificador BOE-A-*, que también sirve como `legalize_id` en la API.
// Añade aquí cualquier ley nueva que convenga vigilar (la daily genera una
// novedad cuando aparece una reforma posterior a la fecha de la ley).
export interface LeyVigilada {
  id: string;
  nombre: string;
}

export const LEYES_VIGILADAS: LeyVigilada[] = [
  { id: "BOE-A-1994-26003", nombre: "Ley de Arrendamientos Urbanos" },
  { id: "BOE-A-2023-12203", nombre: "Ley 12/2023, por el derecho a la vivienda" },
  { id: "BOE-A-2026-16356", nombre: "Ley Foral 11/2026 (Navarra), arrendamiento de habitaciones" },
  { id: "BOE-A-2026-16359", nombre: "Ley Foral 14/2026 (Navarra), derecho a la vivienda" },
  { id: "BOE-A-2026-16360", nombre: "Ley 2/2026 (Madrid), incremento de vivienda protegida" },
  { id: "BOE-A-2026-19429", nombre: "Decreto-ley 4/2026 (Extremadura), urgencias de vivienda" },
  { id: "BOE-A-2026-20266", nombre: "Real Decreto-ley 26/2026" },
  { id: "BOE-A-2026-20822", nombre: "Real Decreto-ley 28/2026" },
  { id: "BOE-A-2026-20823", nombre: "Real Decreto-ley 29/2026" },
  { id: "BOE-A-2026-20471", nombre: "Real Decreto 765/2026, seguro público de alquiler" },
];
