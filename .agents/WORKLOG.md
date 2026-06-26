# Worklog

Use this file to record meaningful project progress. Keep entries concise and
use concrete dates.

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
