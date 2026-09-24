// Confirm an Orbit Verify response on your server (Node.js 18+).
//
//   ORBIT_VERIFY_SECRET=... node verify-server.mjs <orbit-verify-response> [expected-action] [expected-hostname]
//
// In a form handler, pass the posted "orbit-verify-response" field and the
// visitor's address as remoteip. A token confirms once: a second call fails.
// Accept the submission only when success is true AND hostname and action are
// the ones this form expects.
const [response, action, hostname] = process.argv.slice(2);
if (!process.env.ORBIT_VERIFY_SECRET || !response) {
  console.error("Usage: ORBIT_VERIFY_SECRET=... node verify-server.mjs <orbit-verify-response> [action] [hostname]");
  process.exit(2);
}
const r = await fetch("https://verify.yunzheng.space/v1/siteverify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret: process.env.ORBIT_VERIFY_SECRET, response }),
});
const v = await r.json();
console.log(JSON.stringify(v, null, 2));
const ok = v.success === true && (!action || v.action === action) && (!hostname || v.hostname === hostname);
console.log(ok ? "accept" : "reject");
process.exit(ok ? 0 : 1);
