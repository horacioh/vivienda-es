// Afirmaciones del cuestionario y las votaciones del Congreso que las respaldan.
// `sentido` indica qué voto equivale a estar «de acuerdo» con la afirmación.
// Los votos por grupo se generan con `bun run votos` en src/data/votos-congreso.json.

export type Sentido = "si" | "no";

export interface Evidencia {
  /** Ruta del JSON de datos abiertos del Congreso (sin dominio). */
  votacion: string;
  sentido: Sentido;
  fecha: string;
  iniciativa: string;
  expediente: string;
  /** Qué se votó, en una frase. */
  que_se_voto: string;
  /** Enlace oficial al texto (BOE o BOCG). Si falta, se enlaza la ficha del Congreso. */
  texto_url?: string;
}

export interface Afirmacion {
  id: string;
  tema: string;
  /** Etiqueta breve para el mapa de posturas. */
  corto: string;
  texto: string;
  contexto: string;
  evidencias: Evidencia[];
}

export const AFIRMACIONES: Afirmacion[] = [
  {
    id: "prorroga-alquiler",
    tema: "Alquiler",
    corto: "Prórroga y tope del alquiler",
    texto:
      "En una crisis de precios, el Gobierno debería poder prorrogar los contratos de alquiler y limitar la subida anual de la renta.",
    contexto:
      "El Real Decreto-ley 8/2026 permitía al inquilino prorrogar su contrato hasta dos años y limitaba al 2 % la actualización anual de la renta. El Congreso no lo convalidó.",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion175/20260428/Votacion003/VOT_20260428200330.json",
        sentido: "si",
        fecha: "2026-04-28",
        iniciativa: "Convalidación del Real Decreto-ley 8/2026, de medidas en el alquiler",
        expediente: "130/000039",
        que_se_voto: "Sí = convalidar el decreto (prórroga de contratos y tope del 2 %).",
        texto_url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-6545",
      },
    ],
  },
  {
    id: "alquiler-temporada",
    tema: "Alquiler",
    corto: "Regular temporada y habitaciones",
    texto: "Los alquileres de temporada y de habitaciones deberían regularse por ley, como el alquiler de vivienda habitual.",
    contexto:
      "Hoy los contratos de temporada y de habitaciones quedan fuera de buena parte de las reglas del alquiler de vivienda habitual. Se votaron dos proposiciones de ley para regularlos.",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion059/20240917/Votacion001/VOT_20240917204416.json",
        sentido: "si",
        fecha: "2024-09-17",
        iniciativa: "Proposición de Ley de SUMAR sobre alquiler de temporada y de habitaciones",
        expediente: "122/000119",
        que_se_voto: "Sí = tramitar la proposición de ley.",
      },
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion086/20241217/Votacion001/VOT_20241217205720.json",
        sentido: "si",
        fecha: "2024-12-17",
        iniciativa: "Proposición de Ley de SUMAR, ERC, EH Bildu y Mixto sobre alquileres temporales y de habitaciones",
        expediente: "122/000136",
        que_se_voto: "Sí = tramitar la proposición de ley.",
      },
    ],
  },
  {
    id: "pisos-turisticos",
    tema: "Pisos turísticos",
    corto: "Limitar pisos turísticos",
    texto: "El Estado debería controlar la publicidad y la contratación de pisos turísticos.",
    contexto: "Proposición de ley de EH Bildu sobre control y regulación de la publicidad y contratación de los pisos turísticos.",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion135/20251007/Votacion002/VOT_20251007214330.json",
        sentido: "si",
        fecha: "2025-10-07",
        iniciativa: "Proposición de Ley de EH Bildu sobre publicidad y contratación de pisos turísticos",
        expediente: "122/000214",
        que_se_voto: "Sí = tramitar la proposición de ley.",
      },
    ],
  },
  {
    id: "especulacion",
    tema: "Compra de vivienda",
    corto: "Medidas contra la especulación",
    texto: "El Estado debería intervenir para frenar la compra de viviendas con fines especulativos.",
    contexto:
      "Dos iniciativas pedían al Gobierno medidas contra la especulación inmobiliaria: una moción de ERC (2025) y una proposición no de ley de SUMAR, votada con una enmienda pactada con el PSOE (2026).",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion118/20250612/Votacion012/VOT_20250612132253.json",
        sentido: "si",
        fecha: "2025-06-12",
        iniciativa: "Moción de ERC sobre la emergencia de acceso a la vivienda y la compra especulativa",
        expediente: "173/000105",
        que_se_voto: "Sí = aprobar la moción.",
      },
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion180/20260520/Votacion005/VOT_20260520142326.json",
        sentido: "si",
        fecha: "2026-05-20",
        iniciativa: "Proposición no de Ley de SUMAR para frenar la especulación inmobiliaria",
        expediente: "162/000498",
        que_se_voto: "Sí = aprobar la proposición no de ley (texto pactado PSOE–SUMAR).",
      },
    ],
  },
  {
    id: "urbanismo",
    tema: "Suelo y construcción",
    corto: "Seguridad jurídica urbanística",
    texto:
      "Hay que cambiar las leyes para que los planes urbanísticos no se anulen tan fácilmente en los tribunales y se construya más rápido.",
    contexto:
      "Proposición de ley del PP «de medidas administrativas y procesales para la seguridad jurídica de la ordenación territorial y urbanística, el impulso del desarrollo urbano y la vivienda».",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion173/20260421/Votacion001/VOT_20260421201008.json",
        sentido: "si",
        fecha: "2026-04-21",
        iniciativa: "Proposición de Ley del PP de seguridad jurídica urbanística",
        expediente: "122/000253",
        que_se_voto: "Sí = tramitar la proposición de ley.",
      },
    ],
  },
  {
    id: "ocupacion",
    tema: "Ocupación",
    corto: "Más dureza contra la ocupación",
    texto: "Hacen falta leyes más duras y desalojos más rápidos contra la ocupación ilegal de viviendas.",
    contexto: "Se votaron dos proposiciones de ley orgánica contra la ocupación ilegal: una de Junts (2025) y otra del PP (2026).",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion099/20250318/Votacion001/VOT_20250318201321.json",
        sentido: "si",
        fecha: "2025-03-18",
        iniciativa: "Proposición de Ley Orgánica de Junts contra la ocupación ilegal de inmuebles",
        expediente: "122/000150",
        que_se_voto: "Sí = tramitar la proposición de ley.",
      },
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion179/20260519/Votacion001/VOT_20260519203502.json",
        sentido: "si",
        fecha: "2026-05-19",
        iniciativa: "Proposición de Ley Orgánica del PP contra la ocupación ilegal",
        expediente: "122/000254",
        que_se_voto: "Sí = tramitar la proposición de ley.",
      },
    ],
  },
  {
    id: "sareb",
    tema: "Vivienda pública",
    corto: "Activos de la Sareb a Galicia",
    texto: "La Sareb debería transferir a la Xunta de Galicia las viviendas y suelos que tiene en Galicia, para que los gestione como vivienda pública.",
    contexto: "Proposición no de ley del BNG para transferir a Galicia los activos inmobiliarios de la Sareb situados allí. Es la única votación del Pleno sobre traspasar activos de la Sareb a una comunidad; no hubo una votación general para todas.",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion134/20250924/Votacion002/VOT_20250924171304.json",
        sentido: "si",
        fecha: "2025-09-24",
        iniciativa: "Proposición no de Ley del BNG sobre transferir activos de la Sareb a Galicia",
        expediente: "162/000145",
        que_se_voto: "Sí = aprobar la proposición no de ley.",
      },
    ],
  },
  {
    id: "prioridad-nacionales",
    tema: "Vivienda pública",
    corto: "Prioridad a nacionales",
    texto: "Las personas con nacionalidad española deberían tener prioridad para comprar, alquilar o recibir una vivienda social.",
    contexto: "Moción de VOX que pedía que «los españoles siempre vayan primero para comprar, alquilar o recibir una vivienda social».",
    evidencias: [
      {
        votacion: "/webpublica/opendata/votaciones/Leg15/Sesion188/20260618/Votacion012/VOT_20260618162224.json",
        sentido: "si",
        fecha: "2026-06-18",
        iniciativa: "Moción de VOX sobre prioridad de los españoles en el acceso a la vivienda",
        expediente: "173/000179",
        que_se_voto: "Sí = aprobar la moción.",
      },
    ],
  },
];

// Quién aparece en el comparador. `grupo` es el código del grupo parlamentario en
// los datos abiertos del Congreso; `diputados`, cuando la formación está dentro del
// Grupo Mixto y hay que leer el voto de cada diputado.
export interface Actor {
  id: string;
  nombre: string;
  /** Nombre para espacios estrechos. */
  corto?: string;
  grupo: string;
  diputados?: string[];
  nota?: string;
}

export const ACTORES: Actor[] = [
  { id: "psoe", nombre: "PSOE", grupo: "GS" },
  { id: "pp", nombre: "PP", grupo: "GP" },
  { id: "vox", nombre: "VOX", grupo: "GVOX" },
  { id: "sumar", nombre: "Sumar", grupo: "GSUMAR" },
  { id: "erc", nombre: "ERC", grupo: "GR" },
  { id: "junts", nombre: "Junts", grupo: "GJxCAT" },
  { id: "bildu", nombre: "EH Bildu", grupo: "GEH Bildu" },
  { id: "pnv", nombre: "PNV", grupo: "GV (EAJ-PNV)" },
  {
    id: "mixto-belarra",
    nombre: "Grupo Mixto (Belarra y otros)",
    corto: "Mixto (Belarra)",
    grupo: "GMx",
    diputados: ["Belarra Urteaga, Ione", "Santana Perera, Noemí", "Sánchez Serna, Javier", "Velarde Gómez, Martina"],
    nota: "Ione Belarra, Noemí Santana, Javier Sánchez Serna y Martina Velarde: elegidos en la lista de SUMAR, se sientan en el Grupo Mixto.",
  },
  { id: "bng", nombre: "BNG", grupo: "GMx", diputados: ["Rego Candamil, Néstor"], nota: "Un diputado, en el Grupo Mixto." },
  { id: "cc", nombre: "Coalición Canaria", corto: "C. Canaria", grupo: "GMx", diputados: ["Valido García, Cristina"], nota: "Una diputada, en el Grupo Mixto." },
  { id: "upn", nombre: "UPN", grupo: "GMx", diputados: ["Catalán Higueras, Alberto"], nota: "Un diputado, en el Grupo Mixto." },
];
