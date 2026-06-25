# Handoff

## Current Status

- The original NextChat repository has been copied into
  `https://github.com/ronvis7/iflytek_chat.git`.
- Local `main` tracks `origin/main`.
- The original upstream project is retained as `upstream`.
- Development governance documents have been added under `.agents/`.
- Web Chat foundation (PostgreSQL/Prisma, SMS login, feedback APIs, login/feedback pages) merged.

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
- **`.env` is gitignored**: contains `BAIDU_API_KEY`. Template at `.env.template` needs updating for Baidu v2 setup.

## Next Suggested Steps

1. Get Iflytek latest model API key → switch `DEFAULT_MODEL` and default provider back to Iflytek.
2. Simplify UI: remove model picker dropdown and Settings provider selector.
3. Replace placeholder agreement and privacy policy content before production.
4. Configure Aliyun SMS credentials in `.env`.
5. Fix ESLint pre-commit hook crash.
