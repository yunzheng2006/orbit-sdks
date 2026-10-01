// Receive Orbit Help webhooks and check their signature (Node.js 18+, no dependencies).
//
//   ORBIT_WEBHOOK_SECRET=whsec_... node help-webhook.mjs          (listens on :8787)
//
// Put it behind your https endpoint and add that URL under your organisation's
// Orbit Help settings -> Integrations. Every delivery carries
//   X-Orbit-Event        ticket.created | ticket.replied | ticket.status_changed | ticket.assigned | ping
//   X-Orbit-Delivery     the delivery id (the same on every retry)
//   X-Orbit-Signature    t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with the secret>
// Answer 2xx quickly; anything else is tried again after 1, 5, 30 and 120 minutes.
// The TypeScript SDK has the same check as verifyWebhook(secret, signature, body).
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.ORBIT_WEBHOOK_SECRET;
const TOLERANCE = 300; // seconds: refuse a captured delivery replayed later
const seen = new Set(); // delivery ids already handled (keep these in your database)

export function verify(secret, header, body, now = Date.now()) {
  const p = Object.fromEntries(String(header || "").split(",").map((x) => x.split("=")));
  const t = Number(p.t);
  if (!Number.isInteger(t) || !p.v1 || Math.abs(Math.floor(now / 1000) - t) > TOLERANCE) return false;
  const want = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return want.length === p.v1.length && timingSafeEqual(Buffer.from(want), Buffer.from(p.v1));
}

if (!SECRET) { console.error("Set ORBIT_WEBHOOK_SECRET to the endpoint's signing secret."); process.exit(2); }
createServer((req, res) => {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (c) => { body += c; });
  req.on("end", () => {
    if (req.method !== "POST" || !verify(SECRET, req.headers["x-orbit-signature"], body)) { res.writeHead(400).end("bad signature"); return; }
    const id = req.headers["x-orbit-delivery"];
    if (!seen.has(id)) {
      seen.add(id);
      const e = JSON.parse(body);
      console.log(e.event, e.data.number, e.data.subject, e.data.change || e.data.message?.from || "");
    }
    res.writeHead(200).end("ok");
  });
}).listen(8787, () => console.log("listening on :8787"));
