# Technical Decisions

Record decisions that future developers should understand. Prefer short entries
that explain context, decision, and consequences.

## 2026-07-10: Persist Chat by Account Snapshot and Protected Local Files

### Context

The existing chat store persisted all browser chat sessions under one IndexedDB key, so phone-account changes in the same browser could show the previous account's data. Chat images were temporary service-worker files or inline Base64, neither of which supports durable account-scoped history.

### Decision

- Store one complete frontend session snapshot in `ChatSession.data`, keyed by the existing frontend session ID and current authenticated `userId`.
- Store image bytes only under `CHAT_UPLOAD_DIR/<userId>/<sessionId>/`; `ChatFile` stores metadata and a relative storage key. No Base64/blob is written to PostgreSQL.
- Reuse `getCurrentUserFromRequest` for every chat API; lookup paths always include `userId`. Protected image URLs require the same Cookie session and are never a public static directory.
- Stop rehydrating chat sessions from the old IndexedDB store. Keep Zustand as transient UI state and load it from `/api/chat/sessions` after login. Do not automatically migrate old local history.

### Consequences

- A different browser/device can load a user's database sessions after login, while another account cannot query or read those sessions/files by guessed IDs.
- Image requests still use the existing client-side Base64 preprocessing only at model-request time; the Iflytek imagev4 protocol remains unchanged.
- Deployments must apply migration `20260710120000_add_account_chat_persistence` and mount a durable writable upload directory before using chat-image persistence.

## 2026-07-09: Formal SMS Login Uses Real Aliyun Codes Only

### Context

The product needs formal phone-code login through Aliyun SMS, while the fixed `123456` path is only for filing test verification.

### Decision

- Remove `SMS_MOCK_CODE` from formal SMS login and keep fixed-code behavior only in `/api/auth/filing-test-login`.
- Continue using the existing hand-signed Aliyun Dysmsapi `SendSms` request instead of adding an SDK dependency.
- Store only hashed SMS codes and add `SmsCode.failedAttempts` to invalidate a code after five wrong login attempts.
- Keep formal send limits in the existing `SmsCode` table: 60-second resend throttle and 10 sends per phone per day.

### Consequences

- Production SMS requires valid Aliyun env vars; missing or provider-failed sends return the generic user message `验证码发送失败，请稍后重试`.
- Aliyun logs must remain limited to masked phone numbers and provider/status summaries; no AccessKey, signed URL, full phone, or plaintext verification code should be logged.
- Deployments must run the new Prisma migration before using the updated formal SMS login route.

## 2026-07-09: Keep Filing Test Login Isolated From Formal SMS Login

### Context

Aliyun SMS credentials are not ready, but ICP filing verification needs a temporary phone-login path with a fixed code.

### Decision

- Add the filing test flow as a separate UI route and backend route: `/#/auth/filing-test` and `/api/auth/filing-test-login`.
- Require `FILING_TEST_LOGIN_ENABLED=true` before the filing test route can authenticate anyone.
- Check `FILING_TEST_LOGIN_CODE` only inside the filing test route; the formal SMS login route continues to require a stored, unexpired SMS code.
- Reuse the existing phone user, session, cookie, IP, and user-agent write path instead of adding a parallel login-state mechanism.

### Consequences

- Filing test login can be disabled by environment without touching formal SMS login.
- Aliyun SMS integration remains unchanged and can be completed later without removing the filing test route first.
- Any future cleanup should remove the dedicated filing test route and env vars when ICP testing is no longer needed.

## 2026-07-06: Preserve imagev4 Upstream Business Error Details

### Context

Iflytek imagev4 can return non-zero business/audit errors in WebSocket frames with useful `header.code`, `header.message`, and `header.sid` fields. Collapsing these to a generic local code-only error hides the real audit reason from the browser and Excel batch evaluators.

### Decision

- For imagev4 WebSocket frames where `header.code != 0`, preserve upstream `header.code`, full string `header.message`, and non-empty string `header.sid` in the caller-facing error text.
- Use the stable format `服务端业务错误：code=<code>, message=<message>, sid=<sid>` when all fields are present.
- Omit missing/empty/non-string `message` or `sid` rather than outputting `undefined`, `null`, or an empty sid. Only when upstream message is unavailable may the older generic imagev4 error text be appended as fallback context.
- Do not log the full upstream audit message by default; logs remain limited to request IDs, statuses, counts, timings, and boolean presence flags.

### Consequences

- Browser users and Excel batch rows can see actionable audit/business failure text from Iflytek, including `AuditImageBlockError` guidance and `sid` for support correlation.
- The imagev4 integration remains centralized in `app/api/iflytek.ts`; batch scripts do not copy WebSocket signing or image payload logic.
- Security rules remain unchanged: credentials, HMAC signatures, Authorization query data, signed URLs, image base64, full prompts, and full normal answers must not be logged or documented.

## 2026-07-03: Image+Text Excel Batch Reuses Local Iflytek Backend Route

### Context

The image+text Excel batch evaluator must exercise the verified imagev4 path
without copying the upstream WebSocket signing, image payload conversion, or SSE
parsing logic into a second implementation.

### Decision

- Implement image+text batch evaluation as a separate Python script under
  `scripts/`.
- Have the script call `/api/iflytek/v1/chat/completions` with
  `model=image@Iflytek` and one OpenAI-style multimodal user message per Excel
  row.
- Encode the local image file as a data URL in the script, then let the existing
  server route strip the data URL prefix and send pure base64 image content to
  imagev4 with `content_meta.url=false`.
- Keep each row stateless: only the current D-column image and E-column prompt
  are sent; F-column reference answers, prior rows, chat sessions, memory, and
  browser UI state are excluded.

### Consequences

- The batch script requires a locally running NextChat backend for real model
  calls.
- Iflytek credentials, HMAC signing, upstream WebSocket handling, final-frame
  detection, and text extraction remain centralized in `app/api/iflytek.ts`.
- The script can validate Excel path mapping and row writes with `--dry-run`
  without sending real model traffic.

## 2026-07-03: Excel Batch QA Reuses Local Iflytek Backend Route

### Context

The Excel batch evaluator must exercise the currently verified Iflytek path
without duplicating or guessing the upstream WebSocket API format.

### Decision

- Implement the batch evaluator as a standalone Python script under `scripts/`.
- Have the script call the local NextChat backend route
  `/api/iflytek/v1/chat/completions` with `model=image@Iflytek`.
- Keep each Excel row as a stateless single-turn request with only the current
  row's question in `messages`.
- Let the existing server route continue to own Iflytek credentials, HMAC
  signing, `imagev4` payload shape, upstream WebSocket handling, SSE conversion,
  and text extraction.
- Do not route the batch flow through browser UI automation or the frontend chat
  store.

### Consequences

- The batch script avoids a second, potentially divergent Iflytek integration.
- The script requires a locally running NextChat backend for real model calls.
- Excel concurrency is controlled in the script, while upstream request details
  remain centralized in `app/api/iflytek.ts`.
- Row isolation is explicit: no chat-session history, memory prompt,
  summarization state, or previous Excel row can enter the request payload.

## 2026-07-01: Iflytek Image Understanding via Server WebSocket Proxy

### Context

The Iflytek image-understanding API is a signed WebSocket service, not a normal
HTTP JSON POST endpoint. The browser must not receive API Secret, signatures,
Authorization query parameters, or the signed upstream URL.

### Decision

- Route `image@Iflytek` through a Node runtime server API route.
- Decide whether to use imagev4 WebSocket by the selected model (`image@Iflytek`), not by whether the current message contains an image.
- Generate the HMAC-SHA256 WebSocket signature only on the server.
- Convert existing OpenAI-style multimodal frontend messages into Iflytek's
  image payload shape on the server.
- Convert upstream WebSocket frames back into OpenAI-compatible SSE chunks so
  the existing chat UI can keep using its current streaming path.
- Keep the image request compatible with the verified API shape: `domain=imagev4`,
  `parameter.chat.stream=true`, image entries before the user question, and
  `content_meta.url=false` for base64 image content.
- Use a dedicated frontend timeout for `image@Iflytek` instead of changing the
  global text-chat timeout.
- Keep Baidu and existing non-image Iflytek HTTP proxy behavior available.
- Prefer `XF_APPID`, `XF_API_KEY`, `XF_API_SECRET`, `IFLYTEK_IMAGE_WS_HOST`, `IFLYTEK_IMAGE_WS_PATH`, and `IFLYTEK_IMAGE_MODEL=imagev4` for the imagev4 route; legacy Iflytek credential names remain compatibility fallbacks.

### Consequences

- Iflytek image credentials remain server-side and are passed through local
  environment variables and Docker Compose only.
- Browser requests continue to target the app's own `/api/iflytek/...` route.
- The image path requires Node runtime support and should not be bundled into
  the generic Edge catch-all provider route.
- End-to-end validation requires a normal-size test image and real local
  credentials in gitignored `.env`.
- Iflytek image logs must remain diagnostic only: request IDs, counts, timings,
  statuses, and lengths are allowed; credentials, signatures, signed URLs,
  image base64, and full prompt/answer text are not.

## 2026-06-26: Use Colleague Repository as `origin`

### Context

The collaborator moved the project into
`https://github.com/yihengzhang39-byte/NextChat.git`, and this repository is now
the chosen shared development remote.

### Decision

- Use `origin` for the colleague repository:
  `https://github.com/yihengzhang39-byte/NextChat.git`.
- Keep the previous owner repository as `old-origin` for reference:
  `https://github.com/ronvis7/iflytek_chat.git`.
- Start new product work from `origin/main` unless intentionally continuing a
  feature branch such as `origin/model`.

### Consequences

- New feature branches should be based on `origin/main`.
- Pull requests and pushes for shared product development should target the
  colleague repository unless the team changes the collaboration model again.

## 2026-06-26: Baidu v2 API Integration — Bearer Token Auth

### Context

Baidu's ERNIE 5.0 model uses the new v2 API (`/v2/chat/completions`) which is
OpenAI-compatible. Authentication changed from the legacy OAuth2 flow
(API Key + Secret Key → access_token) to a single Bearer Token
(`bce-v3/ALTAK-...` format). The old v1 API and the new v2 API coexist.

### Decision

- Update the Baidu provider to detect key format by prefix (`bce-v3/`).
- v2 keys: use `Authorization: Bearer <key>` header + `qianfan.baidubce.com/v2`
  endpoint.
- v1 keys: keep existing OAuth2 flow + `aip.baidubce.com/rpc/...` endpoint.
- Parse both response formats: v1 `result` field and v2 `choices[0].delta.content`.
- `isValidBaidu()`: v2 only requires `baiduApiKey`; v1 still needs both keys.
- Default provider changed to `ServiceProvider.Baidu`, auth disabled
  (`CODE=` empty) for zero-config chat.

### Consequences

- ERNIE 5.0 works immediately with a single API key from the Baidu console.
- Backward compatible — old Baidu models (ernie-4.0, etc.) still work with
  legacy keys.
- When switching to Iflytek as default provider, only env vars and store
  defaults need changing; the Baidu code can stay as-is.
- `.env` contains `BAIDU_API_KEY` and is gitignored — new devs must create
  their own.

## 2026-06-25: Keep Original Project as `upstream`

### Context

The project was cloned from `ChatGPTNextWeb/NextChat` and copied into the
owner's repository for secondary development.

### Decision

Use:

- `origin`: `https://github.com/ronvis7/iflytek_chat.git`
- `upstream`: `https://github.com/ChatGPTNextWeb/NextChat.git`

### Consequences

- Normal development pushes to `origin`.
- Future upstream updates can still be fetched and merged from `upstream`.
- Developers should avoid editing remote configuration unless the repository
  ownership or sync strategy changes.

## 2026-06-25: Product Positioning — Single-Model Interface

### Context

This fork is dedicated to 讯飞星火 (Iflytek Spark). The upstream NextChat
supports 16 model providers with full switching UI, but our product should
behave like the DeepSeek web client: one model, no provider choice.

### Decision

- Long-term: simplify the chat UI to remove the model/provider dropdown.
- Short-term (testing phase): use Baidu ERNIE 5.0 (ernie5.0) as a temporary
  model until Iflytek's latest API key is available.
- Configure model credentials server-side via `.env` so the frontend works
  with zero manual setup.

### Consequences

- The Settings page provider selector and the chat model dropdown will be
  removed or hidden in a future change.
- Temporarily, Baidu will be the default provider for integration testing.
- **2026-06-26 update**: Baidu v2 integration complete and verified.
- When Iflytek credentials arrive, swap `DEFAULT_MODEL` and provider back.

## 2026-07-06: Image-Only Excel Batch Maps Old Paths by File Stem

### Context

Some image-only Excel workbooks contain stale absolute C-column paths whose directory and extension do not match the local files used for testing.

### Decision

- Add a separate `scripts/batch_eval_iflytek_image_only.py` script instead of changing the existing image+text batch flow.
- Resolve each C-column path by preferring the configured `--image-root` and trying the original file name plus same-stem `.jpg`, `.jpeg`, `.png`, and `.webp` candidates.
- Continue calling the existing local Iflytek backend route with `model=image@Iflytek`, so credentials, WebSocket signing, image payload conversion, and SSE parsing remain centralized in the app.
- Do not read a prompt column; send a configurable fixed instruction with each image by default.

### Consequences

- Old rows such as `A1a01.png` can resolve to actual local files such as `A1a01.jpg` when both share the same stem.
- Real model calls still require a running local NextChat backend with valid Iflytek environment variables.
- The image-only flow remains isolated from the existing pure-text and image+text batch scripts.
