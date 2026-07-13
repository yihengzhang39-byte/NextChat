# Handoff

## Current Status

**2026-07-10 update - account-scoped chat persistence:**

- Chat sessions now persist as `ChatSession.data` JSON snapshots scoped by `userId`; `ChatFile` stores only image metadata while bytes are stored in `CHAT_UPLOAD_DIR/<userId>/<sessionId>/`.
- New `/api/chat/sessions` and `/api/chat/files` routes reuse the existing Session/Cookie user resolver. Session and file reads always include the current `userId`; cross-account IDs return 404 and protected image responses use `Cache-Control: private, no-store`.
- Chat Zustand is now page state only: it loads the signed-in account's sessions from the database, clears on logout, and no longer rehydrates cross-account chat sessions from IndexedDB. Old local histories are intentionally not migrated.
- `.env.template` and both local Docker app services include `CHAT_UPLOAD_DIR=/data/chat-uploads` plus `./data/chat-uploads:/data/chat-uploads` bind mounts.
- Static verification passed: Prettier on supported touched files, Prisma validate/generate, TypeScript check, and the chat-snapshot unit test. No migration was applied, and Docker/browser/model/SMS verification remains user work.

**User next steps:** apply `prisma migrate deploy`, rebuild the no-proxy Docker stack, and manually test A/B account isolation plus protected image access.

**2026-07-09 update - formal Aliyun SMS login hardening:**

- Formal `手机号登录` no longer uses `SMS_MOCK_CODE`; send-code now generates a random 6-digit code and calls Aliyun Dysmsapi `SendSms`.
- Aliyun SMS config reads `ALIYUN_ACCESS_KEY_ID`, `ALIYUN_ACCESS_KEY_SECRET`, `ALIYUN_SMS_SIGN_NAME`, `ALIYUN_SMS_TEMPLATE_CODE`, and `ALIYUN_SMS_TEMPLATE_PARAM_KEY` defaulting to `code`.
- `.env.template` sets non-secret defaults `ALIYUN_SMS_SIGN_NAME=无锡讯智未来`, `ALIYUN_SMS_TEMPLATE_CODE=SMS_509730034`, and `ALIYUN_SMS_TEMPLATE_PARAM_KEY=code`; real AccessKey values remain local only.
- Send-code limits: 60 seconds between sends for the same phone, 10 sends per phone per day, 5-minute expiry, and old unconsumed codes invalidated when a new code is sent.
- Login invalidates a code immediately on success and now invalidates it after five wrong attempts via `SmsCode.failedAttempts`.
- Added Prisma migration `20260709170000_add_sms_failed_attempts`; run migrations before validating formal SMS login.
- Verification run: Prettier on touched code/YAML, `prisma generate`, and `node_modules\.bin\tsc.cmd --noEmit --pretty false` passed. No app server, browser verification, Aliyun SMS call, or model API call was run.


**2026-07-09 update - filing test login:**

- Added a formal-login-page footer entry `备案测试专用` that navigates to `/#/auth/filing-test`.
- Added a filing test login screen that reuses the phone-code login UI, shows the fixed-code hint, returns to `/#/auth`, and never calls the SMS send route when requesting the code.
- Added `/api/auth/filing-test-login`, gated by `FILING_TEST_LOGIN_ENABLED=true`, using `FILING_TEST_LOGIN_CODE` and the existing phone user/session/cookie logic.
- Formal SMS login remains isolated: `/api/auth/sms/login` still validates stored SMS codes and does not accept fixed `123456` by itself.
- `.env.template`, gitignored local `.env`, and `docker-compose.override.yml` include the filing test env vars. Aliyun SMS variables and SDK usage were not changed.
- Verification run: Prettier on touched TS/TSX/SCSS/YAML files and `node_modules\.bin\tsc.cmd --noEmit --pretty false` passed. No app server, browser verification, Aliyun SMS call, or model API call was run.
- User verification still needed: test `/#/auth` -> `备案测试专用` -> fixed-code login with `123456`, and confirm a wrong code is rejected.

**2026-07-06 update - imagev4 audit/business error passthrough:**

- The imagev4 WebSocket route now preserves upstream non-zero business errors instead of collapsing them to `讯飞图像理解返回错误（code xxx）。`.
- For upstream frames with `header.code != 0`, callers receive `服务端业务错误：code=<code>, message=<header.message>, sid=<header.sid>` when those fields are present. The full upstream `header.message`, including Chinese audit text and line breaks, is kept intact.
- If `header.message` is missing, empty, or not a string, the response still includes `服务端业务错误：code=<code>` and includes `sid` only when it is a non-empty string; the old generic imagev4 error text is only appended as fallback context.
- The browser frontend already reads SSE `error.message`; the Excel batch scripts now also avoid truncating JSON HTTP error messages to 500 characters. All batch scripts continue to call only the local `/api/iflytek/v1/chat/completions` route.
- Success path and request construction are unchanged: `domain=imagev4`, WebSocket signing, image base64 handling, streamed text chunks, and final status handling remain in `app/api/iflytek.ts`.
- User verification still required: test a known audit-blocked image in the webpage and in `scripts/batch_eval_iflytek_image_only.py`; confirm the webpage still receives upstream code/message/sid, while the image-only Excel script writes only the cleaned apology text beginning with `非常抱歉` to column D and the row error cell. Logs must not expose credentials, signed URLs, image base64, full prompts, or full normal answers.

**2026-07-03 update:**

- Added `scripts/batch_eval_iflytek_image_text.py`, a standalone Excel batch QA
  script for independent image + text prompts using `image@Iflytek` / `imagev4`.
- Image+text Excel rules: read image paths from D, prompts from E, preserve F as
  reference-answer data that is never sent as input, write `G1=回复`, and write
  each model answer back to the same row in G.
- Image path resolution defaults to `D:\test_datamodel\datas\data`; relative D
  values such as `imgs\A5a0.png` or `imgs/A5a0.png` are resolved as
  `image_root / relative_path`, while absolute paths are used directly.
- The image+text script calls `/api/iflytek/v1/chat/completions` with an
  OpenAI-style multimodal message containing the current row's image data URL
  and prompt only, so the existing backend continues to own imagev4 WebSocket
  signing, base64 extraction, SSE conversion, and response parsing.
- Verification performed without real model traffic: help output, AST syntax
  parse, `py_compile`, and a `--dry-run` workbook test covering relative image
  paths, missing images, empty prompts, skipped existing G replies, status-column
  append when H/I/J are occupied, and preservation of F/other worksheets.
- Real image+text validation is still pending user action: start the local
  backend with valid credentials and run the new script without `--dry-run` on a
  small non-sensitive workbook.
- Added `scripts/batch_eval_iflytek.py`, a standalone Excel batch QA script for
  `image@Iflytek` / `imagev4`.
- The script calls the existing local backend route
  `/api/iflytek/v1/chat/completions` with `model=image@Iflytek`, so the current
  server route continues to own Iflytek WebSocket signing, payload construction,
  SSE conversion, and response parsing.
- Excel rules: read questions from `E2` down, write `F1=回复`, write every answer
  back to the same row in column F, and add `G/H/I` status metadata columns.
- Each row is sent as an independent single-turn `messages` array containing
  only that row's user question. It bypasses the chat store, session memory,
  previous messages, and title/summarization flows.
- Verification performed without model traffic: help output, AST syntax parse,
  `openpyxl` import check, and a `--dry-run` workbook test confirming row
  mapping, skip behavior, and preservation of another worksheet.
- Real Iflytek validation is still pending user action: start the local backend
  with valid credentials and run the script without `--dry-run` on a small
  non-sensitive workbook.

**2026-07-02 update:**

- `image@Iflytek` routing is now model-driven instead of image-presence-driven. Pure text and image + text both go through the server-side imagev4 WebSocket proxy with `domain=imagev4`.
- The imagev4 payload builder now accepts pure-text requests, preserves non-empty system/user/assistant text history, and inserts image base64 parts before the final user question when images are present.
- Configuration now prefers `XF_APPID`, `XF_API_KEY`, `XF_API_SECRET`, `IFLYTEK_IMAGE_WS_HOST`, `IFLYTEK_IMAGE_WS_PATH`, and `IFLYTEK_IMAGE_MODEL=imagev4`; Docker Compose injects those names into both app services.
- Verification remains pending user action. Per instruction, Codex did not run Docker, build, lint, tests, TypeScript checks, browser verification, or real Iflytek API calls for this fix.

**2026-07-01 - current feature branch:** `feature/iflytek-image-websocket`

- Iflytek image understanding is wired through a server-side Node WebSocket
  proxy. The browser calls the local Iflytek API route; API Secret, HMAC
  signature, Authorization query data, and signed upstream URL remain server-side.
- The latest Docker log diagnosis showed upstream WebSocket open succeeded, but
  `ws.send()` failed in the bundled standalone route with a buffer mask helper
  error. The route now disables `ws` optional native buffer/UTF-8 validation
  modules before loading `ws`, so the pure JavaScript fallback is used.
- The image request now matches the verified Python payload shape: `domain=imagev4`,
  `stream=true`, base64 image entries with `content_meta.url=false`, and image
  entries before the user question. The server converts WebSocket frames into
  OpenAI-compatible SSE chunks and sends a safe error SSE when no valid text is
  returned.
- `image@Iflytek` is now in the product model allowlist and `image` is listed as
  an Iflytek model. With local `.env` set to `DEFAULT_MODEL=image@Iflytek` and
  `VISION_MODELS` including `image`, the chat UI should show image upload and
  route image questions to Iflytek.
- Baidu provider code and existing non-image Iflytek HTTP proxy behavior are
  still present. Ordinary text-chat default behavior should be confirmed during
  user testing before removing Baidu or simplifying the UI.
- Docker Compose override now passes the Iflytek image environment field names
  into app containers. `.env.template` documents the field names without real
  credential values.
- Verification status: Codex formatted the touched TypeScript files with Prettier;
  `.env.template` could not be handled by Prettier because no parser is inferred.
  `git diff --check` passed with line-ending warnings only, and
  `corepack yarn tsc --noEmit` passed. `corepack yarn build` reached Next build
  but failed on the existing Windows `EPERM: scandir C:\Users\ZYH\Application Data`
  permission issue. Docker rebuild, container status, HTTP check, browser checks,
  and real image API calls are intentionally left for the user per instruction.
- Security note: server config logging no longer prints raw selected API-key
  values. Continue avoiding credential, signature, Authorization, and signed URL
  output in logs and documents.
- Image diagnostics are request-ID based and must stay limited to counts, timings,
  statuses, MIME/size metadata, and text lengths; never log credentials, signed
  URLs, image base64, full prompts, or full model answers.

Suggested user-run verification commands for this branch:

```powershell
git diff --check
corepack yarn tsc --noEmit
docker compose --profile no-proxy up -d --force-recreate --build
docker compose --profile no-proxy ps
try { (Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 5).StatusCode } catch { $_.Exception.Message }
```

Manual browser check:

- Open `http://localhost:3000`.
- Confirm the active model is `image@Iflytek`.
- Upload a normal-size non-sensitive image and ask a simple image question.
- Confirm the answer streams or completes, errors are readable, and browser logs
  do not show API Secret, signatures, Authorization query data, or signed
  upstream URLs.
- The active collaboration repository is now
  `https://github.com/yihengzhang39-byte/NextChat.git`.
- Local `main` tracks `origin/main`.
- The previous repository is retained locally as `old-origin`
  (`https://github.com/ronvis7/iflytek_chat.git`).
- Development governance documents have been added under `.agents/`.
- Web Chat foundation (PostgreSQL/Prisma, SMS login, feedback APIs, login/feedback pages) merged.

**2026-06-26 (evening 4) - current feature branch:** `feature/legal-doc-render`

- Login page legal links now open app routes (`/#/legal/user-agreement` and
  `/#/legal/privacy-policy`) instead of raw `/docs/*.md` files.
- `LegalDocument` fetches the existing Markdown files from `public/docs/` and
  renders them with the existing `Markdown` component.
- Auth guard skips `/legal/*` so users can read agreements before logging in.
- Login page UI was refreshed on the same branch: desktop now uses a
  brand-panel + login-card layout, mobile collapses to one column, and the login
  brand mark uses the PNG asset to avoid the embedded-SVG white-block rendering
  issue.
- Verification note: `yarn.cmd lint` cannot complete until dependencies are
  fixed for the known `unused-imports/no-unused-imports` crash. `tsc`,
  Prettier, and standalone SCSS compilation passed for the login-page change.

**2026-06-26 (evening) — handoff to colleague. Everything below is on `origin/main`.**

- ✅ Local Docker full-stack verified (`localhost:3000`, postgres + app). ERNIE 5.0
  chat works (streaming + non-streaming).
- ✅ Image upload (multimodal) enabled for ERNIE 5.0, with a base64 fallback so it
  never silently fails when the service worker is not controlling the page.
- ✅ Rebranded to **星跃 Chat** (UI titles, page metadata, PWA manifest) and replaced
  the logo/favicons with the 星跃 logo (source `星跃icon.png` at repo root).
  ⚠️ logo source is only 43×40 px — large PWA icons are blurry; regen from a ≥512px
  source (recipe in WORKLOG).
- ✅ User Agreement / Privacy Policy wired up at `public/docs/*.md` (served at
  `/docs/...`, linked from the login page). Source `.docx` committed at repo root.
- ▶️ **Open next steps** (see TODO.md): Iflytek key + switch default provider back;
  simplify UI to single-model; container auto-migration; Aliyun SMS; fix ESLint hook.

**2026-06-26 update:**

- ✅ **Baidu ERNIE 5.0 (ernie-5.0) v2 API integration complete.**
  - Baidu's new API key format (`bce-v3/ALTAK-...`) is a Bearer Token — no separate Secret Key needed.
  - v2 API endpoint: `https://qianfan.baidubce.com/v2/chat/completions` (OpenAI-compatible).
  - Server-side handler supports both v1 (OAuth2) and v2 (Bearer token) for backward compatibility.
  - Client-side parses both v1 (`result`) and v2 (`choices[0].delta.content`) response formats.
  - Default provider switched to Baidu, default model `ernie-5.0@Baidu`.
  - Auth disabled (`CODE=` empty) for zero-config out-of-box experience.
  - Commit `260d9aed` pushed to `origin/main`.
- ⚠️ ESLint pre-commit hook has a pre-existing bug in `unused-imports` rule (`eslint-rule-composer` crash). Commits must use `--no-verify` until fixed.
- Chat verified working: non-streaming and streaming both return correct responses from ERNIE 5.0.
- `.env` is gitignored (contains API key). New developers must create their own `.env` from `.env.template`.

## Repository Orientation

- `app/`: main Next.js application code.
- `docs/`: project documentation from the upstream project.
- `public/`: static assets.
- `scripts/`: helper scripts.
- `src-tauri/`: desktop app related code.
- `test/`: tests.

## Useful Commands

```bash
yarn install
yarn dev
yarn lint
yarn test:ci
yarn build
```

Database:

```bash
yarn prisma:generate
yarn prisma:migrate
```

Docker local production-style run:

```bash
docker compose --profile no-proxy up -d --build
docker compose --profile no-proxy ps
```

Local URL:

```text
http://localhost:3000
```

## Known Notes

- Git may warn that it cannot read
  `C:\Users\Administrator\.config/git/ignore`. This did not block the initial
  repository migration.
- This repository uses `yarn@1.22.19`.
- `docker-compose.override.yml` makes Docker build the local source code as
  `iflytek-chat:local` instead of using the upstream public image.
- Current local Docker environment has been verified at
  `http://localhost:3000`.
- **ESLint pre-commit hook broken**: `eslint-rule-composer` + `unused-imports/no-unused-imports` crashes with `Cannot read properties of undefined (reading 'loc')`. Use `git commit --no-verify` until fixed.
- **`.env` is gitignored**: contains `BAIDU_API_KEY`. `.env.template` updated 2026-06-26 with a Baidu v2 section and a single `DEFAULT_MODEL`.
- **Docker stack verified on this machine 2026-06-26**: `docker compose --profile no-proxy up -d --build` → postgres healthy + app on `:3000` (HTTP 200), ERNIE 5.0 chat works end-to-end. The compose override now passes `BAIDU_API_KEY`/`DEFAULT_MODEL`/etc into the container.
- **Prisma migrations are NOT auto-applied on container start** (Dockerfile CMD only runs `node server.js`). Run `prisma migrate deploy` manually against the DB after first bringing the stack up (move `prisma.config.ts` aside on the host, or run from a node env that has `dotenv`).
- **Production build is strict**: `yarn dev` does not catch all TypeScript errors that `next build` (Docker) does. Run `yarn build` before relying on a "dev-verified" change.

## Next Suggested Steps

1. Get Iflytek latest model API key → switch `DEFAULT_MODEL` and default provider back to Iflytek.
2. Simplify UI: remove model picker dropdown and Settings provider selector.
3. Replace placeholder agreement and privacy policy content before production.
4. Configure Aliyun SMS credentials in `.env`.
5. Fix ESLint pre-commit hook crash.

**2026-07-06 update:**

- Added `scripts/batch_eval_iflytek_image_only.py` for image-only Excel batch evaluation.
- Defaults: read image paths from `C`, write replies to `D`, and use `E/F/G` for `status`, `latency_seconds`, and `error` when those columns are free.
- The script remaps stale Excel paths by taking the C-column file name/stem and searching the configured `--image-root` for same-stem `.jpg`, `.jpeg`, `.png`, or `.webp` files. Default real image directory is `D:\test_datamodel\图生文\图生文\图片`.
- No prompt column is read; a fixed default image-description instruction is sent with each image unless overridden by `--prompt`.
- Verification so far: help output, Python bytecode compilation, and a local `--dry-run` path-remapping check passed; no real backend/model call was executed.

**2026-07-13 update - Iflytek single-model product:**

- New chats and all new chat requests use `image@Iflytek`; the existing imagev4 WebSocket proxy remains responsible for text-only and image-plus-text requests.
- Baidu has no user-reachable new-request path, model selector, Provider selector, or environment configuration.
- Historical database chat data was not migrated or modified. Runtime validation remains user work.

