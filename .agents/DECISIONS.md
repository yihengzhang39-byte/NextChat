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
