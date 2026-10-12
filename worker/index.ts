// Worker delante de los static assets: solo atiende /api/*; el resto lo sirve `dist/`.
// Las respuestas compartidas se guardan sin IP, cookies ni identificador: solo el día y las respuestas.
import { cerrado, enVeda, hostnames, maxAge, resultados, validar, verificarTurnstile, type Fila } from "./respuestas";

interface D1Result<T> { results: T[] }
interface D1Stmt { bind(...v: unknown[]): D1Stmt; run(): Promise<unknown>; all<T>(): Promise<D1Result<T>>; first<T>(): Promise<T | null> }
interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> };
  DB: { prepare(sql: string): D1Stmt; exec(sql: string): Promise<unknown> };
  LIMITE: { limit(o: { key: string }): Promise<{ success: boolean }> };
  TURNSTILE_SITEKEY: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_HOSTNAMES?: string;
}

const ESQUEMA = "CREATE TABLE IF NOT EXISTS envios (id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, respuestas TEXT NOT NULL)";
let listo = false;
async function db(env: Env) {
  if (!listo) await env.DB.exec(ESQUEMA), (listo = true);
  return env.DB;
}

const json = (data: unknown, status = 200, cache = "no-store") =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": cache } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);

    if (pathname === "/api/respuestas") {
      if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
      if (cerrado(Date.now())) return json({ error: "Ya no se aceptan respuestas" }, 410);
      // La IP solo se usa en memoria para limitar envíos repetidos; no se guarda ni se envía a Turnstile.
      const { success } = await env.LIMITE.limit({ key: req.headers.get("cf-connecting-ip") ?? "?" });
      if (!success) return json({ error: "Demasiados envíos" }, 429);
      const body = await req.json().catch(() => null);
      const envio = validar(body);
      if (!envio) return json({ error: "Respuestas no válidas" }, 400);
      const humano = await verificarTurnstile((body as { token?: unknown }).token, {
        secret: env.TURNSTILE_SECRET,
        hostnames: hostnames(env.TURNSTILE_HOSTNAMES),
      });
      if (!humano)
        return json({ error: "No se ha podido comprobar que no eres un robot" }, 403);
      if (cerrado(Date.now())) return json({ error: "Ya no se aceptan respuestas" }, 410);
      const fecha = new Date().toISOString().slice(0, 10);
      await (await db(env)).prepare("INSERT INTO envios (fecha, respuestas) VALUES (?, ?)").bind(fecha, JSON.stringify(envio)).run();
      return json({ ok: true }, 201);
    }

    if (pathname === "/api/resultados") {
      // Re-read the clock when responding: the queries below may cross the start of the blackout.
      const responder = (total: number, filas: Fila[]) => {
        const ahora = Date.now();
        const segundos = maxAge(ahora);
        const cache = segundos > 0 ? `public, max-age=${segundos}` : "no-store";
        return json({ ...resultados(total, filas, ahora), turnstile: env.TURNSTILE_SITEKEY }, 200, cache);
      };
      if (enVeda(Date.now()) || cerrado(Date.now())) return responder(0, []);
      const d = await db(env);
      const total = (await d.prepare("SELECT COUNT(*) AS n FROM envios").first<{ n: number }>())?.n ?? 0;
      const { results } = await d
        .prepare(
          `SELECT j.key AS id,
             SUM(json_extract(j.value, '$[0]') = 1) AS favor,
             SUM(json_extract(j.value, '$[0]') = 0) AS neutral,
             SUM(json_extract(j.value, '$[0]') = -1) AS contra,
             SUM(json_extract(j.value, '$[1]') = 1) AS importa
           FROM envios, json_each(envios.respuestas) AS j GROUP BY j.key`,
        )
        .all<Fila>();
      return responder(total, results);
    }

    if (pathname.startsWith("/api/")) return json({ error: "No encontrado" }, 404);
    return env.ASSETS.fetch(req);
  },

  // Tarea diaria (`triggers.crons` en wrangler.jsonc): llegada la fecha de borrado, elimina todas las respuestas.
  async scheduled(_c: unknown, env: Env): Promise<void> {
    if (cerrado(Date.now())) await (await db(env)).exec("DELETE FROM envios");
  },
};
