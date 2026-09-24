# Orbit Meet SDK 1.0.1

A whole meeting inside your page, in one call: waiting room, screen sharing, captions and host controls included.

[中文](#中文) · [Product page](https://orbit.yunzheng.space/meet/) · [Documentation](https://orbit.yunzheng.space/meet/) · [All SDKs](../../README.md)

## Load it

Nothing to install and no build step. Load the script from the platform:

```html
<script src="https://meet.yunzheng.space/v1.js"></script>
```

Or pin exactly this version with Subresource Integrity:

```html
<script src="https://meet.yunzheng.space/v1.js" integrity="sha384-YIeN9M4E9fBmSbrIEQ/3ASL4YBklCVR3VL5rs7J7w5+25+sSA/+Qo9piXXwCTg2P" crossorigin="anonymous"></script>
```

The copy in this folder ([`orbit-meet.js`](orbit-meet.js)) is byte-for-byte what that URL serves for version 1.0.1 (sha256 `9e37d4da208f9dcbc3b65afdfce7ce8233efbb2b91246e566f689b34301acdf9`). Self-hosting it works, but you then stop receiving fixes; loading it from the platform is recommended.

Browser support: current versions of Chrome, Edge, Firefox and Safari, desktop and mobile. The script defines one global, `OrbitMeet`.

## Reference

### Join a meeting from your own page

```html
<div id="call" style="height:640px"></div>
<script src="https://meet.yunzheng.space/v1.js"></script>
<script>
  var call = OrbitMeet.join({ code: "abc-defg-hij", name: "Ada", el: "#call" });
  call.on("joined", function (d) { console.log("in the meeting", d); });
  call.on("error", function (e) { console.error(e.code, e.message); });
  // later: call.leave();
</script>
```

The meeting runs in one frame inside the element you give; your page never receives its media or credentials, only events.

### `OrbitMeet.join(options)`

| Option | Meaning |
|---|---|
| `code` | Required. The meeting code, with or without dashes. |
| `el` | Where to put the meeting: an element or a selector. Defaults to `document.body`. |
| `name` | The name the meeting shows for this person (up to 40 characters). Without it, the guest is asked. |
| `token` | A seat your own server obtained for this person. With it the page asks the visitor for nothing and the meeting's waiting room and rules treat them as your server decided. |
| `lang` | `en` or `zh`. |
| `width`, `height` | CSS sizes of the frame. Defaults: full width, full height of the element, at least 420px tall. |
| `title` | The frame's accessible title. |
| `onReady`, `onJoined`, `onLeave`, `onError` | Shorthands for `on(...)`. |

It returns an object with `on(event, fn)`, `off(event, fn)`, `leave()`, `frame()` and `version`.

### Events

| Event | When |
|---|---|
| `ready` | The meeting page has loaded. |
| `joined` | The person is in the meeting (past the waiting room, if any). |
| `left` | They left, were removed, or the meeting ended. The frame is removed. |
| `error` | Something stopped the join, for example `bad-code` for a code that is not a meeting code. |

### Other calls

- `OrbitMeet.link(code)` returns the meeting's own address, to send to somebody.
- `OrbitMeet.code(input)` normalises what a person typed into a meeting code, or returns an empty string.

### Content-Security-Policy

Allow `https://meet.yunzheng.space` in `script-src` and `frame-src`. The frame asks for camera, microphone, screen capture and fullscreen; the SDK sets its `allow` attribute for you.

---

## 中文

一次调用把完整会议放进你的页面:等候室、屏幕共享、字幕与主持人控制都在其中。

[产品页](https://orbit.yunzheng.space/zh/meet/)

### 引入

无需安装,也没有构建步骤。直接从平台加载 `https://meet.yunzheng.space/v1.js`,或用上方带 `integrity` 的写法固定版本 1.0.1。本目录中的 `orbit-meet.js` 与该地址提供的内容逐字节一致。支持当前版本的 Chrome、Edge、Firefox 与 Safari(桌面与移动端)。

### 在你自己的页面里加入会议

代码与上方英文示例相同。会议运行在你指定元素内的一个 frame 里;你的页面拿不到它的媒体或凭据,只收到事件。

### `OrbitMeet.join(options)`

| 选项 | 含义 |
|---|---|
| `code` | 必填。会议码,带不带短横线均可。 |
| `el` | 放置位置:元素或选择器,默认 `document.body`。 |
| `name` | 会议里显示的名字(最多 40 字);不给则由来宾自己填写。 |
| `token` | 你自己的服务器为此人取得的席位。带上它,页面不再向访客索要任何信息,等候室与会议规则按你的服务器的决定对待此人。 |
| `lang` | `en` 或 `zh`。 |
| `width`、`height` | frame 的 CSS 尺寸;默认占满元素,最低 420px 高。 |
| `title` | frame 的无障碍标题。 |
| `onReady`、`onJoined`、`onLeave`、`onError` | `on(...)` 的简写。 |

返回对象提供 `on(event, fn)`、`off(event, fn)`、`leave()`、`frame()` 与 `version`。

### 事件

| 事件 | 时机 |
|---|---|
| `ready` | 会议页面已加载。 |
| `joined` | 已进入会议(若有等候室,则为通过之后)。 |
| `left` | 离开、被移出或会议结束;frame 随之移除。 |
| `error` | 加入被阻止,例如会议码无效时为 `bad-code`。 |

### 其他调用

- `OrbitMeet.link(code)`:返回会议自己的地址,可直接发给别人。
- `OrbitMeet.code(input)`:把用户输入规整为会议码,无效时返回空字符串。

### 内容安全策略(CSP)

在 `script-src` 与 `frame-src` 中放行 `https://meet.yunzheng.space`。frame 需要摄像头、麦克风、屏幕共享与全屏权限,SDK 会为你设置 `allow` 属性。

---

Code: [MIT](../../LICENSE). Orbit and YunZheng names and logos are not covered by the license.
