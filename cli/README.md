# orbit — Orbit from the command line

Generated from the Orbit API definition: every endpoint (463) is a command, grouped by product.

```sh
npm install -g @yunzheng/orbit-cli
orbit login --token orb_…            # or set ORBIT_TOKEN
orbit dns zones list
orbit dns records create <zone-id> --name www --type A --content 192.0.2.10 --ttl 300
orbit shield sites list --all --json
orbit shield sites purge <site-id> --data '{"everything":true}'
```

## Configuration as code

```ts
// orbit.config.ts
import type { Config } from "@yunzheng/orbit-cli/config";
export default {
  zones: [{ name: "example.com", records: [
    { name: "www", type: "A", content: "192.0.2.10", ttl: 300 },
    { name: "@", type: "MX", content: "10 mx.example.com" },
  ] }],
  sites: [{ hostname: "www.example.com", origin: "192.0.2.10", force_https: true, cache_mode: "static" }],
} satisfies Config;
```

```sh
orbit plan -f orbit.config.ts     # exit code 2 when there are changes
orbit apply -f orbit.config.ts    # asks first; --yes in CI
```

A record set (name + type) that the file lists is made exactly so; sets it does not list are left alone unless the zone says `prune: true`.

Profiles live in `~/.config/orbit/config.json` (`--profile`, `ORBIT_PROFILE`). `--json` on any command prints the raw answer; `--all` follows every page.
