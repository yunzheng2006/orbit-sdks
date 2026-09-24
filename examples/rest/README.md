# REST examples

Every product in Orbit is also a REST API: one base URL, one token, JSON in and out. These examples are copy-and-run: `curl` for a first look, and zero-dependency Node.js (18 or later) for scripts.

- Base URL: `https://dash.yunzheng.space/api/v1`
- Token: switch on API access in the console (it requires two-factor authentication or a passkey), then create one under Account -> API. Choose read-only unless the example writes.
- Specification: [`../../openapi/openapi.json`](../../openapi/openapi.json), or live at `https://dash.yunzheng.space/api/v1/openapi.json`
- Errors: `{"error": {"code", "message"}}`; the codes are listed in the [API guide](https://orbit.yunzheng.space/docs/api/).

```sh
export ORBIT_TOKEN=orb_...
sh examples/rest/curl.sh me
node examples/rest/orbit.mjs GET /me
```

| Product | curl | Node |
|---|---|---|
| Account | `curl.sh me` | `orbit.mjs GET /me` |
| DNS hosting | `curl.sh dns-zones` | `orbit.mjs GET /dns/zones` |
| Shield | `curl.sh cdn-sites` | `orbit.mjs GET /cdn/sites` |
| Pages | `curl.sh pages-projects` | `orbit.mjs GET /pages/projects` |
| Link | `curl.sh link-tunnels` | `orbit.mjs GET /link/tunnels` |
| Verify | `curl.sh verify-sites` | `orbit.mjs GET /verify/sites` |
| Realtime | `curl.sh rtc-rooms` | `orbit.mjs GET /rtc/rooms` |
| Talk | `curl.sh talk-rooms` | `orbit.mjs GET /talk/rooms` |
| Stream | `curl.sh stream-streams` | `orbit.mjs GET /stream/streams` |
| VOD | `curl.sh vod-assets` | `orbit.mjs GET /vod/assets` |
| Meet | `curl.sh meet-meetings` | `orbit.mjs GET /meet/meetings` |
| Mail | `curl.sh mail-domains` | `orbit.mjs GET /mail/domains` |
| V-Gate | `curl.sh vgate-pbx` | `orbit.mjs GET /vgate/pbx` |
| YunZheng Voice numbers | `curl.sh voice-numbers` | `orbit.mjs GET /voice/numbers` |
| RPKI | `curl.sh rpki-cas` | `orbit.mjs GET /rpki/cas` |
| Webhooks | `curl.sh webhooks` | `orbit.mjs GET /webhooks` |

More phone-system examples (CSV import of extensions, call-log export): [orbit-vgate-examples](https://github.com/yunzheng2006/orbit-vgate-examples).
