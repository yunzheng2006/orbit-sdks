# Orbit Talk SDK 1.1.0

Chat and messaging: join a room, send and receive, read history, resume after a reconnect.

[中文](#中文) · [Product page](https://orbit.yunzheng.space/talk/) · [Documentation](https://orbit.yunzheng.space/docs/talk/) · [All SDKs](../../README.md)

## Load it

Nothing to install and no build step. Load the script from the platform:

```html
<script src="https://talk.yunzheng.space/v1.js"></script>
```

Or pin exactly this version with Subresource Integrity:

```html
<script src="https://talk.yunzheng.space/v1.js" integrity="sha384-qY8ZbFtvnA19Epci/QFUb318+oCK9GbvFbXk1xzSM2FmHV79mol6yT1iI/358MyG" crossorigin="anonymous"></script>
```

The copy in this folder ([`orbit-talk.js`](orbit-talk.js)) is byte-for-byte what that URL serves for version 1.1.0 (sha256 `f983dcbef629f2abb06f295a8c06111ecbae2baadef4da522a9f62a1e79d245c`). Self-hosting it works, but you then stop receiving fixes; loading it from the platform is recommended.

Browser support: current versions of Chrome, Edge, Firefox and Safari, desktop and mobile. The script defines one global, `OrbitTalk`.

## Reference

### Create a conversation

*Create a conversation*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/talk/rooms \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Support","kind":"room"}'
```

| Field | What it sets |
|---|---|
| `kind` | `room` keeps history for `retention_days`; `live` keeps the last few hundred messages in memory and nothing on disk. |
| `city` | Where it lives. A pack feature; omit it and the city with the most room takes it. Its history lives there too, so it does not move. |
| `max_peers`, `max_kbps`, `retention_days` | Ceilings for this conversation, up to what the packs allow. Asking for more is refused rather than quietly reduced. |
| `public_join` | `false` means the link answers nothing and only tokens from your backend get in. |

The reply carries `key` (the link) and `join_url` (the hosted page). Set a passcode with `PUT /talk/rooms/{id}/passcode`; what is stored is a hash, and there is nothing to read back.

### The SDK

*Join from your own page*

```html
<script src="https://talk.yunzheng.space/v1.js"></script>
<script>
  var chat = OrbitTalk.join({
    room: "<room key>",
    label: "Ada",
    passcode: "",
    onMessage: function (m) { console.log(m.seq, m.label, m.body); },
    onState: function (s, d) { if (s === "open") console.log("in, " + d.members + " here"); },
    onPresence: function (p) { console.log(p.members + " here"); },
    onError: function (e) { console.error(e.code, e.message); }
  });
  chat.send("Hello");
  // later: chat.leave();
</script>
```

`send` returns an id at once and the message goes out when the connection allows; if the connection is down it waits in an outbox and goes on the next one. Your application never has to write that buffer.

For a backend that decides who may enter — your users, under your names — turn `public_join` off, mint the token on your server with `POST /talk/rooms/{id}/join` (its `peer_id` is your user's id, its `label` is their name), and hand it to the SDK through `fetchJoin`. The SDK calls it again on every reconnect, because a token is good for two minutes.

*The backend door*

```js
OrbitTalk.join({
  fetchJoin: function () {
    // your server calls POST /talk/rooms/{id}/join with the caller's own id and name
    return fetch("/my-api/chat-token", { method: "POST", credentials: "same-origin" })
      .then(function (r) { return r.json(); });
  },
  onMessage: function (m) { /* m.peer is YOUR user id; m.label is the name you gave */ }
});
```

> With link access off, the room key alone opens nothing: a leaked link is worth nothing to anyone, and every seat in the room is one your server issued.

### Reading a conversation back

Messages live on the machine that carries the conversation and are never copied here. Your account can read them back a page at a time with `GET /talk/rooms/{id}/history`, using your API key — so this call belongs on your server, next to the one that mints join tokens.

*Read a conversation, page by page*

```js
var page = await OrbitTalk.history({ room: 12, key: process.env.ORBIT_TOKEN });
page.messages.forEach(function (m) { console.log(m.seq, m.at, m.label, m.body); });

// Walk forward: pass the page's "next" back as the cursor until it comes back null.
while (page.next != null) {
  page = await OrbitTalk.history({ room: 12, key: process.env.ORBIT_TOKEN, cursor: page.next });
}
```

| Field | What it is |
|---|---|
| `cursor` | Read what came after this sequence number. Start with none; pass back the `next` of the page you just read. |
| `limit` | Messages per page, 1 to 500. The default is 200, which is a screenful rather than everything. |
| `next` | The cursor for the next page, or `null` when that was everything. A short page is proof there is no more, so it never carries one. |
| `messages[].peer` | Who sent it. Through the backend door this is your own user id, which is what makes a record of a conversation mean anything a year later. |

> Every read is written to your account's audit log with the conversation, the cursor, the page size and how many messages came back. A live chat keeps nothing on disk, so it answers with an empty page and a sentence saying why.

### When a connection drops

Every message carries a sequence number the conversation assigned, and the SDK remembers the last one it saw. On reconnect it asks for everything after that, so nothing is repeated and nothing is missed. Every message you send carries your own id, so a resend after a reset is answered with the number the first copy already has rather than stored twice.

> History that has aged out is reported as a gap rather than silently skipped: the first frame after reconnecting says the earliest number still available.

### What is counted

| Limit | Meaning |
|---|---|
| Conversations | how many you may have |
| Connections at once | people connected across all conversations |
| Messages per month | counted once each, however many times a client resends |
| GB per month | bytes in and out |
| Days of history | the ceiling for a conversation; a live chat keeps none |

Full documentation: <https://orbit.yunzheng.space/docs/talk/>

---

## 中文

聊天与即时消息:加入会话、收发消息、读取历史、断线后续传。

[产品页](https://orbit.yunzheng.space/zh/talk/) · [文档](https://orbit.yunzheng.space/zh/docs/talk/)

### 引入

无需安装,也没有构建步骤。直接从平台加载 `https://talk.yunzheng.space/v1.js`,或用上方带 `integrity` 的写法固定版本 1.1.0。本目录中的 `orbit-talk.js` 与该地址提供的内容逐字节一致。支持当前版本的 Chrome、Edge、Firefox 与 Safari(桌面与移动端)。

### 创建会话

*创建一个会话*

```sh
curl -X POST https://dash.yunzheng.space/api/v1/talk/rooms \
  -H "Authorization: Bearer $ORBIT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Support","kind":"room"}'
```

| 字段 | 含义 |
|---|---|
| `kind` | `room` 按 `retention_days` 保留历史;`live` 只在内存留最近几百条,不落盘。 |
| `city` | 落在哪座城市。套餐功能;不填则由余量最多的城市接收。历史也在那里,所以不会迁移。 |
| `max_peers`、`max_kbps`、`retention_days` | 本会话的上限,不超过套餐允许值。超过会被拒绝,而不是被悄悄下调。 |
| `public_join` | `false` 表示链接不再应答,只有你后端签发的令牌能进。 |

应答里有 `key`(链接)与 `join_url`(托管页)。用 `PUT /talk/rooms/{id}/passcode` 设口令;存的是哈希,读不回来。

### SDK

*从你的页面加入*

```html
<script src="https://talk.yunzheng.space/v1.js"></script>
<script>
  var chat = OrbitTalk.join({
    room: "<room key>",
    label: "Ada",
    passcode: "",
    onMessage: function (m) { console.log(m.seq, m.label, m.body); },
    onState: function (s, d) { if (s === "open") console.log("in, " + d.members + " here"); },
    onPresence: function (p) { console.log(p.members + " here"); },
    onError: function (e) { console.error(e.code, e.message); }
  });
  chat.send("Hello");
  // later: chat.leave();
</script>
```

`send` 立即返回一个 id,消息在连接允许时发出;连接断开时它在发件箱里等待,下次连上再发。你的应用不必自己写这个缓冲。

如果由你的后端决定谁能进——你的用户、用你给的名字——就关掉 `public_join`,在你的服务器上用 `POST /talk/rooms/{id}/join` 签发令牌(`peer_id` 填你的用户 id,`label` 填显示名),再通过 `fetchJoin` 交给 SDK。每次重连 SDK 都会再调一次,因为令牌只有两分钟有效。

*后端门*

```js
OrbitTalk.join({
  fetchJoin: function () {
    // your server calls POST /talk/rooms/{id}/join with the caller's own id and name
    return fetch("/my-api/chat-token", { method: "POST", credentials: "same-origin" })
      .then(function (r) { return r.json(); });
  },
  onMessage: function (m) { /* m.peer is YOUR user id; m.label is the name you gave */ }
});
```

> 关掉链接访问后,房间密钥本身打不开任何东西:泄露的链接对谁都没用,房间里的每个席位都是你的服务器签发的。

### 读取会话记录

消息存在承载该会话的那台机器上,不会被复制到控制面。你的账号可以用 `GET /talk/rooms/{id}/history` 一页一页读回来,凭的是你的 API 密钥——所以这个调用应当放在你的服务器上,和签发加入令牌的那段代码在一起。

*一页一页读一个会话*

```js
var page = await OrbitTalk.history({ room: 12, key: process.env.ORBIT_TOKEN });
page.messages.forEach(function (m) { console.log(m.seq, m.at, m.label, m.body); });

// Walk forward: pass the page's "next" back as the cursor until it comes back null.
while (page.next != null) {
  page = await OrbitTalk.history({ room: 12, key: process.env.ORBIT_TOKEN, cursor: page.next });
}
```

| 字段 | 含义 |
|---|---|
| `cursor` | 读这个序号之后的内容。第一次不填,之后把上一页的 `next` 传回来。 |
| `limit` | 每页条数,1 到 500。默认 200——一屏的量,而不是全部。 |
| `next` | 下一页的游标;如果已经读完则为 `null`。不满一页就说明没有更多了,所以它不会带游标。 |
| `messages[].peer` | 发送者。走后端门时这就是你自己的用户 id——正因如此,一年后再看这段记录才还有意义。 |

> 每一次读取都会写进你账号的审计日志:哪个会话、游标、每页多少条、返回了多少条。直播聊天不落盘,所以它返回空页并附一句说明。

### 连接断掉时

每条消息都带会话分配的序号,SDK 记住它看到的最后一个。重连时只请求之后的内容,所以不重复、不遗漏。你发出的每条消息也带自己的 id,重置后重发会得到第一份已有的序号,而不会被存两次。

> 已过期的历史会被明确报告为缺口,而不是静默跳过:重连后的第一帧会说明还能提供的最早序号。

### 计量什么

| 限额 | 含义 |
|---|---|
| 会话数 | 可以拥有多少个 |
| 并发连接 | 所有会话加起来同时在线的人数 |
| 每月消息数 | 每条只计一次,无论客户端重发多少次 |
| 每月流量 | 进出字节 |
| 历史天数 | 会话的上限;直播聊天不保留 |

完整文档: <https://orbit.yunzheng.space/zh/docs/talk/>

---

Code: [MIT](../../LICENSE). Orbit and YunZheng names and logos are not covered by the license.
