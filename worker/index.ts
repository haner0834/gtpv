/**
 * GTPV Cloudflare Worker
 *
 * Secrets (set via `npx wrangler secret put`):
 *   SALT          - random string, e.g. "gtpv_s@lt_2024"
 *   FOLDER_CODES  - JSON string, e.g. '{"lil-u":"1234","friends":"5678"}'
 *
 * R2 binding (set in wrangler.toml):
 *   R2_BUCKET     - your R2 bucket
 */

export interface Env {
  SALT: string;
  FOLDER_CODES: string;
  R2_BUCKET: R2Bucket;
}

// ── CORS ─────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://gtpv.kmshweb.com",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonResponse(request: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(request), "Content-Type": "application/json" },
  });
}

function errResponse(
  request: Request,
  message: string,
  status: number
): Response {
  return jsonResponse(request, { error: message }, status);
}

async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveToken(
  folder: string,
  passcode: string,
  salt: string
): Promise<string> {
  return sha256hex(`${folder}:${passcode}:${salt}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GET /api/folders
    if (path === "/api/folders" && request.method === "GET") {
      const listed = await env.R2_BUCKET.list({ delimiter: "/" });
      const folders = (listed.delimitedPrefixes ?? []).map((p: any) =>
        p.replace(/\/$/, "")
      );
      return jsonResponse(request, { folders });
    }

    // POST /api/verify
    if (path === "/api/verify" && request.method === "POST") {
      let body: { folder?: string; passcode?: string };
      try {
        body = (await request.json()) as { folder?: string; passcode?: string };
      } catch {
        return errResponse(request, "Invalid JSON", 400);
      }

      const { folder, passcode } = body;
      if (!folder || !passcode)
        return errResponse(request, "Missing fields", 400);

      let codes: Record<string, string>;
      try {
        codes = JSON.parse(env.FOLDER_CODES) as Record<string, string>;
      } catch {
        return errResponse(request, "Server config error", 500);
      }

      // No found passcode = public folder
      if (codes[folder] !== undefined && passcode !== codes[folder]) {
        return errResponse(request, "Invalid passcode", 401);
      }

      const token = await deriveToken(folder, passcode, env.SALT);
      return jsonResponse(request, { token });
    }

    // GET /api/list
    if (path === "/api/list" && request.method === "GET") {
      const folder = url.searchParams.get("folder");
      const token = url.searchParams.get("token");
      if (!folder || !token) return errResponse(request, "Missing params", 400);

      let codes: Record<string, string>;
      try {
        codes = JSON.parse(env.FOLDER_CODES) as Record<string, string>;
      } catch {
        return errResponse(request, "Server config error", 500);
      }

      const isPublic = !(folder in codes);

      if (isPublic) {
        const expected = await deriveToken(folder, codes[folder], env.SALT);
        if (token !== expected)
          return errResponse(request, "Unauthorized", 401);
      }

      const prefix = `${folder}/`;
      const listed = await env.R2_BUCKET.list({ prefix, delimiter: "/" });
      const images = (listed.delimitedPrefixes ?? []).map((p: any) =>
        p.replace(prefix, "").replace(/\/$/, "")
      );
      return jsonResponse(request, { images });
    }

    return errResponse(request, "Not found", 404);
  },
};
