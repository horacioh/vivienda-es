// Cliente de solo lectura para la API pública del sitio Seed donde viven las
// novedades. El sitio sirve documentos como JSON con CORS habilitado:
//   GET  /api/Resource?id=hm://<cuenta>/<ruta>
//   GET  /api/ListComments?targetId=<id empaquetado en JSON>
//   POST /api/QueryDocuments  (cuerpo CBOR, filtro DocumentFilter del proto)

// El sitio Seed y la cuenta se pueden sustituir con PUBLIC_SEED_ORIGIN /
// PUBLIC_SEED_ACCOUNT (o SEED_ORIGIN / SEED_ACCOUNT en scripts de bun) para
// probar el pipeline contra otra cuenta sin tocar el código.
const env = (k: string) =>
  (import.meta.env as Record<string, string | undefined>)[`PUBLIC_${k}`] ??
  (import.meta.env as Record<string, string | undefined>)[k];
export const SEED_ORIGIN = env("SEED_ORIGIN") ?? "https://vivienda-es.hyper.media";
export const SEED_ACCOUNT = env("SEED_ACCOUNT") ?? "z6Mkpqer25JrVxzoMobHUCkCv1r4fhiqTWwPWGrhcdGQVHHw";
export const NOVEDADES_PATH = "novedades";

export const novedadPath = (slug: string) => `${NOVEDADES_PATH}/${slug}`;
export const seedHmId = (path: string) => `hm://${SEED_ACCOUNT}/${path.replace(/^\//, "")}`;
export const seedDocUrl = (path: string) => `${SEED_ORIGIN}/${path}`;

export interface SeedAnnotation {
  type: string;
  starts: number[];
  ends: number[];
  link?: string;
  attributes?: Record<string, unknown>;
}

export interface SeedBlock {
  type: string;
  id: string;
  text?: string;
  link?: string;
  attributes?: Record<string, unknown>;
  annotations?: SeedAnnotation[];
}

export interface SeedBlockNode {
  block: SeedBlock;
  children: SeedBlockNode[];
}

export interface SeedDocument {
  content: SeedBlockNode[];
  version: string;
  account: string;
  path: string;
  metadata: Record<string, unknown>;
}

interface SeedDocumentInfo {
  account: string;
  path: string;
  metadata: Record<string, unknown>;
  version: string;
}

export interface SeedComment {
  id: string;
  version: string;
  author: string;
  content: SeedBlockNode[];
  createTime: string;
}

async function apiGet<T>(key: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${SEED_ORIGIN}/api/${key}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Seed /api/${key} respondió ${res.status}`);
  const data = (await res.json()) as { json: T };
  return data.json;
}

/** Documentos bajo /<cuenta>/novedades/, ordenados por ruta. */
export async function listNovedadDocs(): Promise<SeedDocumentInfo[]> {
  // Importación perezosa: solo se usa en build, no en el JS del navegador.
  const { encode: cborEncode } = await import("@ipld/dag-cbor");
  const docs: SeedDocumentInfo[] = [];
  let pageToken: string | undefined;
  do {
    const body = cborEncode({
      filter: {
        and: {
          filters: [
            { spaceMatch: { space: SEED_ACCOUNT } },
            { pathMatch: { path: `/${NOVEDADES_PATH}`, prefix: true } },
          ],
        },
      },
      sort: [{ attribute: "BUILTIN_SORT_ATTRIBUTE_PATH" }],
      pageSize: 500,
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(`${SEED_ORIGIN}/api/QueryDocuments`, {
      method: "POST",
      headers: { "content-type": "application/cbor" },
      body: body as unknown as BodyInit,
    });
    if (!res.ok) throw new Error(`Seed /api/QueryDocuments respondió ${res.status}`);
    const data = (await res.json()) as { documents?: SeedDocumentInfo[]; nextPageToken?: string };
    docs.push(...(data.documents ?? []));
    pageToken = data.nextPageToken || undefined;
  } while (pageToken);
  return docs;
}

/** Documento completo (contenido + metadatos) en una ruta de la cuenta del sitio. */
export async function getDocument(path: string): Promise<SeedDocument> {
  const res = await apiGet<{ type: string; document: SeedDocument }>("Resource", {
    id: seedHmId(path),
  });
  if (res.type !== "document") throw new Error(`${seedHmId(path)} no es un documento (${res.type})`);
  return res.document;
}

/** Comentarios de un documento. `authors` es uid → metadatos del perfil. */
export function commentsTarget(path: string): string {
  return JSON.stringify({
    id: seedHmId(path),
    uid: SEED_ACCOUNT,
    path: path.split("/").filter(Boolean),
    version: null,
    blockRef: null,
    blockRange: null,
    hostname: null,
    scheme: null,
    latest: true,
  });
}
