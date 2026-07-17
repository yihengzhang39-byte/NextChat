# Worklog

Use this file to record meaningful project progress. Keep entries concise and
use concrete dates.

## 2026-07-16 - Real-name return-to-login action

- Added the real-name page’s top-left “返回” button using the filing-test login page’s existing `auth-return` visual style.
- It now shares the frontend logout flow with sidebar and underage handling: invalidate the Session/Cookie through `/api/auth/logout`, clear account-scoped chat state, then replace-route to `/#/auth`; the shared lock prevents duplicate requests and redirects.
- Real-name verification, age checks, database, filing login, chat permissions, Docker, browser verification, tests, builds, and real interfaces were not changed or run.

## 2026-07-16 - Brand title update

- Updated the login page and chat sidebar brand title from “星跃 Chat” to “星跃多模态大模型”; metadata, PWA name, and the related real-name page reference now use the same product-brand constant where possible.
- Added compact responsive title sizing and no-wrap safeguards for the longer login and sidebar titles. Login, identity, age restriction, chat, and model interfaces were not changed.
- No Docker, browser verification, or real interface request was run.

## 2026-07-16 - Local Mock minor-flow configuration

- Added server-only `IDENTITY_VERIFY_MOCK_AGE_PROFILE`, `IDENTITY_VERIFY_MOCK_BIRTH_DATE`, and `IDENTITY_VERIFY_MOCK_TEST_ID_NUMBER` support, including Docker environment pass-through and blank documented template entries.
- The development-only placeholder is accepted solely by the strict Mock/success/non-production gate. Its age goes through the shared Shanghai age function; placeholder identity data is never encrypted, HMACed, stored as last-four, or bound uniquely.
- Added unexecuted coverage for the local gate and production rejection. No test, build, Docker, database, or external request was run.

## 2026-07-16 - Adult-only chat access and filing-test account seed

- Added age/source fields, shared Shanghai calendar-age calculation, automatic server-side minor-to-adult promotion, and a migration `20260716130000_add_adult_chat_access`.
- `/api/auth/me`, `/api/identity/status`, identity completion, Iflytek POST, and all existing ChatSession/ChatFile guards now use the same access state. Underage users receive the stable `underage_restricted` reason and HTTP 403 on protected APIs.
- Added ten idempotent `FILING_TEST` account seeds with display names and `VERIFIED + ADULT`; no placeholder identity number, encrypted identity field, HMAC, last-four value, provider request ID, provider response, or verification timestamp is written.
- The shared frontend alert is blocking and idempotent: after “我知道了”, it reuses `/api/auth/logout`, clears chat state, and replaces the route with `/#/auth`. Adult flows and the open filing-test login endpoint are unchanged.

### Verification

- Per instruction, no test, lint, TypeScript check, build, formatter, Prisma command, migration, Docker, database write, local server, browser, SMS, Iflytek, or identity-provider request was run. Static review only.

## 2026-07-15 - Identity provider safe failure diagnostics

- Added Aliyun Market provider failure logs with only Provider, failure category, HTTP status, provider request ID, and elapsed time; they never include identity input, credentials, signatures, request bodies, or raw responses.
- Confirmed the running container receives all real-provider settings, and can resolve and complete TLS to the provider host. No real identity request was sent during diagnosis.

## 2026-07-15 - Aliyun Market two-element identity provider

- Added the Guizhou Data Treasure Aliyun Market provider behind the existing `IdentityVerificationProvider`; `/api/identity/verify` continues to own validation, concurrency, status changes, encryption, and persistence.
- The server signs UTF-8 form POST requests with AppKey/AppSecret HMAC-SHA256 canonical headers. `result` `1` maps to verified, `2` to mismatch, and `3` plus all transport, HTTP, JSON, signature, quota, and unknown-result failures to service unavailable.
- Added server-only environment typing, template entries, and both Docker app-service pass-throughs. Missing production credentials fail as configuration errors and never fall back to Mock.
- Replaced hard-coded credentials and test identity data in `test/test-id.py` with environment reads; the script remains a signing reference only.

### Verification

- Per instruction, no test, TypeScript, lint, build, Docker, Mock, or real identity-provider request was run. Static source and diff review only.

## 2026-07-15 - Identity input TypeScript narrowing fix

- Defined validateIdentityInput as a success: true | false discriminated union.
- /api/identity/verify now narrows the failure branch before using its guaranteed string error; successful fields alone are passed to the provider and persistence flow.
- Per instruction, no Docker, build, lint, test, TypeScript, or other verification command was run.

## 2026-07-15 - Forced real-name verification after phone login

### Completed

- Extended the existing `User` with real-name status, encrypted identity fields, an HMAC-unique ID fingerprint, masked-display data, provider/request metadata, failure reason, and attempt timestamp; added migration `20260715110000_add_real_name_verification`.
- Added AES-256-GCM/HMAC server helpers, full mainland 18-digit ID date/checksum validation, `IdentityVerificationProvider`, and controllable Mock results (`success`, `mismatch`, `service_error`). Production Mock requires explicit opt-in.
- Added authenticated `/api/identity/status` and `/api/identity/verify`, database-backed concurrent/rapid-submit protection, encrypted writes only after success, and stable frontend reasons.
- Added `/#/auth/real-name` and a four-state auth/real-name guard shared by formal and filing-test login. Sensitive form fields remain component-local only.
- Required `VERIFIED` on Iflytek POST requests and all ChatSession/ChatFile list/read/write/delete/upload paths, while login, logout, status, identity, and legal paths remain available as specified.
- Added the five identity environment variables to `.env.template`, Docker app-service injection, and server env typings.

### Verification

- Per instruction, no tests, TypeScript, lint, formatting, build, Prisma validation/generation/migration, Docker, browser, SMS, Iflytek, database, or Mock API command was run. Static reference/config/diff review only.
- Existing database compatibility/backfill was intentionally not implemented. The user must stop services, clear/reinitialize PostgreSQL or its Docker volume if desired, apply the new migration through the normal project initialization flow, generate Prisma Client, and verify locally.

## 2026-07-10 - Account-scoped chat persistence and local image storage

### Completed

- Added `ChatSession` and `ChatFile` Prisma models plus migration `20260710120000_add_account_chat_persistence`.
- Added authenticated chat-session and chat-file APIs. Every session/file query uses the user resolved from the existing Session Cookie; file reads are private and never expose storage paths.
- Chat snapshots are stored as one JSON document per session. Inline Base64 and legacy `/api/cache/` image references are removed before database persistence; uploaded image bytes stay under `CHAT_UPLOAD_DIR/<userId>/<sessionId>/` and PostgreSQL stores metadata only.
- Chat Zustand state now loads from `/api/chat/sessions` after authentication, clears on logout, and no longer restores sessions from the account-shared IndexedDB key. New sessions and debounced final chat changes save snapshots to the database.
- Chat image uploads save the session first, upload to `/api/chat/files`, persist a protected file URL in the snapshot, then reuse the existing Cookie-authenticated Base64 conversion for model requests.
- Added `CHAT_UPLOAD_DIR=/data/chat-uploads` to `.env.template` and bind-mounted `./data/chat-uploads` for both Docker app profiles. Old IndexedDB chat history is intentionally not migrated.

### Verification

- Prettier formatted all touched TS/TSX/YAML files; Prisma schema has no Prettier parser.
- `prisma validate`, `prisma generate`, and `tsc --noEmit --pretty false` passed.
- `test/chat-snapshot.test.ts` passed.
- Did not start Docker, apply a database migration, open a browser, call a model API, or send SMS.

## 2026-07-09 - SMS login error message split

### Completed

- Updated `/api/auth/sms/login` to return distinguishable verification-code failure reasons without changing the formal SMS send flow, Aliyun integration, filing-test login, or session-writing path.
- Wrong 6-digit codes now return `reason: "invalid_code"` with `message: "验证码错误"`.
- Expired codes now return `reason: "expired_code"` with `message: "验证码已超时，请重新获取"`.

### Verification

- Ran Prettier on `app/api/auth/sms/login/route.ts`.
- Ran `node_modules\.bin\tsc.cmd --noEmit --pretty false`; passed.
- Ran `git diff --check`; passed with line-ending warnings only.
- Did not start the app or call Aliyun SMS.

## 2026-07-09 - Formal Aliyun SMS login hardening

### Completed

- Re-read current auth flow: login page, phone-code UI, send-code route, login route, mock behavior, session/user helpers, Prisma schema, routes, `.env.template`, and Docker Compose injection.
- Removed formal SMS mock-code behavior from the send route and login UI; formal `手机号登录` now always generates a random 6-digit code and calls Aliyun SMS.
- Updated Aliyun SendSms signing to use `ALIYUN_SMS_SIGN_NAME`, `ALIYUN_SMS_TEMPLATE_CODE`, and configurable `ALIYUN_SMS_TEMPLATE_PARAM_KEY` with default `code`.
- Added 60-second resend limit, 10 successful sends per phone per day, 5-minute expiry, old-code invalidation when sending a new code, and 5 wrong attempts before invalidating a code.
- Added `SmsCode.failedAttempts` plus migration `20260709170000_add_sms_failed_attempts`; code hashes remain stored instead of plaintext codes.
- Kept filing-test login on the dedicated `/api/auth/filing-test-login` route and kept it isolated from formal SMS login.
- Updated `.env.template`, local gitignored `.env` non-secret SMS defaults, and Docker Compose Aliyun env injection. Real AccessKey values were not read, printed, or written.

### Verification

- Ran `node_modules\.bin\prettier.cmd --write` on touched TS/TSX/SCSS/YAML files; `.env.template` remains manually formatted because Prettier has no parser for it.
- Ran `node_modules\.bin\prisma.cmd generate` after adding `SmsCode.failedAttempts`.
- Ran `node_modules\.bin\tsc.cmd --noEmit --pretty false`; passed.
- Did not start the app, call Aliyun SMS, call model APIs, or run browser verification.

### User Verification Needed

- Fill real `ALIYUN_ACCESS_KEY_ID` and `ALIYUN_ACCESS_KEY_SECRET` in local `.env`.
- Apply Prisma migration, then test formal SMS send/login and filing-test login locally.

## 2026-07-09 - Filing test login entry

### Completed

- Added a red, centered `备案测试专用` entry at the bottom of the existing phone-code login form.
- Added a `/#/auth/filing-test` login screen that reuses the current phone login UI, changes the title to `备案测试专用登录`, shows `验证码固定为 123456`, and returns to `/#/auth` from the top-left return button.
- The filing test screen's `获取验证码` button only displays `备案测试验证码为 123456`; it does not call the SMS send route or Aliyun.
- Added the dedicated backend route `/api/auth/filing-test-login`, gated by `FILING_TEST_LOGIN_ENABLED=true`, and checking `FILING_TEST_LOGIN_CODE` before reusing the existing phone user/session/cookie path.
- Kept the formal `/api/auth/sms/login` route dependent on stored SMS codes; it was not changed to accept fixed `123456`.
- Added `FILING_TEST_LOGIN_ENABLED=true` and `FILING_TEST_LOGIN_CODE=123456` to `.env.template`, local gitignored `.env`, and Docker Compose app environment injection.

### Verification

- Ran `node_modules\.bin\prettier.cmd --write` on touched TS/TSX/SCSS/YAML files.
- Ran `node_modules\.bin\tsc.cmd --noEmit --pretty false`; passed.
- Did not start the app, call Aliyun SMS, call real model APIs, or run browser verification.

### User Verification Needed

- Open `http://localhost:3000/#/auth`, confirm the formal phone login still works as before and shows the red `备案测试专用` entry.
- Open the filing test page through that entry, request the code, then log in with a valid phone number, accepted terms, and code `123456`.
- Confirm any other 6-digit code returns `验证码错误`.

## 2026-07-06 - Iflytek image-only audit message Excel display

### Completed

- Updated `scripts/batch_eval_iflytek_image_only.py` so imagev4 audit-block errors are cleaned for Excel display.
- For upstream `AuditImageBlockError` text, the script now strips local/technical prefixes such as `服务端业务错误：code=...`, `message=`, `AuditImageBlockError:(time)`, and trailing `sid`, preserving only the user-facing message beginning with `非常抱歉`.
- For this audit-block case, the cleaned message is written to the D-column `回复` cell as well as the row `error` metadata cell; other failures continue to use the normal error column behavior.

### Verification

- Per user instruction, did not run Docker, call the real Iflytek API, run browser tests, run lint/build/test/tsc, or execute local validation commands.
- Static diff review only.

## 2026-07-06 - Iflytek imagev4 audit/business error passthrough

### Completed

- Read all requested project records before implementation: `.agents/DEVELOPMENT.md`, `.agents/HANDOFF.md`, `.agents/DECISIONS.md`, `.agents/TODO.md`, `.agents/WORKLOG.md`, and `.agents/imagev4_text_success_flow.md`.
- Located the imagev4 upstream WebSocket frame handling in `app/api/iflytek.ts`, specifically the `header.code != 0` branch inside `runIflytekImageSocket`.
- Changed non-zero upstream imagev4 business errors to return a caller-facing message that preserves `header.code`, full string `header.message`, and non-empty string `header.sid` in the format `服务端业务错误：code=<code>, message=<message>, sid=<sid>`.
- Added fallbacks so missing or non-string `header.message` still returns `服务端业务错误：code=<code>` plus `sid` when present, without emitting literal `undefined`, `null`, or an empty sid.
- Kept successful streaming behavior unchanged: `header.code === 0` text extraction, SSE chunk format, `[DONE]`, final `header.status == 2` / `choices.status == 2` handling, WebSocket signing, image base64 handling, and `domain=imagev4` payload construction were not refactored.
- Updated the pure-text, image+text, and image-only Excel batch scripts so HTTP error responses parse JSON `message` before falling back to raw body text, avoiding the old 500-character truncation path for long audit messages. Their normal SSE error parsing already preserved `event.message`.
- Did not add logs containing credentials, HMAC signatures, Authorization query parameters, signed URLs, image base64, full prompts, or full normal model answers.

### Verification

- Per user instruction, did not start Docker, call the real Iflytek API, run browser tests, run lint/build/test/tsc, or execute local validation commands.
- Static diff review only.

### User Verification Needed

- Start the local NextChat backend with valid Iflytek credentials.
- Run the image-only Excel script against a small workbook containing a known audit-blocked image and confirm the row error cell shows the full upstream `AuditImageBlockError` message plus `sid`.

## 2026-07-03 - Iflytek image+text Excel batch QA script

### Completed

- Read all current `.agents` files before implementation: `.agents/DEVELOPMENT.md`, `.agents/HANDOFF.md`, `.agents/DECISIONS.md`, `.agents/TODO.md`, `.agents/WORKLOG.md`, and `.agents/imagev4_text_success_flow.md`.
- Confirmed the current image+text path is `image@Iflytek` routed through the local backend route `/api/iflytek/v1/chat/completions` into the server-side `imagev4` WebSocket proxy.
- Confirmed the real upstream protocol remains the verified `wss://spark-image-api-test.xf-yun.com/v2.1/image` WebSocket flow with HMAC-SHA256 server-side signing, `domain=imagev4`, `stream=true`, and `payload.message.text`.
- Confirmed image handling from current code: `app/client/platforms/iflytek.ts` sends OpenAI-style multimodal `image_url` parts after `preProcessImageContent`; `app/api/iflytek.ts` strips data URL prefixes, sends pure base64 image entries with `content_type=image` and `content_meta.url=false`, inserts image entries before the final user text, and extracts streamed text from `payload.choices.text[*].content` until final status.
- Added `scripts/batch_eval_iflytek_image_text.py`, a standalone Excel batch test script for image + text prompts. It calls the existing local backend route, so the current route continues to own Iflytek auth/signing, request payload construction, WebSocket handling, SSE conversion, and response parsing.
- Excel mapping rules implemented:

```text
读取 D 列图片路径；
读取 E 列提示词；
不读取 F 列作为输入；
G1 写入“回复”；
最终模型回复写入同一行 G 列；
例如：D2 + E2 → G2，D3 + E3 → G3。
```

- Image path rules implemented: default `--image-root` is `D:\test_datamodel\datas\data`; D-column relative paths such as `imgs\A5a0.png` or `imgs/A5a0.png` resolve as `image_root / relative_path`; absolute D-column paths are used directly; surrounding whitespace and quotes are stripped before resolution.
- Missing image paths, empty prompts, unsupported image extensions, and failed image reads are recorded as row-level failures and are not sent to Iflytek.
- Each row is an independent single-turn multimodal request. The script sends only the current row's image data URL and prompt in one `messages` item, with no `sessionId`, `chatId`, `conversationId`, memory, previous Excel row, or chat-store history.
- Default concurrency is `3`, controlled with `asyncio.Semaphore`. Each task carries its original Excel row number, and results are written back by `row -> result`, never by response completion order.
- Added status metadata with `status`, `latency_seconds`, and `error`. The script uses `H/I/J` when they are empty or already contain those metadata headers; if they contain business data, it appends the metadata columns after the current last used column.
- Recommended real-run command:

```powershell
python scripts\batch_eval_iflytek_image_text.py `
  --input "D:\test_datamodel\datas\questions.xlsx" `
  --output "D:\test_datamodel\datas\questions_with_replies.xlsx" `
  --sheet "Sheet1" `
  --image-root "D:\test_datamodel\datas\data" `
  --image-column "D" `
  --prompt-column "E" `
  --reply-column "G" `
  --concurrency 3
```

### Verification

- Did not execute any real model request or backend request.
- `python scripts\batch_eval_iflytek_image_text.py --help` passed.
- Python AST syntax parse passed.
- `python -m py_compile scripts\batch_eval_iflytek_image_text.py` passed.
- Created a temporary fake workbook and PNG, then ran `--dry-run`; verified: D relative path resolution through `--image-root`, G1/G-row reply mapping, same-row status/error writes, missing-image failure, empty-prompt failure, existing G reply skip behavior, preservation of F reference-answer column, preservation of another worksheet, and automatic metadata-column append when H is occupied by business data.

### User Verification Needed

- Start the local NextChat backend with valid Iflytek environment variables.
- Run the script without `--dry-run` against a small non-sensitive workbook.
- Confirm every requested row reads only D/E, never sends F as input, and writes the final model text to the same-row G cell.
- Confirm backend logs show the existing imagev4 route and do not expose credentials, signed URLs, image base64, full prompts, or full answers.

## 2026-07-03 - Iflytek Excel batch QA script

### Completed

- Read all current `.agents` files before implementation:
  `.agents/DEVELOPMENT.md`, `.agents/HANDOFF.md`,
  `.agents/DECISIONS.md`, `.agents/TODO.md`, `.agents/WORKLOG.md`, and
  `.agents/imagev4_text_success_flow.md`.
- Confirmed the current successful Iflytek model path is `image@Iflytek`
  routed to `imagev4` through the server-side WebSocket proxy, not a normal
  browser-side HTTP/SSE direct Iflytek call.
- Confirmed the real upstream protocol and request details:
  `wss://spark-image-api-test.xf-yun.com/v2.1/image`, HMAC-SHA256 signed
  WebSocket query, `domain=imagev4`, `stream=true`,
  `payload.message.text`, and per-request `chat_id`.
- Confirmed the backend converts upstream WebSocket frames into
  OpenAI-compatible SSE chunks and extracts model text from
  `payload.choices.text[*].content` until `header.status == 2` or
  `payload.choices.status == 2`.
- Confirmed the verified successful call chain documented locally:
  `imagev4` pure text via WebSocket using host
  `spark-image-api-test.xf-yun.com`, path `/v2.1/image`, matching AppID/API
  key/API secret, and `domain=imagev4`.
- Added `scripts/batch_eval_iflytek.py`, a standalone Excel batch test script
  that calls the existing local backend route
  `/api/iflytek/v1/chat/completions` with `model=image@Iflytek`, so the
  existing route continues to handle Iflytek auth/signing, request payload
  construction, WebSocket handling, SSE conversion, and response parsing.
- The script keeps each Excel row as an independent single-turn request:
  `messages` contains only the current row's user question, with no
  `sessionId`, `chatId`, `conversationId`, local memory, previous Excel rows,
  chat-store history, or historical `messages` array.
- Excel mapping rules implemented exactly:

```text
从 E2 开始读取问题；
F1 写入“回复”；
每行回答写入同一行 F 列；
E2 → F2，E3 → F3，依此类推。
```

- Added status columns without changing the E/F adjacency:
  `G1=status`, `H1=latency_seconds`, `I1=error`.
- Default concurrency is `5`, controlled with `asyncio.Semaphore`.
  Each task carries its original Excel row number and results are written back
  by `row -> result`, never by completion order.
- The script supports `--input`, `--output`, `--sheet`, `--concurrency`,
  `--force`, `--timeout`, `--retries`, `--start-row`, `--question-column`,
  and `--reply-column`, plus safe local `--dry-run` verification.
- Recommended real-run command:

```powershell
python scripts\batch_eval_iflytek.py `
  --input "D:\path\questions.xlsx" `
  --output "D:\path\questions_with_replies.xlsx" `
  --sheet "Sheet1" `
  --concurrency 5
```

### Verification

- Did not execute any real model request or backend request.
- `python scripts\batch_eval_iflytek.py --help` passed.
- `openpyxl` import check passed locally (`3.1.5`).
- Python AST syntax parse passed. `py_compile` was not used after the Windows
  sandbox denied bytecode cache writes.
- Created a temporary fake workbook and ran `--dry-run`; verified:
  `F1/G1/H1/I1` headers, `E2 -> F2`, `E4 -> F4`, existing `F3` skipped,
  and the extra worksheet was preserved. Temporary test files were removed.

### User Verification Needed

- Start the local NextChat backend with valid Iflytek environment variables.
- Run the script without `--dry-run` against a small non-sensitive workbook.
- Confirm the backend logs show the existing Iflytek imagev4 route and no
  credentials, signed URLs, image base64, full prompts, or full answers are
  exposed.
- Spot-check that every non-empty E-row gets its same-row F reply and skipped
  rows are not re-requested unless `--force` is used.

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

## 2026-07-02 - Chat input notice toolbar alignment adjustment

### Completed

- Adjusted the “注：内容由AI生成” notice from its own row above the input box into the chat input toolbar row, aligned to the far right of the toolbar area to match the requested reference position.
- Kept the existing muted gray text styling and did not change the notice color.
- Main files changed: `app/components/chat.tsx` and `app/components/chat.module.scss`.

### Verification

- Per user instruction, did not run Docker, build, lint, tests, TypeScript checks, browser automation, screenshots, local development server, or runtime verification. Awaiting user local validation.
## 2026-07-02 - Chat input notice vertical alignment tweak

### Completed

- Adjusted the “注：内容由AI生成” toolbar notice vertical alignment so it visually centers with the input toolbar buttons.
- Matched the notice bottom spacing to the existing toolbar button spacing and kept the muted gray text color unchanged.
- Main file changed: `app/components/chat.module.scss`.

### Verification

- Per user instruction, did not run Docker, build, lint, tests, TypeScript checks, browser automation, screenshots, local development server, or runtime verification. Awaiting user local validation.
## 2026-07-06 - Iflytek image-only Excel batch QA script

### Completed

- Added `scripts/batch_eval_iflytek_image_only.py`, a standalone Excel batch script for image-only Iflytek evaluation through the existing local `/api/iflytek/v1/chat/completions` route.
- Default Excel mapping: read image paths from `C`, write replies to `D`, and write `status`, `latency_seconds`, and `error` to `E/F/G` when available.
- Added path remapping for old Excel paths: the script prefers the configured `--image-root`, takes the C-column file name/stem, and tries same-stem `.jpg`, `.jpeg`, `.png`, and `.webp` files. This covers rows such as old `A1a01.png` paths resolving to actual `A1a01.jpg` files under `D:\test_datamodel\图生文\图生文\图片`.
- No prompt column is read. The script sends each image with a default fixed instruction, configurable through `--prompt`; each row remains an independent single-turn multimodal request.

### Verification

- `python .\scripts\batch_eval_iflytek_image_only.py --help` passed.
- `python -m py_compile .\scripts\batch_eval_iflytek_image_only.py` passed.
- Created a temporary workbook with C2 set to an old absolute `.png` path and a real same-stem `.jpg` under a test `--image-root`; `--dry-run` resolved the `.jpg`, wrote `[dry-run] A1a01.jpg` to D2, and marked E2 as `success`.
- Did not execute real backend or model requests.

### User Verification Needed

- Start the local NextChat backend with valid Iflytek credentials.
- Run the image-only script on a small workbook and spot-check that C-column old paths map to the real image directory and that replies land in the intended reply column.

## 2026-07-13 - Iflytek single-model product

- Removed the Baidu runtime proxy, client implementation, credentials, model allowlist entries, Docker injection, and visible configuration entry points.
- Fixed product defaults, new chat configuration, request dispatch, and image upload recognition to `image@Iflytek` / `imagev4`; no historical sessions were migrated or changed.
- Static review covered Baidu/ERNIE configuration and routing references plus `image@Iflytek`, `DEFAULT_MODEL`, and `VISION_MODELS`. Runtime verification was not run per instruction.


## 2026-07-16 - Real-name response parsing and rate limit

- Fixed formal Aliyun parsing to require code 10000 and data.result; conflicting legacy and data results fail closed.
- Maps results 1/2/3 to verified/mismatch/service unavailable and SYSTEM_042 to invalid_idcard. Extra personal fields are ignored.
- Added persistent IdentityVerificationAttempt records and atomic three-minute/two-attempt rate limiting.
- Restored failIdentityVerification and completeIdentityVerification after accidental identity.ts truncation; verified data remains encrypted before persistence.
- Added parser unit coverage. No real provider request, Docker, browser, or database operation was run.

## 2026-07-16 - Local ID-number validation false rejection

- Browser payload was confirmed complete; the real provider was not reached because local validation returned invalid_id_number.
- Root cause: the basic format regex in identity.ts contained an accidental literal backtick before the digit class, so valid values failed before date/checksum validation.
- Replaced it with a string-only validator: trim, lowercase-x normalization, ASCII format, strict UTC date, and GB 11643 checksum. No region whitelist is applied.
- Added redacted validation-stage logs and generated-fixture unit coverage. No real provider request, Docker, browser, database, migration, or test command was run.

## 2026-07-17 - Correct auth-page return-button scope

- The prior change mistakenly removed the shared phone-auth return control, which also hid the filing-test page button, and removed the real-name page’s dedicated return-to-login action.
- Corrected the shared page to render its return button only for `/#/auth/filing-test`; `/#/auth` renders no button or placeholder. The filing-test button returns to `/#/auth` without changing its fixed-code or SMS isolation behavior.
- Restored the real-name page’s return button, `leaving` lock, and `logoutAndRedirect` call. It continues to invalidate the Session/Cookie, clear chat state, and replace-route to `/#/auth`.
- Restored `auth-return` styling and its mobile spacing only on pages that render the button. Phone/SMS login, filing-test login, real-name submission, age restrictions, chat guards/storage, Iflytek integration, and the “星跃多模态大模型” brand remain unchanged.
- Per user instruction, no verification command was run; manual local verification is required.
