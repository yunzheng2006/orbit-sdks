#!/bin/sh
# One read-only request per product. Usage: sh curl.sh <name>
# Needs ORBIT_TOKEN (console: Account -> API).
set -eu
: "${ORBIT_TOKEN:?set ORBIT_TOKEN to an Orbit API token}"
BASE="${ORBIT_API:-https://dash.yunzheng.space/api/v1}"
case "${1:-me}" in
  me)               path=/me ;;
  dns-zones)        path=/dns/zones ;;
  cdn-sites)        path=/cdn/sites ;;
  pages-projects)   path=/pages/projects ;;
  link-tunnels)     path=/link/tunnels ;;
  verify-sites)     path=/verify/sites ;;
  rtc-rooms)        path=/rtc/rooms ;;
  talk-rooms)       path=/talk/rooms ;;
  stream-streams)   path=/stream/streams ;;
  vod-assets)       path=/vod/assets ;;
  meet-meetings)    path=/meet/meetings ;;
  mail-domains)     path=/mail/domains ;;
  vgate-pbx)        path=/vgate/pbx ;;
  voice-numbers)    path=/voice/numbers ;;
  rpki-cas)         path=/rpki/cas ;;
  webhooks)         path=/webhooks ;;
  *) echo "unknown: $1" >&2; exit 2 ;;
esac
curl -sS -H "Authorization: Bearer $ORBIT_TOKEN" "$BASE$path"
echo
