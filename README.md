# Orbit SDKs

Client SDKs, the OpenAPI specification and REST examples for [Orbit](https://orbit.yunzheng.space/), the network and communications platform of YunZheng LAB.

[中文](#中文) · [Developer index](https://yunzheng2006.github.io/orbit-sdks/) · [Orbit documentation](https://orbit.yunzheng.space/docs/) · [API guide](https://orbit.yunzheng.space/docs/api/)

## Browser SDKs

Each SDK is one script tag, with no dependencies and no build step. Every folder has the script as the platform serves it, its Subresource Integrity hash, and the reference.

| SDK | What it does | Load from | Version |
|---|---|---|---|
| [Orbit Realtime](sdks/realtime/) | Voice and video rooms in your own page: join, get the media streams, lay them out yourself. | `https://rtc.yunzheng.space/v1.js` | 1.3.0 |
| [Orbit Talk](sdks/talk/) | Chat and messaging: join a room, send and receive, read history, resume after a reconnect. | `https://talk.yunzheng.space/v1.js` | 1.1.0 |
| [Orbit Meet](sdks/meet/) | A whole meeting inside your page, in one call: waiting room, screen sharing, captions and host controls included. | `https://meet.yunzheng.space/v1.js` | 1.0.1 |
| [Orbit Verify](sdks/verify/) | A CAPTCHA alternative for forms: a widget most visitors never click, confirmed by one server-side request. | `https://verify.yunzheng.space/v1.js` | 1.4.0 |
| [Orbit Player (Stream and VOD)](sdks/player/) | The player for live channels and uploaded videos: adaptive HLS, near-real-time live when the channel offers it. | `https://live.yunzheng.space/v1.js` | 1.6.7 |

## REST API

- Specification: [`openapi/openapi.json`](openapi/openapi.json) (OpenAPI 3.1.0, 247 paths), exported from `https://dash.yunzheng.space/api/v1/openapi.json`.
- Examples: [`examples/rest/`](examples/rest/) — curl and a zero-dependency Node.js client for every product; [`examples/verify-server.mjs`](examples/verify-server.mjs) for confirming a Verify response.
- Phone systems: [orbit-vgate-examples](https://github.com/yunzheng2006/orbit-vgate-examples).

## Versions

[`VERSIONS.json`](VERSIONS.json) lists every SDK's version, URL and hashes; [`CHANGELOG.md`](CHANGELOG.md) records each publication.

## Also on Orbit

[YunZheng Voice](https://yunzheng.space/service/voice) · [YunZheng Meet](https://yunzheng.space/service/meet) · [YunZheng Mail](https://yunzheng.space/service/mail) · [Platform overview](https://github.com/yunzheng2006/orbit-platform)

---

## 中文

[Orbit](https://orbit.yunzheng.space/zh/) 的客户端 SDK、OpenAPI 规范与 REST 示例。Orbit 是芸峥实验室的网络与通信平台。

| SDK | 作用 | 加载地址 | 版本 |
|---|---|---|---|
| [Orbit Realtime](sdks/realtime/) | 在你自己的页面里加入语音与视频房间:拿到媒体流,自行布局。 | `https://rtc.yunzheng.space/v1.js` | 1.3.0 |
| [Orbit Talk](sdks/talk/) | 聊天与即时消息:加入会话、收发消息、读取历史、断线后续传。 | `https://talk.yunzheng.space/v1.js` | 1.1.0 |
| [Orbit Meet](sdks/meet/) | 一次调用把完整会议放进你的页面:等候室、屏幕共享、字幕与主持人控制都在其中。 | `https://meet.yunzheng.space/v1.js` | 1.0.1 |
| [Orbit Verify](sdks/verify/) | 表单验证码替代方案:多数访客无需点击的小组件,服务端一次请求完成确认。 | `https://verify.yunzheng.space/v1.js` | 1.4.0 |
| [Orbit Player (Stream and VOD)](sdks/player/) | 直播频道与点播视频的播放器:自适应 HLS,频道支持时走准实时。 | `https://live.yunzheng.space/v1.js` | 1.6.7 |

每个 SDK 都只需一个 script 标签,无依赖、无构建步骤;各目录提供与平台逐字节一致的脚本、SRI 哈希与参考文档。REST API 规范见 `openapi/openapi.json`,示例见 `examples/`。

---

Code: [MIT](LICENSE). Orbit and YunZheng names and logos are trademarks of YunZheng LAB and are not covered by the license.
