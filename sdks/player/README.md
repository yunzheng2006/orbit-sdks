# Orbit Player (Stream and VOD) SDK 1.6.7

The player for live channels and uploaded videos: adaptive HLS, near-real-time live when the channel offers it.

[中文](#中文) · [Product page](https://orbit.yunzheng.space/stream/) · [Documentation](https://orbit.yunzheng.space/docs/stream/) · [All SDKs](../../README.md)

## Load it

Nothing to install and no build step. Load the script from the platform:

```html
<script src="https://live.yunzheng.space/v1.js"></script>
```

Or pin exactly this version with Subresource Integrity:

```html
<script src="https://live.yunzheng.space/v1.js" integrity="sha384-QRZq66Z8T0VRDvVN7nR4kCFP9okfV3XJRuJh6ncYUD6lb9zji2QA7/RagKgmkTqF" crossorigin="anonymous"></script>
```

The copy in this folder ([`orbit-player.js`](orbit-player.js)) is byte-for-byte what that URL serves for version 1.6.7 (sha256 `4faf763044af0707912f034d42ff0c9958cf931e929644473b4422b42273d6a8`). Self-hosting it works, but you then stop receiving fixes; loading it from the platform is recommended.

Browser support: current versions of Chrome, Edge, Firefox and Safari, desktop and mobile. The script defines one global, `OrbitPlayer`.

## Reference

### The watch address

Two forms, both from the playback identifier, which is a different string from the stream key. The key never appears in anything a browser requests.

*A page, and a manifest*

```js
https://live.yunzheng.space/p/<playback id>            a page that plays it
https://live.yunzheng.space/s/<playback id>/index.m3u8  HLS, for your own player
```

Both addresses come back with the channel, so nothing has to be assembled by hand, and neither changes between broadcasts.

Where a viewer actually connects is what `placement` chose, and it is the same choice on both sides of the broadcast:

| How it is reached | What that means for a viewer |
|---|---|
| **One city you pick** | Viewers reach that city, across the public internet, wherever they are. One city, one address, the same one every time. |
| **Our network** | Viewers reach the city nearest them and it carries the broadcast the rest of the way. Included from the Pro pack. |

> Both are cached the same way: a city pulls the broadcast across once per second whatever the audience, so one viewer and a thousand cost the broadcast the same. What differs between them is the path, not the number of pulls.

| What | How long the edge keeps it |
|---|---|
| The list of qualities | 10 seconds — it names the broadcast and changes once per broadcast. |
| The list of segments | 1 second on `low`, 2 on `standard` — half a piece, because it changes as the broadcast goes on. |
| A segment | 2 minutes. A segment never changes once written. |

> Nothing is kept here unless the channel has recording switched on. When a broadcast ends its segments age out and the address answers as offline; a recorded broadcast is kept separately and played back from its own address (see Recording below).

### The player

The hosted page uses a player you can use too. It is one script with no dependencies: it draws the controls, offers the qualities, shows how far behind the broadcast the viewer is, and plays natively where a browser can and with a component where it cannot.

*Use it as it is*

```html
<div id="player"></div>
<script src="https://live.yunzheng.space/v1.js"></script>
<script>
  OrbitPlayer.mount(document.getElementById("player"), {
    src: "<the channel's playback_url>",
    hlsjs: "https://live.yunzheng.space/static/player.js",
    lang: "en",
    latency: "low"   // match the channel: "low" (default) or "standard"
  });
</script>
```

> Pass `latency` to match the channel’s own setting. It is `"low"` unless you say otherwise, which is also what a channel is unless you say otherwise; a player told `"standard"` on a low-latency channel throws the short window away, and one told `"low"` on a standard channel buffers more than it needs to. On Safari, which plays HLS itself, there is nothing to configure and this option does nothing.

Pass `whep` as well, and the player tries near-real-time playback first and falls back to `src` on its own. Nothing else about your page changes: the same controls, the same events, the same handle.

*Near-real-time first, the playlist as the fallback*

```js
OrbitPlayer.mount(document.getElementById("player"), {
  src:  "<the channel's playback_url>",
  whep: "<the channel's whep_url>",   // near-real-time; omit it and nothing changes
  hlsjs: "https://live.yunzheng.space/static/player.js",
  latency: "low"
}).on("mode", function (m) {
  // "realtime" or "hls" - which engine ended up playing
});
```

> **There is no seeking back on the realtime path.** WebRTC delivers packets rather than a list of pieces, so there is no window behind the live edge: the position line is hidden, `seekLive()` and the step-back keys do nothing, `latency()` returns `null`, and `levels()` is the one picture you published. `handle.mode()` says which engine is playing at any moment, and the `mode` event fires when it changes — including when a realtime attempt gives up and HLS takes over, which is the only signal a page gets, because the viewer is deliberately told nothing.

Three ways to make it yours, from lightest to heaviest:

| Level | How |
|---|---|
| **Restyle** | Set the custom properties on the element you mounted into: `--op-fg`, `--op-frame`, `--op-panel`, `--op-hover`, `--op-live`, `--op-warn`, `--op-line`, `--op-muted`. Override any word with `text: { live: "On air" }`. |
| **Extend** | Switch single controls off with `controls: { stats: false, pip: false }`; add your own with `handle.addButton({ icon, aria, onClick })`, which is built exactly like ours and lands in the same bar; listen with `handle.on("state" \| "levels" \| "level" \| "latency" \| "mode", fn)`. |
| **Build your own** | `controls: false` mounts the engine alone: the video element, the ladder (`levels()`, `setLevel()`, `currentLevel()`), `latency()`, `seekLive()` and the events, with nothing drawn. Draw every control yourself. |

> The quality menu names pictures, not bandwidth: 1080p, 720p, and so on. What each one costs to carry is in the statistics panel for whoever wants it, and is not put in front of somebody choosing what to watch.

| Key | Does |
|---|---|
| Space, K | play / pause |
| J, Left | step back ten (five) seconds into the window behind the edge |
| L, Right | back to live |
| M | mute |
| F | full screen |
| Up, Down | volume |

Live means live: while nobody has stepped back, the line stays full and the badge reads live whatever the measured lag, and a picture that fell far behind on its own (a tab the browser throttled) is caught up quietly — above 8 seconds on a low-latency channel, above 30 on a standard one. Pass `title` to name the broadcast on the lock screen; play, pause and the media keys work from there.

Full documentation: <https://orbit.yunzheng.space/docs/stream/>

### Play it

A public or unlisted video plays at one address, and it does not change:

*The playback address and the poster*

```js
https://vod.yunzheng.space/a/<asset_id>/master.m3u8
https://vod.yunzheng.space/a/<asset_id>/poster.jpg
```

Any player that speaks HLS takes that address. Ours adds a quality menu, picture-in-picture and a statistics panel, and it is two lines:

*Embed the player*

```html
<script src="https://vod.yunzheng.space/v1.js"></script>
<div id="p"></div>
<script>
  OrbitPlayer.mount(document.getElementById('p'), {
    src: 'https://vod.yunzheng.space/a/<asset_id>/master.m3u8',
    vod: true, latency: 'standard'
  })
</script>
```

A `private` video is refused at that address. Ask for a signed one instead; it carries an expiry and a signature, and it stops answering when the expiry passes.

*A signed address, for an hour*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/vod/assets/$ID/playback \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl_s":3600}'
# -> {"master_url":"https://vod.yunzheng.space/a/ovd_.../master.m3u8?exp=...&sig=...",
#     "expires_at":"..."}
```

To sign in your own backend instead — one link per viewer, with no round trip to us — hold a playback key. The secret is shown once, at creation, and cannot be read back afterwards; revoking a key stops every link already signed with it, including one a viewer has open.

*Playback keys*

```sh
curl -X POST   https://dash.yunzheng.space/api/v1/vod/keys -H "Authorization: Bearer $ORBIT_TOKEN"
curl           https://dash.yunzheng.space/api/v1/vod/keys -H "Authorization: Bearer $ORBIT_TOKEN"
curl -X DELETE https://dash.yunzheng.space/api/v1/vod/keys/$KEY_ID -H "Authorization: Bearer $ORBIT_TOKEN"
```

Full documentation: <https://orbit.yunzheng.space/docs/vod/>

---

## 中文

直播频道与点播视频的播放器:自适应 HLS,频道支持时走准实时。

[产品页](https://orbit.yunzheng.space/zh/stream/) · [文档](https://orbit.yunzheng.space/zh/docs/stream/)

### 引入

无需安装,也没有构建步骤。直接从平台加载 `https://live.yunzheng.space/v1.js`,或用上方带 `integrity` 的写法固定版本 1.6.7。本目录中的 `orbit-player.js` 与该地址提供的内容逐字节一致。支持当前版本的 Chrome、Edge、Firefox 与 Safari(桌面与移动端)。

### 观看地址

两种形式,都来自播放标识 —— 它与推流密钥是两个不同的字符串。密钥不会出现在浏览器发起的任何请求里。

*页面与清单*

```js
https://live.yunzheng.space/p/<playback id>            a page that plays it
https://live.yunzheng.space/s/<playback id>/index.m3u8  HLS, for your own player
```

两个地址都随频道一起返回,不需要自己拼;它们在两次直播之间都不会改变。

观众实际连到哪里,由创建频道时的 `placement` 决定 —— 推流与观看两端是同一个选择:

| 访问方式 | 对观众意味着什么 |
|---|---|
| **你指定的一座城市** | 无论观众在哪里,都连到那一座城市,走公网。一座城市、一个地址,每次都一样。 |
| **我们自己的网络** | 观众连到离自己最近的城市,剩下的路程由网络内部承担。自 Pro 套餐起包含。 |

> 两者的缓存方式完全相同:无论观众多少,一座城市每秒只回源一次,因此 1 个观众与 1000 个观众对回源的消耗一样。两者的差别在于**路径**,不在于回源次数。

| 内容 | 边缘保留时长 |
|---|---|
| 画质清单 | 10 秒 —— 它标识本场直播,每场只变一次。 |
| 分片列表 | `low` 档 1 秒,`standard` 档 2 秒 —— 半个分片,因为它随直播推进而变化。 |
| 单个分片 | 2 分钟。分片一旦写出就不再改变。 |

> 除非频道开启了录制,这里不会留存任何内容。直播结束后分片自然过期,地址随即显示为未在播;开启录制的直播另行保存,并从它自己的地址回放(见下文“录制”)。

### 播放器

托管页用的播放器你也可以直接用。它是一个无依赖的脚本:绘制控件、提供画质选择、显示观众落后直播多少秒,浏览器能原生播放时走原生、不能时加载组件。

*直接使用*

```html
<div id="player"></div>
<script src="https://live.yunzheng.space/v1.js"></script>
<script>
  OrbitPlayer.mount(document.getElementById("player"), {
    src: "<the channel's playback_url>",
    hlsjs: "https://live.yunzheng.space/static/player.js",
    lang: "en",
    latency: "low"   // match the channel: "low" (default) or "standard"
  });
</script>
```

> 传入 `latency`,与频道自身的设置保持一致。不填就是 `"low"`,频道不改也是 `"low"`;在低延迟频道上传 `"standard"` 会把短窗口白白丢掉,在标准频道上传 `"low"` 则会多缓冲。Safari 自己播放 HLS,没有可配置的项,这个选项在那里不起作用。

再传入 `whep`,播放器就会先尝试准实时播放,失败时自行退回 `src`。你的页面其余部分不用改:控件、事件、句柄都一样。

*先走准实时,播放列表兜底*

```js
OrbitPlayer.mount(document.getElementById("player"), {
  src:  "<the channel's playback_url>",
  whep: "<the channel's whep_url>",   // near-real-time; omit it and nothing changes
  hlsjs: "https://live.yunzheng.space/static/player.js",
  latency: "low"
}).on("mode", function (m) {
  // "realtime" or "hls" - which engine ended up playing
});
```

> **准实时通道上没有回看。**WebRTC 传的是数据包而不是分片清单,直播边缘之后没有窗口:进度条会隐藏,`seekLive()` 与后退按键不起作用,`latency()` 返回 `null`,`levels()` 只有你推上来的那一路画面。`handle.mode()` 随时给出当前使用的引擎,`mode` 事件在切换时触发 —— 包括准实时尝试失败、由 HLS 接手的那一刻;这是页面唯一能拿到的信号,因为对观众我们刻意什么都不说。

三种改造方式,由轻到重:

| 程度 | 做法 |
|---|---|
| **改样式** | 在挂载元素上设置自定义属性:`--op-fg`、`--op-frame`、`--op-panel`、`--op-hover`、`--op-live`、`--op-warn`、`--op-line`、`--op-muted`。任何文案可用 `text: { live: "直播中" }` 覆盖。 |
| **扩展** | 用 `controls: { stats: false, pip: false }` 关掉单个控件;用 `handle.addButton({ icon, aria, onClick })` 加自己的按钮,它和我们的按钮同样构造、落在同一条控件栏里;用 `handle.on("state" \| "levels" \| "level" \| "latency" \| "mode", fn)` 监听。 |
| **完全自建** | `controls: false` 只挂载引擎:视频元素、档位(`levels()`、`setLevel()`、`currentLevel()`)、`latency()`、`seekLive()` 和事件,什么都不画。所有控件由你自己绘制。 |

> 画质菜单显示的是画面,不是带宽:1080p、720p 等。每一档的开销在统计面板里,给想看的人看,不会摆在正在选画质的观众面前。

| 按键 | 作用 |
|---|---|
| 空格、K | 播放 / 暂停 |
| J、左方向键 | 往回退十(五)秒,进入直播边缘之后的窗口 |
| L、右方向键 | 回到直播 |
| M | 静音 |
| F | 全屏 |
| 上、下方向键 | 音量 |

直播就是直播:只要没人往回拉,进度条一直是满的、徽标一直显示直播中,不管实测落后多少;因浏览器节流等原因自己掉队的画面会被悄悄追回 —— 低延迟频道超过 8 秒时,标准频道超过 30 秒时。传入 `title` 可以让锁屏显示这场直播的名字,播放、暂停和媒体键在那里都能用。

完整文档: <https://orbit.yunzheng.space/zh/docs/stream/>

### 播放

公开与不公开的视频都在同一个地址播放,而且这个地址不会变:

*播放地址与封面*

```js
https://vod.yunzheng.space/a/<asset_id>/master.m3u8
https://vod.yunzheng.space/a/<asset_id>/poster.jpg
```

任何支持 HLS 的播放器都能直接用这个地址。我们的播放器额外提供清晰度菜单、画中画与统计面板,只需两行:

*嵌入播放器*

```html
<script src="https://vod.yunzheng.space/v1.js"></script>
<div id="p"></div>
<script>
  OrbitPlayer.mount(document.getElementById('p'), {
    src: 'https://vod.yunzheng.space/a/<asset_id>/master.m3u8',
    vod: true, latency: 'standard'
  })
</script>
```

`private` 的视频在那个地址上会被拒绝。改为申请一个签名地址:它带有过期时间与签名,过期之后就不再应答。

*一个有效期一小时的签名地址*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/vod/assets/$ID/playback \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl_s":3600}'
# -> {"master_url":"https://vod.yunzheng.space/a/ovd_.../master.m3u8?exp=...&sig=...",
#     "expires_at":"..."}
```

如果想在自己的后端签名 —— 每位观众一条链接,且不必向我们发请求 —— 就持有一把播放密钥。密钥在创建时出现一次,之后无法再读取;吊销密钥会让所有已用它签过的链接立即失效,包括观众正打开着的那一条。

*播放密钥*

```sh
curl -X POST   https://dash.yunzheng.space/api/v1/vod/keys -H "Authorization: Bearer $ORBIT_TOKEN"
curl           https://dash.yunzheng.space/api/v1/vod/keys -H "Authorization: Bearer $ORBIT_TOKEN"
curl -X DELETE https://dash.yunzheng.space/api/v1/vod/keys/$KEY_ID -H "Authorization: Bearer $ORBIT_TOKEN"
```

完整文档: <https://orbit.yunzheng.space/zh/docs/vod/>

---

Code: [MIT](../../LICENSE). Orbit and YunZheng names and logos are not covered by the license.
