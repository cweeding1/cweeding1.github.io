// Win/loss record for the Battle Arena on coltonweeding.com.
//   GET  /record                      -> { wins, losses }
//   POST /record  { "result": "win" } -> { wins, losses } after counting it
// "win" and "loss" are from the challenger's point of view.

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
}

interface Record {
  wins: number;
  losses: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") ?? "";
    const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
    const originOk = allowed.includes(origin);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": originOk ? origin : allowed[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname !== "/record") return json({ error: "Not found" }, 404);

    if (request.method === "GET") {
      const row = await env.DB.prepare("SELECT wins, losses FROM record WHERE id = 1").first<Record>();
      return json(row ?? { wins: 0, losses: 0 });
    }

    if (request.method === "POST") {
      // Only the site itself may report results.
      if (!originOk) return json({ error: "Forbidden" }, 403);
      const body = await request.json<{ result?: string }>().catch(() => null);
      const result = body?.result;
      if (result !== "win" && result !== "loss") return json({ error: 'Expected { "result": "win" | "loss" }' }, 400);

      // A single UPDATE is atomic, so simultaneous games can't lose a count.
      const column = result === "win" ? "wins" : "losses";
      const row = await env.DB.prepare(
        `UPDATE record SET ${column} = ${column} + 1 WHERE id = 1 RETURNING wins, losses`,
      ).first<Record>();
      return json(row);
    }

    return json({ error: "Method not allowed" }, 405);
  },
};
