# Orbit API — JavaScript / TypeScript

Generated from the Orbit API definition (463 operations). Zero dependencies; Node 18+, Deno, Bun, Workers and browsers.

```sh
npm install @yunzheng/orbit-api
```

```js
import { Orbit } from "@yunzheng/orbit-api";

const api = new Orbit({ token: process.env.ORBIT_TOKEN });   // orb_… token
const { data: zones } = await api.dns.zones.list();
await api.dns.records.create({ id: zones[0].id, body: { name: "www", type: "A", content: "192.0.2.10", ttl: 300 } });

for await (const site of api.shield.sites.list.all()) console.log(site.hostname);  // every page
```

Every operation is also reachable by its operationId: `api.call("records.create", { id, body })`.
Path and query parameters are named arguments; the JSON body is `body`. Errors throw `OrbitError` with `status` and `code`.
Operations marked `write` need a read + write token.

| Namespace | Product | Operations |
|---|---|---|
| `account` | Account | 10 |
| `org` | Organization | 33 |
| `services` | Services | 15 |
| `dns` | DNS | 30 |
| `shield` | Shield | 21 |
| `pages` | Pages | 7 |
| `link` | Link | 8 |
| `verify` | Verify | 8 |
| `rpki` | RPKI | 13 |
| `ripe` | RIPE | 11 |
| `compute` | Compute | 4 |
| `webhooks` | Webhooks | 8 |
| `partners` | Partners | 9 |
| `mail` | Mail | 48 |
| `realtime` | Realtime | 9 |
| `stream` | Stream | 16 |
| `vod` | VOD | 17 |
| `talk` | Talk | 10 |
| `meet` | Meet | 12 |
| `storage` | Storage | 7 |
| `vgate` | V-Gate | 94 |
| `voice` | Voice | 12 |
| `sgate` | S-Gate | 49 |
| `helpdesk` | Orbit Help | 8 |
| `billing` | Billing | 4 |

Reference: https://orbit.yunzheng.space/docs/reference/
