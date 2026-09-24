# Orbit Meet SDK 1.0.1

A whole meeting inside your page, in one call: waiting room, screen sharing, captions and host controls included.

[中文](#中文) · [Product page](https://orbit.yunzheng.space/meet/) · [Documentation](https://orbit.yunzheng.space/docs/meet/) · [All SDKs](../../README.md)

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

### Embed a meeting

Create the meeting in Meet or in the console and take its code (`abc-defg-hij`). Then give the SDK an element to fill:

*Join from your own page*

```html
<div id="call" style="height:640px"></div>
<script src="https://meet.yunzheng.space/v1.js"></script>
<script>
  var call = OrbitMeet.join({
    code: "abc-defg-hij",
    name: "Ada",
    el: "#call",
    onJoined: function (d) { console.log("in the meeting as " + d.role); },
    onLeave: function () { console.log("the call is over"); },
    onError: function (e) { console.error(e.code || "meet", e.message); }
  });
  // later: call.leave();
</script>
```

The meeting runs in one frame inside that element: waiting room, screen sharing, captions and host controls are all there. Your page receives events and nothing else — never the meeting's media or its credentials.

> Every embedded visitor joins as a guest, under the meeting's own waiting room, passcode and guest rules. The SDK also accepts a `token` option for a seat your server would issue; the platform does not issue those yet, so leave it out.

### Options

| Option | What it sets |
|---|---|
| `code` | Required. The meeting code, with or without dashes, or any meeting link that carries one. |
| `el` | Where the meeting goes: an element or a selector. Defaults to `document.body`. |
| `name` | The name the meeting shows for this person, up to 40 characters. Without it the guest is asked. |
| `lang` | `en` or `zh`. |
| `width`, `height` | CSS sizes of the frame. By default it fills the element and is at least 420px tall. |
| `title` | The frame's accessible title. Defaults to `Orbit Meet`. |
| `onReady`, `onJoined`, `onLeave`, `onError` | The four events, passed inline. The same as calling `on(...)` afterwards. |

`OrbitMeet.join` returns an object with `on(event, fn)`, `off(event, fn)`, `leave()` (removes the frame), `frame()` (the iframe, or `null` after leaving), `code` and `version`.

### Events

| Event | Inline | When | Detail |
|---|---|---|---|
| `ready` | `onReady` | The meeting page has loaded in the frame. | `{ code }` |
| `joined` | `onJoined` | The person is in the call, past the waiting room if there is one. | `{ session, role }` |
| `left` | `onLeave` | They left, were removed, or the meeting ended. The SDK removes the frame. | `{ session }` |
| `error` | `onError` | Something stopped the join. | `{ code, message }` or `{ message }` |

### Handling errors

Errors are reported, never thrown: a wrong code in your page's content puts a message in your handler instead of stopping your page's script. A code that is not a meeting code is reported as `bad-code` without loading anything. Everything the meeting itself refuses — the meeting has ended, the passcode is wrong, the room is full — arrives with a `message` written for a person, which you can show as it is.

Pass `onError` inline rather than adding it later with `on`: a bad code is reported on the next tick, and the inline handler is already in place to receive it.

### What your page must allow

The SDK creates the frame with `allow="camera; microphone; display-capture; fullscreen; autoplay"`. Browsers deny all of these to a frame from another site unless the attribute says so, which is why a call in a hand-made iframe without it shows a black tile and no error. If you build the iframe yourself, copy that attribute.

If your page sends a Content-Security-Policy, allow `https://meet.yunzheng.space` in both `script-src` (for the SDK) and `frame-src` (for the meeting). A Permissions-Policy header on your page, if you send one, must not switch camera or microphone off for that origin.

### Links instead of an embed

- `OrbitMeet.link(code)` returns the meeting's own address, for a button that opens the meeting in a new tab.
- `OrbitMeet.code(input)` turns what a person typed or pasted into a meeting code, or an empty string if it is not one.

Full documentation: <https://orbit.yunzheng.space/docs/meet/>

---

## 中文

一次调用把完整会议放进你的页面:等候室、屏幕共享、字幕与主持人控制都在其中。

[产品页](https://orbit.yunzheng.space/zh/meet/) · [文档](https://orbit.yunzheng.space/zh/docs/meet/)

### 引入

无需安装,也没有构建步骤。直接从平台加载 `https://meet.yunzheng.space/v1.js`,或用上方带 `integrity` 的写法固定版本 1.0.1。本目录中的 `orbit-meet.js` 与该地址提供的内容逐字节一致。支持当前版本的 Chrome、Edge、Firefox 与 Safari(桌面与移动端)。

### 嵌入一场会议

在 Meet 或控制台里创建会议,拿到会议码(`abc-defg-hij`)。然后给 SDK 一个用来放置会议的元素:

*从你的页面加入*

```html
<div id="call" style="height:640px"></div>
<script src="https://meet.yunzheng.space/v1.js"></script>
<script>
  var call = OrbitMeet.join({
    code: "abc-defg-hij",
    name: "Ada",
    el: "#call",
    onJoined: function (d) { console.log("in the meeting as " + d.role); },
    onLeave: function () { console.log("the call is over"); },
    onError: function (e) { console.error(e.code || "meet", e.message); }
  });
  // later: call.leave();
</script>
```

会议运行在该元素内的一个 frame 里:等候室、屏幕共享、字幕与主持人控制一应俱全。你的页面只收到事件——不会拿到会议的媒体或凭据。

> 每位通过嵌入进入的访客都以来宾身份加入,遵循会议自己的等候室、口令与来宾规则。SDK 也接受由你的服务器签发席位用的 `token` 选项;平台目前尚未签发这类令牌,请不要传。

### 选项

| 选项 | 含义 |
|---|---|
| `code` | 必填。会议码,带不带短横线均可,也可以是包含会议码的任意会议链接。 |
| `el` | 放置位置:元素或选择器,默认 `document.body`。 |
| `name` | 会议里显示的名字,最多 40 个字符;不给则由来宾自己填写。 |
| `lang` | `en` 或 `zh`。 |
| `width`、`height` | frame 的 CSS 尺寸。默认占满元素,最低 420px 高。 |
| `title` | frame 的无障碍标题,默认 `Orbit Meet`。 |
| `onReady`、`onJoined`、`onLeave`、`onError` | 四个事件的内联写法,等同于之后调用 `on(...)`。 |

`OrbitMeet.join` 返回的对象提供 `on(event, fn)`、`off(event, fn)`、`leave()`(移除 frame)、`frame()`(iframe;离开后为 `null`)、`code` 与 `version`。

### 事件

| 事件 | 内联写法 | 时机 | 附带数据 |
|---|---|---|---|
| `ready` | `onReady` | 会议页面已在 frame 中加载。 | `{ code }` |
| `joined` | `onJoined` | 已进入通话;若有等候室,则为通过之后。 | `{ session, role }` |
| `left` | `onLeave` | 离开、被移出或会议结束;SDK 随即移除 frame。 | `{ session }` |
| `error` | `onError` | 加入被阻止。 | `{ code, message }` 或 `{ message }` |

### 处理错误

错误只会被报告,不会被抛出:页面内容里写错的会议码会在你的处理函数里收到一条消息,而不会让你页面的脚本停下。不是会议码的输入会报告为 `bad-code`,且不会加载任何东西。会议本身拒绝的情况——会议已结束、口令错误、人数已满——会带一条写给人看的 `message`,可以直接显示。

请用内联的 `onError`,而不是之后再用 `on` 添加:无效会议码会在下一个事件循环里报告,内联处理函数这时已经就位。

### 你的页面需要放行什么

SDK 创建 frame 时会带上 `allow="camera; microphone; display-capture; fullscreen; autoplay"`。除非属性里写明,浏览器会对来自其他站点的 frame 拒绝这些权限——所以自己手写、不带这个属性的 iframe 只会显示黑色画面,也没有任何报错。如果你自己构建 iframe,请照抄这个属性。

如果你的页面设置了 Content-Security-Policy,请在 `script-src`(加载 SDK)与 `frame-src`(加载会议)中都放行 `https://meet.yunzheng.space`。如果你的页面发送 Permissions-Policy 头,不要对该来源关闭摄像头或麦克风。

### 用链接代替嵌入

- `OrbitMeet.link(code)` 返回会议自己的地址,可用于在新标签页打开会议的按钮。
- `OrbitMeet.code(input)` 把用户输入或粘贴的内容规整为会议码;不是会议码时返回空字符串。

完整文档: <https://orbit.yunzheng.space/zh/docs/meet/>

---

Code: [MIT](../../LICENSE). Orbit and YunZheng names and logos are not covered by the license.
