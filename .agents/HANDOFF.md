# Handoff

## Current Status

- The original NextChat repository has been copied into
  `https://github.com/ronvis7/iflytek_chat.git`.
- Local `main` tracks `origin/main`.
- The original upstream project is retained as `upstream`.
- Development governance documents have been added under `.agents/`.

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

- Decide the first secondary development goal.
- Create a feature branch before implementation.
- Add any project-specific product requirements to this handoff file or a new
  file under `.agents/`.
