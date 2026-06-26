# Worklog

Use this file to record meaningful project progress. Keep entries concise and
use concrete dates.

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
