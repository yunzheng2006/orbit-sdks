# Orbit Verify SDK 1.4.0

A CAPTCHA alternative for forms: a widget most visitors never click, confirmed by one server-side request.

[中文](#中文) · [Product page](https://orbit.yunzheng.space/verify/) · [Documentation](https://orbit.yunzheng.space/docs/verify/) · [All SDKs](../../README.md)

## Load it

Nothing to install and no build step. Load the script from the platform:

```html
<script src="https://verify.yunzheng.space/v1.js"></script>
```

Or pin exactly this version with Subresource Integrity:

```html
<script src="https://verify.yunzheng.space/v1.js" integrity="sha384-pVkqpA2KCEbXZr1jUXN6sUNlyo57JWKhwt52x06UBEcqaKaMUuhnPk+Oruh31ACl" crossorigin="anonymous"></script>
```

The copy in this folder ([`orbit-verify.js`](orbit-verify.js)) is byte-for-byte what that URL serves for version 1.4.0 (sha256 `fe3dfff90a500dc659ff743362da9b0ef32e19a79ac32a20eca54e12422943b0`). Self-hosting it works, but you then stop receiving fixes; loading it from the platform is recommended.

The widget is also served with `async defer`; a pinned `?v=` query is accepted but not required. Keep the integrity hash in step with the version you pin, or omit it to always receive fixes.

Browser support: current versions of Chrome, Edge, Firefox and Safari, desktop and mobile.

## Reference

### In the page

```html
<script src="https://verify.yunzheng.space/v1.js?v=1.4.0" async defer></script>

<form method="post" action="/login">
  <div class="orbit-verify" data-sitekey="ovk_…" data-action="login"></div>
  <button type="submit">Sign in</button>
</form>
```

The script renders every `.orbit-verify` container on the page and injects a hidden field named `orbit-verify-response` into the surrounding form. Create the site key on the Verify page in the console.

Each site key carries a security level. Every level applies the same checks: User-Agent against the platform the page reports, the request headers a browser sets and page script cannot, browser APIs against the claimed version, interaction and timing, and network and device history. The level sets the risk score at which the visitor is asked to confirm, the score at which the request is refused, and the cost of the proof of work.

| Level | Asks to confirm at | Refuses at | Proof of work |
|---|---|---|---|
| `standard` | 0.35 | 0.70 | 16 bits |
| `strict` | 0.25 | 0.55 | 17 bits |
| `maximum` | 0.15 | 0.40 | 18 bits |

Recommended: `maximum` for sign-up, sign-in, password reset and payment; `strict` for comment and contact forms; `standard` for low-value submissions. The live widget on this site runs at `maximum`. Set the level per key in the console.

If your pages send a `Content-Security-Policy`, list both verification hosts in `connect-src`: `https://verify.yunzheng.space https://verify.edge.yunzheng.space`. The widget asks the nearest edge first and falls back to the first host on its own, so naming only the first still works — it just gives up the nearer answer.

| Attribute | What it does |
|---|---|
| `data-sitekey` | Required. The key from the console. |
| `data-action` | A label, returned as-is by siteverify. Use it to tell a login apart from a signup. |
| `data-theme` | auto, light or dark. |
| `data-size` | normal or compact. |
| `data-lang` | en or zh-CN. Follows the page language when unset. |

### On your server

The token in the form field is worth nothing until you confirm it. Confirm it once, server-side, before you act on the submission.

```js
const r = await fetch("https://verify.yunzheng.space/v1/siteverify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: process.env.ORBIT_VERIFY_SECRET,
    response: req.body["orbit-verify-response"],
    remoteip: req.ip,
  }),
});
const v = await r.json();
// { success, challenge_ts, hostname, action, score, "error-codes": [] }
if (!v.success) return res.status(400).send("verification failed");
```

> Check `hostname` and `action` as well as `success`. A token is only evidence that somebody passed a check — checking those two is what ties it to this form on your site.

A token can be confirmed once. A second confirmation of the same token fails, which is what stops a captured submission from being replayed.

### What it does not do

- No cookies, no iframe, and nothing loaded from a third party.
- No keystrokes and no pointer coordinates are collected.
- Visitor addresses are never stored in the clear.
- Nothing that would let one site's visitors be recognised on another.

Full documentation: <https://orbit.yunzheng.space/docs/verify/>

---

## 中文

表单验证码替代方案:多数访客无需点击的小组件,服务端一次请求完成确认。

[产品页](https://orbit.yunzheng.space/zh/verify/) · [文档](https://orbit.yunzheng.space/zh/docs/verify/)

### 引入

无需安装,也没有构建步骤。直接从平台加载 `https://verify.yunzheng.space/v1.js`,或用上方带 `integrity` 的写法固定版本 1.4.0。本目录中的 `orbit-verify.js` 与该地址提供的内容逐字节一致。支持当前版本的 Chrome、Edge、Firefox 与 Safari(桌面与移动端)。

### 在页面中

```html
<script src="https://verify.yunzheng.space/v1.js?v=1.4.0" async defer></script>

<form method="post" action="/login">
  <div class="orbit-verify" data-sitekey="ovk_…" data-action="login"></div>
  <button type="submit">Sign in</button>
</form>
```

脚本会渲染页面上每一个 `.orbit-verify` 容器,并向其所在表单注入名为 `orbit-verify-response` 的隐藏字段。site key 在控制台的 Verify 页面创建。

每个 site key 带一个安全等级。所有等级施加的检查完全相同:User-Agent 与页面上报的平台是否一致、浏览器自行附加而页面脚本无法设置的请求头、浏览器 API 与所声称版本是否相符、交互与时序,以及网络与设备历史。等级决定三件事:要求访客确认的风险分阈值、拒绝请求的风险分阈值,以及工作量证明的成本。

| 等级 | 要求确认阈值 | 拒绝阈值 | 工作量证明 |
|---|---|---|---|
| `standard` | 0.35 | 0.70 | 16 位 |
| `strict` | 0.25 | 0.55 | 17 位 |
| `maximum` | 0.15 | 0.40 | 18 位 |

建议:注册、登录、找回密码与支付使用 `maximum`;评论与联系表单使用 `strict`;低价值提交使用 `standard`。本站的实时小组件运行在 `maximum`。等级在控制台按 key 设置。

如果你的页面发送 `Content-Security-Policy`,请在 `connect-src` 里同时列出两个验证主机:`https://verify.yunzheng.space https://verify.edge.yunzheng.space`。widget 会先问最近的边缘节点,不通时自行回退到第一个主机 —— 只写第一个仍然可用,只是放弃了更近的那次应答。

| 属性 | 作用 |
|---|---|
| `data-sitekey` | 必填。控制台生成的 key。 |
| `data-action` | 标签,siteverify 会原样返回。用它区分登录与注册。 |
| `data-theme` | auto、light 或 dark。 |
| `data-size` | normal 或 compact。 |
| `data-lang` | en 或 zh-CN。不设时跟随页面语言。 |

### 在你的服务器上

表单字段里的令牌在你确认之前没有任何价值。请在处理提交之前,在服务端确认一次。

```js
const r = await fetch("https://verify.yunzheng.space/v1/siteverify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: process.env.ORBIT_VERIFY_SECRET,
    response: req.body["orbit-verify-response"],
    remoteip: req.ip,
  }),
});
const v = await r.json();
// { success, challenge_ts, hostname, action, score, "error-codes": [] }
if (!v.success) return res.status(400).send("verification failed");
```

> 除了 `success`,还要检查 `hostname` 与 `action`。令牌只能证明有人通过了某次检查 —— 检查这两个字段,才把它绑定到你的站点上的这个表单。

一个令牌只能确认一次。对同一令牌的第二次确认会失败 —— 这正是阻止提交被重放的机制。

### 它不做什么

- 不设 cookie、不用 iframe、不从第三方加载任何资源。
- 不采集键入内容与指针坐标。
- 访客地址从不明文存储。
- 不做任何能让一个站点的访客在另一个站点被识别的事。

完整文档: <https://orbit.yunzheng.space/zh/docs/verify/>

---

Code: [MIT](../../LICENSE). Orbit and YunZheng names and logos are not covered by the license.
