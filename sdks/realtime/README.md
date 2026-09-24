# Orbit Realtime SDK 1.3.0

Voice and video rooms in your own page: join, get the media streams, lay them out yourself.

[中文](#中文) · [Product page](https://orbit.yunzheng.space/realtime/) · [Documentation](https://orbit.yunzheng.space/docs/realtime/) · [All SDKs](../../README.md)

## Load it

Nothing to install and no build step. Load the script from the platform:

```html
<script src="https://rtc.yunzheng.space/v1.js"></script>
```

Or pin exactly this version with Subresource Integrity:

```html
<script src="https://rtc.yunzheng.space/v1.js" integrity="sha384-m/wRx3OxCK2AcfWFhZkhNwa1w0oPpDXCIOYTNW3vqZUvFIhxmgA/zj1IjiG38vrB" crossorigin="anonymous"></script>
```

The copy in this folder ([`orbit-rtc.js`](orbit-rtc.js)) is byte-for-byte what that URL serves for version 1.3.0 (sha256 `67d27ae173b515b8f610d51afcf5a8d5fb5f7aadbe90f76795f6774a0dd70be7`). Self-hosting it works, but you then stop receiving fixes; loading it from the platform is recommended.

Browser support: current versions of Chrome, Edge, Firefox and Safari, desktop and mobile. The script defines one global, `OrbitRTC`.

## Reference

### Create a room

In the console, or over the API with a token that has write scope. A room is created with a name and a size; everything else has a default you can change later.

*Create a room*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/rtc/rooms \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Weekly sync","max_peers":12,"max_video":4}'
```

The reply carries the room’s key and, when link access is on, the address to hand out. Both are in the console too — the API is the same room seen from a script.

| Field | What it sets |
|---|---|
| `name` | What the room is called. Up to 60 characters. |
| `max_peers` | How many people may be in the room at once, from 2 to 50. |
| `max_video` | How many of them may send video. Defaults to 0, which is a voice room. |
| `public_join` | Whether the room answers its link at all. Off makes it reachable only through your own service. |
| `passcode` | Write-only. Set it to require one, send an empty string to remove it. |
| `require_verify` | Whether a human check runs before admission. |
| `verify_level` | `standard`, `strict` or `maximum`. |
| `cascade` | Nearest-location routing. On by default for new rooms; see [Nearest location](#nearest). |

> `max_video` is separate from `max_peers` because a camera and a microphone are not the same amount of traffic. A room of ten listeners with two cameras is a different load from a room of ten cameras, and the two numbers let you say which one you meant.

### The link

With link access on, a room is reachable at its own address and needs nothing installed. The page asks the browser for a microphone, and for a camera when the room takes video.

*A room address*

```js
https://rtc.yunzheng.space/r/<room key>
```

Send it the way you would send any other address. Anybody holding it can open the room, which is the reason a room that matters should also carry a passcode, a human check, or both.

### In your own page

One script tag, then one call. The library has no dependencies and no build step, and it draws nothing on its own: you get the media streams and place them in your own layout.

*Join a room from your own page*

```html
<script src="https://rtc.yunzheng.space/v1.js"></script>
<script>
  OrbitRTC.room("<room key>").then(function (room) {
    // room.needs_passcode / room.needs_verify say what to ask for first.
    return OrbitRTC.join({
      room: "<room key>",
      label: "Ada",
      passcode: room.needs_passcode ? prompt("Passcode") : "",
      video: false,
      onTrack: function (stream) {
        var el = document.createElement("audio");
        el.srcObject = stream;
        el.autoplay = true;
        document.body.appendChild(el);
      },
      onError: function (err) { console.error(err.code, err.message); }
    });
  }).then(function (session) {
    window.addEventListener("pagehide", function () { session.leave(); });
  });
</script>
```

Ask the room what it needs before you render a form, rather than finding out by being refused: `OrbitRTC.room()` answers with whether a passcode and a human check are required, so the page can put up the right prompt once.

> If your pages send a `Content-Security-Policy`, the library is loaded from `https://rtc.yunzheng.space` and the room it joins is reached over `https:` and `wss:`. A room set to require a human check also loads the verification widget from `https://verify.yunzheng.space`.

### Conditions on the door

A room checks its conditions before a participant is admitted, so a refusal costs nothing and reveals nothing about who is inside.

- **A passcode** — set on the room, never returned by the API once set. Change it and the old one stops working at once.
- **A human check** — at `standard`, `strict` or `maximum`. The level is part of what is checked: a token earned at `standard` does not satisfy a room set to `maximum`.
- **No link at all** — with link access off, the room address admits nobody, and only the service you built decides who goes in.

### Nearest location

With nearest-location routing on, each participant connects to the Orbit location nearest them. People in the same region talk through the same location, and a call that spans regions links its locations automatically, so everyone hears and sees everyone else in one room.

It is the `cascade` setting on a room: on by default for rooms created from now on, and off for rooms created before it existed until you turn it on. Orbit Meet always uses it. A change applies to the next person who joins; nobody already in the room is moved.

*Turn it on for an existing room*

```sh
curl -X PATCH https://dash.yunzheng.space/api/v1/rtc/rooms/$ID \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cascade":true}'
```

A participant who joins from a browser through the room link is placed by where their connection comes from. When your own server asks for a participant’s join, pass `near` — your server’s location says nothing about theirs. It takes coordinates, or just a country code.

*Join a participant who is in Germany*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/rtc/rooms/$ID/join \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Ada","peer_id":"user-4821","near":{"country":"DE"}}'
```

The reply’s `media_host` is the location that participant was given. Without `near`, they join the room’s first location. A value that cannot be read is ignored rather than refused.

### Where a room runs

With nearest-location routing off, a room runs in one city, and the console names it. The city is fixed on the first join and does not change while people are in the room, because moving a room means dropping everyone in it.

Nothing in a room is recorded. There is no recording to switch on, and no stored copy of what was said or shown.

Full documentation: <https://orbit.yunzheng.space/docs/realtime/>

---

## 中文

在你自己的页面里加入语音与视频房间:拿到媒体流,自行布局。

[产品页](https://orbit.yunzheng.space/zh/realtime/) · [文档](https://orbit.yunzheng.space/zh/docs/realtime/)

### 引入

无需安装,也没有构建步骤。直接从平台加载 `https://rtc.yunzheng.space/v1.js`,或用上方带 `integrity` 的写法固定版本 1.3.0。本目录中的 `orbit-rtc.js` 与该地址提供的内容逐字节一致。支持当前版本的 Chrome、Edge、Firefox 与 Safari(桌面与移动端)。

### 创建房间

可以在控制台创建,也可以用带写权限的令牌通过 API 创建。创建时需要名称与人数上限;其余每一项都有默认值,之后都可以修改。

*创建一个房间*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/rtc/rooms \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Weekly sync","max_peers":12,"max_video":4}'
```

应答里包含房间的标识;链接入口开启时,还包含可以分发的地址。这两项在控制台里同样能看到 —— API 看到的就是同一个房间,只是换了一个视角。

| 字段 | 含义 |
|---|---|
| `name` | 房间名称,最多 60 个字符。 |
| `max_peers` | 同时在房间里的人数,2 到 50。 |
| `max_video` | 其中可以发送视频的人数,默认 0,即语音房间。 |
| `public_join` | 房间是否响应它的链接。关闭后只能通过你自己的服务进入。 |
| `passcode` | 只写字段。设置后即要求口令,传空字符串表示取消。 |
| `require_verify` | 放人进来之前是否执行人机验证。 |
| `verify_level` | `standard`、`strict` 或 `maximum`。 |
| `cascade` | 就近接入。新建房间默认开启;见[就近接入](#nearest)。 |

> `max_video` 与 `max_peers` 分开,是因为一路摄像头与一路麦克风的流量并不相同。十个人听、两路摄像头,与十路摄像头,是完全不同的负载;两个数字让你能说清楚你要的是哪一种。

### 链接

链接入口开启时,房间通过它自己的地址即可访问,访客无需安装任何东西。页面会向浏览器申请麦克风;房间允许视频时,也会申请摄像头。

*房间地址*

```js
https://rtc.yunzheng.space/r/<room key>
```

像分发任何地址一样把它发出去。拿到它的人都能打开房间 —— 这也正是重要的房间应当同时设置口令、人机验证,或两者兼有的原因。

### 嵌入你自己的页面

一行 script 标签,再加一次调用。这个库没有依赖、不需要构建步骤,而且它自己不绘制任何界面:它把媒体流交给你,由你放进自己的排版里。

*从你自己的页面加入房间*

```html
<script src="https://rtc.yunzheng.space/v1.js"></script>
<script>
  OrbitRTC.room("<room key>").then(function (room) {
    // room.needs_passcode / room.needs_verify say what to ask for first.
    return OrbitRTC.join({
      room: "<room key>",
      label: "Ada",
      passcode: room.needs_passcode ? prompt("Passcode") : "",
      video: false,
      onTrack: function (stream) {
        var el = document.createElement("audio");
        el.srcObject = stream;
        el.autoplay = true;
        document.body.appendChild(el);
      },
      onError: function (err) { console.error(err.code, err.message); }
    });
  }).then(function (session) {
    window.addEventListener("pagehide", function () { session.leave(); });
  });
</script>
```

在渲染表单之前先问房间需要什么,而不是被拒绝之后才知道:`OrbitRTC.room()` 会告诉你是否需要口令与人机验证,页面因此可以一次性给出正确的提示。

> 如果你的页面发送 `Content-Security-Policy`:库从 `https://rtc.yunzheng.space` 加载,加入房间时使用 `https:` 与 `wss:`。要求人机验证的房间还会从 `https://verify.yunzheng.space` 加载验证组件。

### 门口的条件

房间在放人进来之前检查条件,因此一次拒绝既没有代价,也不会泄露房间里有谁。

- **口令** —— 设在房间上,设定之后 API 不再返回它。修改口令后,旧口令立即失效。
- **人机验证** —— 级别为 `standard`、`strict` 或 `maximum`。级别本身就是校验内容的一部分:在 `standard` 下取得的令牌,不能满足设为 `maximum` 的房间。
- **完全不开链接** —— 关闭链接入口后,房间地址谁也放不进来,只有你构建的服务能决定谁进入。

### 就近接入

开启就近接入后,每位参与者连接到离自己最近的 Orbit 地点。同一地区的人经由同一个地点通话;跨地区的通话会自动把涉及的地点互联,所有人仍在同一个房间里互相听见、看见。

它对应房间的 `cascade` 设置:此后新建的房间默认开启;此前创建的房间默认关闭,可以随时开启。Orbit Meet 始终使用就近接入。修改从下一位加入的人开始生效,已在房间里的人不会被移动。

*为已有房间开启*

```sh
curl -X PATCH https://dash.yunzheng.space/api/v1/rtc/rooms/$ID \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cascade":true}'
```

通过房间链接在浏览器中加入的参与者,按其连接来源的位置分配地点。由你自己的服务器为参与者申请加入时,请传 `near` —— 你服务器的位置并不代表参与者的位置。它接受经纬度,也可以只给国家代码。

*为一位在德国的参与者申请加入*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/rtc/rooms/$ID/join \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Ada","peer_id":"user-4821","near":{"country":"DE"}}'
```

应答中的 `media_host` 就是分配给这位参与者的地点。不传 `near` 时,参与者加入房间的第一个地点。无法识别的值会被忽略,而不会导致请求被拒绝。

### 房间跑在哪里

关闭就近接入时,房间跑在一座城市里,控制台会标明是哪一座。城市在第一次有人加入时确定,并且在房间里有人期间不再更换 —— 更换房间所在城市意味着把里面的所有人踢下线。

房间内容不会被录制。没有可以开启的录制功能,也不存在对房间内所说、所展示内容的任何留存副本。

完整文档: <https://orbit.yunzheng.space/zh/docs/realtime/>

---

Code: [MIT](../../LICENSE). Orbit and YunZheng names and logos are not covered by the license.
