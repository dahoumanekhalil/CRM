# Live Classroom — Local Development Guide

Everything you need to run the full live classroom stack on your machine.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker Desktop | ≥ 4.x | Runs PostgreSQL, LiveKit, Egress, Redis, MinIO |
| Node.js | ≥ 20 | Next.js app |
| pnpm / npm | any | Package manager |

---

## 1. Environment variables

Copy the example file and fill in the LiveKit block:

```bash
cp .env.example .env
```

The LiveKit defaults already match the dev Docker compose — **do not change them for local dev**:

```env
LIVEKIT_URL="ws://localhost:7880"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
```

Optional S3/MinIO vars (the egress container sets defaults internally):

```env
S3_BUCKET="recordings"
S3_INTERNAL_ENDPOINT="http://minio:9000"   # used by Egress container → MinIO container
S3_PUBLIC_ENDPOINT="http://localhost:9000"  # used by Next.js to build public URLs
S3_ACCESS_KEY="minio"
S3_SECRET="minio123"
S3_REGION="us-east-1"
```

---

## 2. Start the Docker stack

```bash
docker compose up -d
```

This starts six services:

| Container | Port(s) | What it does |
|-----------|---------|--------------|
| `webscale_postgres` | 5433 | Primary database |
| `webscale_livekit` | 7880 (HTTP/WS), 7881 (TCP), 7882/udp | LiveKit media server |
| `webscale_redis` | 6379 | LiveKit egress coordination |
| `webscale_minio` | 9000 (S3 API), 9001 (console) | Object storage for recordings |
| `webscale_minio_init` | — | One-shot: creates the `recordings` bucket |
| `webscale_egress` | — | Server-side room recording |

Check everything is up:

```bash
docker compose ps
```

All services should show `running` or `healthy`. The `minio-init` container exits with code 0 after creating the bucket — that is expected.

### Verify LiveKit is responding

```bash
curl http://localhost:7880
# → "OK"
```

### MinIO console

Open `http://localhost:9001` — login: `minio` / `minio123`. You should see a `recordings` bucket.

---

## 3. Database

Apply migrations and seed:

```bash
npx prisma migrate deploy
npx prisma db seed
```

If the schema changed and you need to push without a migration:

```bash
npx prisma db push
```

---

## 4. Start the Next.js app

```bash
npm run dev
# or
pnpm dev
```

App runs at `http://localhost:3000`.

---

## 5. Node IP — critical for media on non-localhost devices

`compose.yml` passes `--node-ip 192.168.1.80` to the LiveKit server. This tells LiveKit which IP to advertise in ICE candidates so browsers can reach the media server.

- **Same machine**: `127.0.0.1` works (or whatever your loopback resolves to)
- **Another device on the same Wi-Fi**: use your LAN IP (e.g. `192.168.1.80`)
- **Different network**: you need TURN — see the production guide

To find your LAN IP:

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux
hostname -I
```

Edit `compose.yml` → `command: --config /etc/livekit/livekit.yml --node-ip <YOUR_IP> --dev` then restart:

```bash
docker compose restart livekit
```

---

## 6. Webhook — local dev

`livekit.yml` already points the webhook at `http://host.docker.internal:3000/api/livekit/webhook`.

`host.docker.internal` resolves from inside Docker Desktop to the Windows/Mac host. Your Next.js dev server at port 3000 receives the events. No extra configuration needed for local dev.

**Verify it is firing:** Start a live session, then check your Next.js terminal — you should see server-action logs from the webhook handler when a participant joins or leaves.

---

## 7. Test flows

### 7.1 — Basic live session (trainer only)

1. Log in as Admin or Manager
2. Navigate to a course → Sessions tab → open a session
3. Click the **Live** tab
4. Click **Set Up** → **Go Live**
5. A LiveKit room launches in the browser
6. Check the database: `LiveSession.status` should be `LIVE`

### 7.2 — Student joining

1. Open a second browser (or incognito) as a student account
2. Navigate to the same course session → **Live** tab
3. The student sees the waiting room UI
4. Back in the trainer window, admit the student from the **Participants** panel
5. The student enters the room; the participant count increments

### 7.3 — Attendance recording

1. Complete flow 7.2 — student joins and eventually leaves (or the session ends)
2. Check `Attendance` table: there should be a row with `status = PRESENT` or `ATTENDING`
3. Re-joins within the same session update `totalDurationSeconds` instead of creating a duplicate row (idempotency guard)

### 7.4 — Recording

1. Start a live session
2. Click **Start Recording** in the trainer controls
3. Check `webscale_egress` container logs: `docker compose logs -f livekit-egress`
4. Click **Stop Recording** — egress stops and uploads to MinIO
5. Open the MinIO console → `recordings` bucket — the `.mp4` file should appear
6. End the session; the webhook fires `egress_ended` → `LiveSession.status` transitions to `COMPLETED`
7. The recording URL is stored on `LiveSession.recordingUrl`

### 7.5 — Telegram notifications

Set `TELEGRAM_BOT_TOKEN` and enroll a student with a linked Telegram account. When you call **Go Live**, the cron-based `discoverLiveSessionReminders` fires notifications. Run it manually:

```bash
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/notifications
```

### 7.6 — Automated tests

```bash
npx vitest run src/test/livekit
```

Runs the state machine and token validation test suites (50 assertions, no Docker required).

---

## 8. Stopping the stack

```bash
docker compose down
```

To also remove data volumes (wipes DB and MinIO recordings):

```bash
docker compose down -v
```

---

## 9. Troubleshooting

### "Could not establish PC connection" / no video

The browser cannot reach the media server. Causes:

- **Wrong node-ip**: Update `--node-ip` in `compose.yml` to your actual LAN IP and restart LiveKit.
- **Firewall blocking UDP 7882**: Allow UDP 7882 inbound on your machine.
- **Using TCP fallback**: Port 7881 must also be open.

### Webhook not firing

- Confirm `host.docker.internal` resolves: `docker exec webscale_livekit ping host.docker.internal`
- Confirm Next.js is running on port 3000
- Check the LiveKit server logs: `docker compose logs livekit`

### Egress container crashes

Egress requires `SYS_ADMIN` capability (for the virtual display). On Linux hosts:

```bash
# If Docker Desktop is not installed, add to /etc/docker/daemon.json:
{ "default-shm-size": "128m" }
```

On WSL2 (Windows), Docker Desktop handles this automatically.

### MinIO bucket missing

The `minio-init` container runs once and exits. If MinIO restarted after init:

```bash
docker compose run --rm minio-init
```

### Database connection refused

PostgreSQL is on port **5433** (not the default 5432, to avoid conflicts). Confirm `DATABASE_URL` in `.env` uses port 5433.

### LiveKit API key error in Next.js

The app throws at startup if `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET` are missing. Confirm your `.env` has:

```env
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
```

These match the `keys:` block in `livekit.yml`.
