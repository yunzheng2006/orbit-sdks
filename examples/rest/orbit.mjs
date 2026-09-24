// A zero-dependency Orbit API client and command line (Node.js 18+).
//
//   ORBIT_TOKEN=orb_... node orbit.mjs GET /me
//   ORBIT_TOKEN=orb_... node orbit.mjs POST /talk/rooms '{"name":"Support"}'
//
// As a module: import { orbit, pages } from "./orbit.mjs".

export const BASE = process.env.ORBIT_API || "https://dash.yunzheng.space/api/v1";

export class OrbitError extends Error {
  constructor(status, code, message) { super(`${status} ${code}: ${message}`); this.status = status; this.code = code; }
}

export async function orbit(method, path, body) {
  const token = process.env.ORBIT_TOKEN;
  if (!token) throw new Error("Set ORBIT_TOKEN to an Orbit API token (console: Account -> API).");
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new OrbitError(res.status, data?.error?.code || "http_error", data?.error?.message || res.statusText);
  return data;
}

// Offset paging: yields every item of a list, page by page.
export async function* pages(path, limit = 100) {
  for (let offset = 0; offset !== null && offset !== undefined;) {
    const sep = path.includes("?") ? "&" : "?";
    const r = await orbit("GET", `${path}${sep}limit=${limit}&offset=${offset}`);
    for (const x of r.data || []) yield x;
    offset = r.pagination ? r.pagination.next_offset : null;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [method = "GET", path = "/me", body] = process.argv.slice(2);
  orbit(method.toUpperCase(), path, body ? JSON.parse(body) : undefined)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
