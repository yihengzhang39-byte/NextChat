# Worklog

Use this file to record meaningful project progress. Keep entries concise and
use concrete dates.

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
