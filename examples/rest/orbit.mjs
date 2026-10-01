// Orbit API client and command line (Node.js 18+). Kept for existing
// imports: the client is the generated one in ../../rest/typescript/.
//
//   ORBIT_TOKEN=orb_... node orbit.mjs GET /me
//   ORBIT_TOKEN=orb_... node orbit.mjs POST /talk/rooms '{"name":"Support"}'
//
// As a module: import { orbit, pages, Orbit } from "./orbit.mjs".
import { orbit } from "../../rest/typescript/index.js";
export { orbit, pages, BASE, OrbitError, Orbit } from "../../rest/typescript/index.js";

if (import.meta.url === `file://${process.argv[1]}`) {
  const [method = "GET", path = "/me", body] = process.argv.slice(2);
  orbit(method.toUpperCase(), path, body ? JSON.parse(body) : undefined)
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
