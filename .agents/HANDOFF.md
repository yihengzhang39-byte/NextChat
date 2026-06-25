# Handoff

## Current Status

- The original NextChat repository has been copied into
  `https://github.com/ronvis7/iflytek_chat.git`.
- Local `main` tracks `origin/main`.
- The original upstream project is retained as `upstream`.
- Development governance documents have been added under `.agents/`.
- Web Chat foundation (PostgreSQL/Prisma, SMS login, feedback APIs, login/feedback pages) merged.

**2026-06-25 update:**

- Product direction decided: single-model interface for 讯飞星火, like DeepSeek's web client.
- Temporary model for testing: Baidu ERNIE 5.0 (`ernie5.0`), API Key obtained, awaiting Secret Key.
- Pending changes: add ernie5.0 to model list, set Baidu as default provider via `.env`, then verify chat works.
- After Iflytek API key arrives: switch default provider back to Iflytek, simplify UI (remove model picker).

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
  `C:\Users\Administrator/.config/git/ignore`. This did not block the initial
  repository migration.
- This repository uses `yarn@1.22.19`.
- `docker-compose.override.yml` makes Docker build the local source code as
  `iflytek-chat:local` instead of using the upstream public image.
- Current local Docker environment has been verified at
  `http://localhost:3000`.

## Next Suggested Steps

1. Get Baidu Secret Key → write to `.env` → add `ernie5.0` model → `yarn dev` verify chat.
2. Get Iflytek latest model API key → switch `DEFAULT_MODEL` and provider back to Iflytek.
3. Simplify UI: remove model picker dropdown and Settings provider selector.
4. Replace placeholder agreement and privacy policy content before production.
5. Configure Aliyun SMS credentials in `.env`.
