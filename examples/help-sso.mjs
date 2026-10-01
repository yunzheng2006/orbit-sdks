// Orbit Help customer single sign-on: sign a one-time token on YOUR server for
// a customer who is signed in to your site (Node.js 18+, no dependencies).
//
//   ORBIT_HELP_SSO_KEY=hdsso_... node help-sso.mjs <help-desk-address> <user-id> <email> [name]
//
// <help-desk-address> is the <address> in helpdesk.yunzheng.space/t/<address>/
// (the aud of the token). The key is made under your organisation's Orbit
// Help settings -> Integrations. The token is valid for at most five minutes
// and once: send the customer to the printed link (or post it as a form field
// "token" to the same address), or give it to the web widget as
// data-sso-token="..." or OrbitHelp.identify(token).
// The TypeScript SDK has the same helper as signHelpToken(key, {...}).
import { createHmac, randomBytes } from "node:crypto";

const [aud, sub, email, name] = process.argv.slice(2);
const KEY = process.env.ORBIT_HELP_SSO_KEY;
if (!KEY || !aud || !sub || !email) { console.error("Usage: ORBIT_HELP_SSO_KEY=... node help-sso.mjs <help-desk-address> <user-id> <email> [name]"); process.exit(2); }
const b64 = (x) => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const head = b64({ alg: "HS256", typ: "JWT" });
const claims = b64({ sub, email, ...(name ? { name } : {}), aud, iat: now, exp: now + 120, jti: randomBytes(16).toString("base64url") });
const token = `${head}.${claims}.${createHmac("sha256", KEY).update(`${head}.${claims}`).digest("base64url")}`;
console.log(`https://helpdesk.yunzheng.space/t/${aud}/api/auth/sso?token=${token}`);
