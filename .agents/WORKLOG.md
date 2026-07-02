# Worklog

Use this file to record meaningful project progress. Keep entries concise and
use concrete dates.

## 2026-07-02 - Agent remote documentation update

### Completed

- Updated `AGENTS.md` so the documented `origin` remote matches the current
  collaboration repository: `https://github.com/yihengzhang39-byte/NextChat.git`.
- Confirmed `.agents/HANDOFF.md` already records the active collaboration
  repository, so no handoff status update was needed.

### Verification

- Documentation-only change; no runtime verification required.

## 2026-07-02 - Iflytek imagev4 pure-text routing fix

### Completed

- Root cause: the frontend only treated the bare `image` model as the Iflytek image route, so a selected `image@Iflytek` pure-text request could fall through to the ordinary Iflytek HTTP chat path. The server payload builder also rejected imagev4 requests when no image part was present.
- Changed the routing rule so the normalized selected model `image` / `image@Iflytek` always uses the server-side imagev4 WebSocket proxy, independent of whether the current message contains an image.
- Updated the imagev4 payload builder so pure text and image + text reuse the same WebSocket chain. Pure text sends non-empty text messages directly; image + text keeps base64 image entries with `content_meta.url=false` and inserts them before the final user question.
- Unified imagev4 configuration around `XF_APPID`, `XF_API_KEY`, `XF_API_SECRET`, `IFLYTEK_IMAGE_WS_HOST`, `IFLYTEK_IMAGE_WS_PATH`, and `IFLYTEK_IMAGE_MODEL=imagev4`, with Docker Compose passing the same fields into app containers.
- Main files changed: `app/client/platforms/iflytek.ts`, `app/api/iflytek.ts`, `app/config/server.ts`, `app/utils.ts`, `.env.template`, and `docker-compose.override.yml`.

### Verification

- Ran Prettier on touched TypeScript files only.
- `git diff --check` on touched files passed with line-ending warnings only.
- Per user instruction, did not run Docker, `yarn build`, `yarn lint`, `yarn test`, TypeScript checks, browser verification, or real Iflytek API requests. Awaiting user local validation.

## 2026-07-01 - Iflytek image frontend SSE empty-event fix

### Completed

- Reviewed the latest Docker log: upstream WebSocket opened successfully, ten frames were received, final status was 2, and cumulative text length was nonzero.
- Root cause moved to frontend SSE parsing: the client could receive an empty/comment SSE event from the initial heartbeat and attempted to parse it as JSON, surfacing `讯飞图像理解响应解析失败。` despite a successful server response.
- Updated the Iflytek frontend stream handler to ignore empty SSE event data before JSON parsing.

### Verification

- `corepack yarn prettier --write app/client/platforms/iflytek.ts` passed.
- `corepack yarn tsc --noEmit` passed.
- Docker rebuild and browser retest are pending user action.
## 2026-07-01 - Iflytek image Docker ws send fix

### Completed

- Diagnosed the latest browser error by reading Docker logs. The image request reached the server route, validated host/path/domain, and opened the upstream WebSocket successfully.
- Root cause was a server-side `ws.send()` failure in the bundled Docker/Next standalone route: `TypeError: ...mask is not a function`, caused by the `ws` package trying to use an optional native buffer utility in the bundled runtime.
- Disabled `ws` optional native buffer/UTF-8 validation modules before requiring `ws`, forcing the pure JavaScript fallback and avoiding the bundled `bufferutil` mask failure.

### Verification

- `corepack yarn prettier --write app/api/iflytek.ts` passed.
- `corepack yarn tsc --noEmit` passed.
- Docker rebuild and browser image upload retest are intentionally left for the user.
## 2026-07-01 - Iflytek image empty-response fix

### Completed

- Aligned the server-side Iflytek image WebSocket payload with the verified Python request shape: `domain=imagev4`, `parameter.chat.stream=true`, image entries before the user question, pure base64 image content, and `content_meta.url=false` on image entries.
- Changed the image stream response to flush an initial SSE comment immediately, forward each upstream text fragment as an OpenAI-compatible `choices[0].delta.content` SSE chunk, and send `[DONE]` on final status.
- Added a dedicated 150-second frontend timeout for `image@Iflytek` while keeping ordinary text chat on the existing timeout behavior.
- Added safe image-chain error handling so no-content failures, upstream errors, parse failures, timeouts, and WebSocket close/error paths surface as explicit Chinese errors instead of leaving an empty assistant message for refresh-time cleanup.
- Added minimal server diagnostics keyed by request ID. Logs include endpoint host/path, domain, image counts and sizes, WebSocket open/first-frame timing, frame counts, status fields, and text lengths only.
- Updated `.env.template` to document `IFLYTEK_IMAGE_MODEL=imagev4` for the verified image domain.

### Verification

- Ran `corepack yarn prettier --write app/api/iflytek.ts app/client/platforms/iflytek.ts app/constant.ts .env.template`; TypeScript files were formatted, then Prettier exited with code 2 because `.env.template` has no inferred parser.
- `git diff --check` passed with Windows line-ending warnings only.
- `corepack yarn tsc --noEmit` passed.
- `npm.cmd run build` did not start because the npm prebuild step calls `yarn`, which is not on PATH in this shell.
- `corepack yarn build` generated Prisma client and reached Next build, then failed on the existing Windows `EPERM: scandir C:\Users\ZYH\Application Data` permission issue.
- Docker rebuild, container status, HTTP check, and browser image upload verification are intentionally left for the user per instruction.

### Known Issues

- Real webpage verification is pending user-run Docker and browser testing.
- The existing ESLint `unused-imports` crash remains unrelated to this change.

## 2026-07-01 - Iflytek image WebSocket integration

### Completed

- Created feature branch `feature/iflytek-image-websocket` from local `main` while preserving existing uncommitted work.
- Added a Node runtime Iflytek API route so image understanding can use a server-side WebSocket client without exposing API Secret in the browser.
- Added server-side HMAC-SHA256 signing for the image WebSocket handshake and converted OpenAI-style multimodal chat messages into the verified Iflytek `header` / `parameter.chat` / `payload.message.text` payload shape.
- Converted upstream image WebSocket frames into OpenAI-compatible streaming SSE chunks for the existing frontend chat flow.
- Kept the existing Iflytek HTTP proxy path for non-image text requests and kept Baidu provider code in place.
- Added `image@Iflytek` to the product model allowlist and `image` to the Iflytek model list so the `.env` default model can be honored.
- Updated `.env.template` and Docker Compose override to include the Iflytek image WebSocket environment field names. No real credential values were recorded.
- Removed raw API-key value output from server config logging.

### Verification

- Per user instruction, Codex did not start Docker, run a local server, call the real image API, or execute build/test commands.
- Read-only Docker Compose status check found Docker Desktop was not running on this machine at implementation time.
- Handoff includes commands for the user to run local build, Docker deployment, and image end-to-end checks.

### Known Issues

- End-to-end image verification is pending user-run local testing.
- The existing ESLint `unused-imports` crash remains a known toolchain issue unrelated to this change.
- Old credentials used in earlier manual debugging should be rotated before production use.
## 2026-07-01 - Iflytek image WebSocket API verification

### Completed

- Verified `spark-image-api-test.xf-yun.com` connectivity from the host:
  DNS resolves, TCP 443 is reachable, and unauthenticated HTTPS requests reach
  the Kong gateway with `401 Unauthorized`.
- Confirmed the full image API path provided by Iflytek is
  `/v2.1/image`.
- Tested ordinary HTTPS/HTTP usage against
  `https://spark-image-api-test.xf-yun.com/v2.1/image`:
  unauthenticated requests return `401`, but signed HTTP POST requests return
  `404`; this endpoint should not be integrated as a normal HTTP JSON API.
- Tested the WebSocket endpoint
  `wss://spark-image-api-test.xf-yun.com/v2.1/image` with HMAC-signed query
  parameters. WebSocket handshake succeeded.
- Sent the image chat payload shape with `header`, `parameter.chat`, and
  `payload.message.text`. A 1x1 PNG test image produced an upstream
  `10041 internal server error`, but a normal 64x64 PNG produced a successful
  streamed response with `header.code = 0`.
- Final working conclusion: image understanding must use WebSocket
  `wss://spark-image-api-test.xf-yun.com/v2.1/image`, signed with
  `GET /v2.1/image HTTP/1.1` in the HMAC request line, then send the JSON
  request body after the socket opens.

### Notes

- Do not put the API secret directly in the `Authorization` header. For
  WebSocket, build the canonical string:
  `host: spark-image-api-test.xf-yun.com`, `date: <GMT date>`,
  `GET /v2.1/image HTTP/1.1`; sign it with HMAC-SHA256, base64 the signature,
  then base64 the authorization origin string and pass it as the URL
  `authorization` query parameter.
- Apifox should be configured as a WebSocket request, not an HTTP POST request.
- The credentials used during manual testing were intentionally not recorded
  here. Since they were pasted in chat during debugging, rotate them in the
  Iflytek console before production use.

## 2026-06-30 - Remove startup loading logo screen

### Completed

- Removed the initial full-screen startup loading UI from `app/components/home.tsx`.
- Actual source: `Home` returned the local `Loading` component before client hydration completed; that component rendered `app/icons/bot.svg` plus `app/icons/three-dots.svg`. Dynamic route fallbacks in the same file reused the same component for short preload states.
- Changed `Loading` to render nothing and changed the pre-hydration branch to return `null` directly.
- Removed the now-unused `.loading-content` full-screen centering style from `app/components/home.module.scss`.
- Static logo assets, favicon/PWA manifest assets, sidebar code, auth logic, chat logic, model/provider config, Prisma, PostgreSQL, and Docker Compose were not changed.

### Verification

- Host `yarn build` could not run directly because `yarn` was not on PATH; `corepack yarn build` started Yarn 1.22.19 but failed before build because host dependencies were absent (`prisma` command not found). `corepack yarn install --frozen-lockfile` timed out before creating usable `node_modules`.
- Docker production-style build completed via `docker compose --profile no-proxy up -d --build`. The build reached `yarn build` inside Docker and completed successfully, with existing warnings only: optional `bufferutil` / `utf-8-validate`, autoprefixer `end` support, and the known `unused-imports/no-unused-imports` ESLint crash message.
- Browser hard-refresh verification was not performed by Codex per user instruction; user will test locally.
## 2026-06-29 - Login form inner spacing fix

### Completed

- Fixed the login card form controls in `app/components/auth.tsx` and
  `app/components/auth.module.scss`.
- Root cause: the phone input uses `type="tel"`, so it did not inherit the
  global `input[type="text"]` `box-sizing: border-box` rule. Combined with
  `width: 100%` and horizontal padding, the rendered input exceeded the card
  content area and looked too close to the right edge.
- Added a shared `.phone-auth-form` wrapper around the phone input, code row,
  agreement row, message/mock-code controls, and submit button so form controls
  share one content container.
- Updated the login card/form CSS to use stable inner padding, explicit
  `box-sizing: border-box`, full-width form fields, and a safer verification-code
  row with `flex: 1`/`min-width: 0` for the input and a fixed/min-width send-code
  button.
- No backend, Prisma, Docker Compose, SMS API, model config, logo, chat page, or
  legal-document logic was changed.

### Verification

- Per the latest user instruction, verification was not run by Codex.
- Suggested local checks:
  - `yarn build`
  - `docker compose --profile no-proxy up -d --build`
  - Open `http://localhost:3000/#/auth` and check desktop/narrow layouts for
    symmetric form spacing, aligned controls, and no horizontal scrollbar.

## 2026-06-26 (evening 4) — Remove auth and sidebar brand logos

### Completed

- Removed the large brand logo from the login page (`app/components/auth.tsx`) by
  dropping the `BotIcon` import and logo block.
- Removed the brand logo from the left sidebar header (`app/components/sidebar.tsx`)
  by no longer passing a logo and rendering the logo container only when a logo
  is explicitly provided. Chat/model avatars were not changed.

### Verification

- Code diff checked to confirm only the login page and sidebar brand slots were
  affected. Runtime build was not rerun for this small TSX-only UI removal.


## 2026-06-26 (evening 4) - Legal document rendering

### Completed

- Created branch `feature/legal-doc-render` from `origin/main`
  (`https://github.com/yihengzhang39-byte/NextChat.git`).
- Added an in-app legal document route at `/#/legal/:doc`.
- Updated login page agreement links from direct static Markdown files to:
  - `/#/legal/user-agreement`
  - `/#/legal/privacy-policy`
- Added `LegalDocument`, which fetches `public/docs/*.md` and renders the content
  with the existing `Markdown` component, so the agreement and privacy policy no
  longer open as raw Markdown text.
- Allowed unauthenticated users to view legal document routes, matching the login
  page flow.

### Verification

- Static route/link review completed.
- `yarn lint` via PowerShell was blocked by script execution policy.
- `yarn.cmd lint` could start after escalation, but failed because project
  dependencies are not installed in this workspace (`next` command not found).

## 2026-06-26 (evening 5) - Login page UI refresh

### Completed

- Reworked the SMS login page into a desktop two-column layout with a brand
  panel, product highlights, and a focused login card.
- Added responsive mobile styles so the login form collapses into a single
  column and keeps the verification-code control within the viewport.
- Switched the login page brand mark to the existing PNG logo asset, matching
  the sidebar and avoiding the embedded-SVG rendering issue.

### Verification

- `node_modules\.bin\prettier.cmd --check app\components\auth.tsx app\components\auth.module.scss`
  passed.
- `node_modules\.bin\tsc.cmd --noEmit --pretty false` passed.
- `node_modules\.bin\sass.cmd app\components\auth.module.scss $null` passed.
- `yarn.cmd lint` still fails on the known pre-existing
  `unused-imports/no-unused-imports` crash while linting `app/constant.ts:1`.
- `yarn.cmd build` reached Next build after Prisma generation but failed on a
  local filesystem permission issue scanning `C:\Users\50262\Application Data`.

## 2026-06-26 (evening 3) — Sidebar brand logo sizing fix

### Completed

- Fixed the oversized **星跃 Chat** logo in the left sidebar header.
- Root cause: `app/icons/chatgpt.svg` embeds the brand PNG as a 256x256 SVG, while
  `.sidebar-logo` in `app/components/home.module.scss` had no explicit size. The
  SVG therefore rendered at its intrinsic 256px size inside the sidebar flex row,
  pushing over the title/subtitle and header layout.
- Scoped the fix to the sidebar brand slot only: `.sidebar-logo` is now a stable
  44x44 flex item, clips overflow, centers its content, and constrains direct
  `svg`/`img` children to `width/height: 100%` with `object-fit: contain`.
  Message avatars and favicon/PWA assets were not changed.
- Follow-up: the sidebar slot now renders `app/icons/chatgpt.png` as a normal
  `<img>` instead of the base64 SVG component. The SVG version was size-correct
  after the CSS fix but could render as a blank white block in the sidebar; the
  PNG import is already used elsewhere in the app and loads correctly in this
  small brand slot.
- Fixed the login page (`/#/auth`) logo overlap by shifting only
  `.phone-auth-page .auth-logo` upward. The root issue is the same scaled 256px
  brand SVG: `transform: scale(1.4)` extends the visual box below its layout box,
  covering the **星跃 Chat** title. No auth flow, backend logic, favicon/PWA
  assets, or chat avatars were changed.

### Verification

- `yarn build` could not run on the host because `yarn` is not installed there.
- Verified equivalent production build through Docker:
  `docker compose --profile no-proxy up -d --build` completed successfully.
  Existing warnings remained: optional `bufferutil` / `utf-8-validate`,
  autoprefixer `end` support warning, and the known `unused-imports` ESLint rule
  crash; none blocked the build.
- Verified real rendered layout with headless Edge after mock SMS login:
  expanded desktop, collapsed desktop, and 390px mobile viewport all rendered the
  sidebar logo at 44x44 with no overlap against the title, header action bar, or
  chat list body.
- Re-verified after switching the sidebar logo to PNG: the rendered element is an
  `IMG`, `complete=true`, natural size 256x256, displayed at 44x44, with no
  overlap against title/header/body regions.
- Verified `/#/auth` at 830x800 with headless Edge DOM geometry: logo
  bottom 253px, title top 256px, and no overlap with title, tips, or login
  card.

## 2026-06-26 (evening 2) — Branding to "星跃 Chat", logo, legal docs, upload fix

### Completed

- **Image upload reliability fix** (`app/utils/chat.ts`): `uploadImage` relied
  entirely on the service worker (`/api/cache/upload`); there is no server-side
  `/api/cache` route. Right after a hard refresh the SW is registered
  (`_SW_ENABLED` true) but not yet controlling the page, so the POST was not
  intercepted and failed silently (no UI feedback). Added a `.catch` fallback to
  inline base64 via `compressImage`, so upload never silently fails regardless of
  SW state.
- **Rebranded "讯飞 Web Chat" → "星跃 Chat"**:
  - Titles in `app/components/auth.tsx` and `app/components/sidebar.tsx`
    (subtitle "安全、合规的智能问答服务" kept).
  - `app/layout.tsx` metadata title/description and `public/site.webmanifest`
    name → "星跃 Chat".
- **Replaced the ChatGPT logo with the 星跃 logo everywhere**. Source is
  `星跃icon.png` at repo root. Regenerated all assets with Pillow (centered-square
  pad → resize). To avoid touching every import site, `app/icons/chatgpt.svg` and
  `app/icons/bot.svg` now embed the PNG as a base64 `<image>` (verified the
  base64 survives SVGR and lands in the deployed bundle). Also replaced
  `app/icons/chatgpt.png` and the full `public/` favicon set (ico + 16/32/180/192/512).
  - NOTE: the current `星跃icon.png` source is only 43×40 px, so the large PWA
    icons (192/512) are upscaled and blurry. Re-run the asset generation from a
    ≥512px source for crisp icons. Regen recipe: Pillow, pad to centered square,
    `resize(n, LANCZOS)`, write favicons + `chatgpt.png`, and embed a 256px PNG
    as base64 into `chatgpt.svg` / `bot.svg`.
- **User Agreement & Privacy Policy configured** from the two Word docs
  (`星跃Chat_用户协议.docx`, `星跃Chat_隐私政策.docx`, owner: 无锡讯智未来信息科技有限公司).
  Converted to markdown into `public/docs/user-agreement.md` and
  `public/docs/privacy-policy.md` (served at `/docs/...`, which the login page
  links to — previously those links 404'd because the files were only under the
  non-served root `docs/`). Root `docs/` copies kept in sync for reference.

## 2026-06-26 (evening) — ERNIE 5.0 image upload (multimodal)

### Completed

- **Enabled image upload for ERNIE 5.0.** Two issues fixed:
  1. `ernie-5.0` matched no vision regex and was absent from `VISION_MODELS`,
     so `isVisionModel()` was false → no upload button. Added `ernie-5.0` to the
     `VISION_MODELS` default in `app/config/server.ts` and `app/store/access.ts`,
     plus `.env` / `.env.template`.
  2. `app/client/platforms/baidu.ts` built message content with
     `getMessageTextContent(v)` only — images were silently dropped. Now vision
     models use `preProcessImageContent(v.content)` to send OpenAI-style
     `image_url` parts (qianfan v2 compatible). Non-vision models stay text-only
     (legacy v1 ERNIE does not accept `image_url`).
- Verified end-to-end: `/api/config` exposes `visionModels: ernie-5.0,4.0Ultra`;
  a multimodal `POST /api/baidu/v2/chat/completions` with an inline base64 image
  returns a color answer (image is received and processed by the model).

## 2026-06-26 (afternoon) — Local Docker full-stack brought up

### Completed

- **Docker full-stack verified on this machine** (`http://localhost:3000` → HTTP 200):
  - Created local `.env` from template with the Baidu `bce-v3` Bearer key
    (`.env` is gitignored — key never committed).
  - `docker-compose.override.yml`: app containers now receive `BAIDU_API_KEY`,
    `BAIDU_SECRET_KEY`, `BAIDU_URL`, `DEFAULT_MODEL`, `VISION_MODELS`,
    `IFLYTEK_*`, `SMS_CODE_SECRET`. Previously only DB/admin/SMS-mock were passed,
    so chat could not work inside the container.
  - Applied Prisma migration `20260625143000_init` to the dockerized Postgres
    (User / SmsCode / UserSession / Feedback tables created).
  - End-to-end ERNIE 5.0 chat verified through the container
    (`POST /api/baidu/v2/chat/completions` → valid completion).
- **Fixed latent production-build type error** in `app/client/platforms/baidu.ts`:
  `chatPayload` was annotated `RequestInit`, widening `headers` to `HeadersInit`,
  which is incompatible with `fetchEventSource` (`Record<string,string>`).
  `yarn dev` skips this strict check; `next build` (Docker) failed. Removed the
  annotation so `headers` is inferred as `Record<string,string>`.

### Notes

- To apply Prisma migrations from the host, `prisma.config.ts` must be moved
  aside temporarily (it `import "dotenv/config"` which is unavailable without a
  host `yarn install`). `migrate deploy` then falls back to the schema datasource.

## 2026-06-26

### Completed

- **ERNIE 5.0 v2 API integration** (commit `260d9aed`):
  - Added `BAIDU_V2_BASE_URL` (`https://qianfan.baidubce.com`) and `ernie-5.0` model.
  - Added `isBaiduV2Key()` helper to detect `bce-v3/` Bearer token keys.
  - Server handler (`app/api/baidu.ts`): v2 uses `Authorization: Bearer` header + v2 endpoint; v1 OAuth2 flow preserved for backward compatibility.
  - Client platform (`app/client/platforms/baidu.ts`): v2 Bearer auth in desktop mode + OpenAI-compatible SSE response parsing (`choices[0].delta.content`). v1 `result` parsing preserved.
  - Default provider: `ServiceProvider.OpenAI` → `ServiceProvider.Baidu`.
  - `isValidBaidu()`: only requires `baiduApiKey` for v2 keys (no Secret Key needed).
  - Created `.env` with `BAIDU_API_KEY` and `DEFAULT_MODEL=ernie-5.0@Baidu`.
  - Disabled auth (`CODE=` empty) for zero-config out-of-box chat.
  - Verified: non-streaming returns `{"choices":[{"message":{"content":"..."}}]}`; streaming SSE works with `reasoning_content` (深度思考).

### Decisions

- **Confirmed**: Baidu's new `bce-v3/ALTAK-...` format is the complete credential (Bearer Token). No separate Secret Key exists. This is an API format change, not a missing credential.
- **Backward compatibility**: v1 (OAuth2 `?access_token=`) and v2 (Bearer header) both supported. Detection based on key prefix.
- **Auth disabled for dev**: `CODE=` empty — no password needed to chat. Matches "zero config" product direction.

### Reason

- Complete the immediate integration testing goal from 2026-06-25.
- Enable chat verification before switching to Iflytek as final provider.

## 2026-06-25

### Completed

- Migrated the cloned NextChat project to
  `https://github.com/ronvis7/iflytek_chat.git`.
- Renamed the original remote from `origin` to `upstream`.
- Added the new repository as `origin`.
- Pushed local `main` to `origin/main`.
- Added initial development governance documents under `.agents/`.
- Added `docker-compose.override.yml` so Docker builds the local source code as
  `iflytek-chat:local`.
- Built and started the local Docker container.
- Verified `http://localhost:3000` returns HTTP 200.
- Started implementation of the Web Chat secondary development plan:
  PostgreSQL/Prisma schema, SMS login APIs, feedback APIs, product login page,
  feedback pages, Iflytek default model settings, and deployment notes.

### Decisions

- **Product positioning**: This fork is dedicated to 讯飞星火. The long-term
  plan is to simplify the UI to a single-model interface (like DeepSeek web
  client) — no model/provider switching.
- **Temporary model for testing**: Since Iflytek's latest API key is not yet
  available, we will use Baidu ERNIE 5.0 (`ernie-5.0`) as a temporary model to
  verify the chat interface. Baidu API Key obtained; Secret Key pending
  (expected 2026-06-26).
- **Server-side config approach**: Model credentials will be configured via
  `.env` so the frontend chat works immediately with zero manual setup.

### Reason

- Prepare the project for secondary development in the owner's repository.
- Make future handoff, review, and progress tracking easier.

### Next

- Get Baidu Secret Key → implement ernie5.0 support → verify chat.
- Get Iflytek API key → switch back to Iflytek → simplify UI.

## 2026-07-02 - Chat input AI-generated notice

### Completed

- 在聊天输入区域增加了“注：内容由AI生成”提示。
- 提示放置在输入区工具栏下方、输入框上方的右侧，视觉上靠近发送按钮上方。
- 使用灰色弱提示样式，复用 `var(--black)` 并通过 `color-mix` 降低视觉权重，不使用红色、警告色、背景色块、边框或图标。
- 主要修改文件：`app/components/chat.tsx`、`app/components/chat.module.scss`、`app/locales/cn.ts`、`app/locales/en.ts`。

### Verification

- Per user instruction, did not run Docker, `yarn build`, `yarn lint`, `yarn test`, TypeScript checks, browser automation, screenshots, local development server, or runtime verification. Awaiting user local validation.