# Production Deployment

This fork is intended to run with Docker Compose and PostgreSQL.

## Public Site Address

The production public URL is `https://iflyfuture.com`. The application
metadata uses this canonical address; browser API calls remain relative to the
current origin.

This repository does not contain Nginx or other reverse-proxy configuration.
On the server, point DNS at `47.99.218.161`, configure `server_name
iflyfuture.com`, install the HTTPS certificate, and redirect HTTP to HTTPS.
Keep any upstream `proxy_pass` target pointed at the local/container app
service rather than this public domain.

## Required Environment

Copy `.env.template` to `.env` and set production values:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@postgres:5432/iflytek_chat?schema=public
POSTGRES_DB=iflytek_chat
POSTGRES_USER=iflytek_chat
POSTGRES_PASSWORD=change-me
ADMIN_TOKEN=change-me
SMS_CODE_SECRET=change-me
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
IFLYTEK_API_KEY=
IFLYTEK_API_SECRET=
DEFAULT_MODEL=4.0Ultra@Iflytek
VISION_MODELS=4.0Ultra
```

## Local Production-Style Run

```bash
docker compose --profile no-proxy up -d --build
```

Run database migrations from the host after PostgreSQL is healthy:

```bash
yarn prisma:migrate
```

On Windows PowerShell, if Yarn cannot resolve local binaries, use:

```powershell
$env:DATABASE_URL="postgresql://iflytek_chat:iflytek_chat_dev@localhost:5432/iflytek_chat?schema=public"
node_modules\.bin\prisma.cmd migrate deploy
```

## Server Update Flow

```bash
git pull
yarn install --frozen-lockfile
yarn prisma:migrate
docker compose --profile no-proxy up -d --build
```

## Admin Feedback

Open `/#/admin/feedback` and enter `ADMIN_TOKEN`.
