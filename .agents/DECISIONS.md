# Technical Decisions

Record decisions that future developers should understand. Prefer short entries
that explain context, decision, and consequences.

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
- When Iflytek credentials arrive, swap `DEFAULT_MODEL` and provider back.
