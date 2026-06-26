# Technical Decisions

Record decisions that future developers should understand. Prefer short entries
that explain context, decision, and consequences.

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
