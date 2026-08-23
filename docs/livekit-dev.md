# LiveKit Development Guide

> Phase 1 POC — self-hosted LiveKit running via Docker Compose alongside Postgres.

---

## Prerequisites

- **Docker Desktop** running (LiveKit server runs as a container — no binary install needed)
- **Node.js 24+** (or whatever `node -v` reports in this repo)
- **`.env`** file with the LiveKit block below

---

## Environment Variables

Add to `.env` (already present if you pulled from the repo):

```env
# LiveKit — self-hosted video conferencing
# Dev defaults match the livekit service in compose.yml.
# NEVER expose LIVEKIT_API_SECRET client-side.
LIVEKIT_URL="ws://localhost:7880"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret"
```

These are the dev-mode defaults baked into `livekit/livekit-server:latest --dev`.
For production you will generate real keys — see the LiveKit docs.

---

## Starting the Stack

```bash
# Start Postgres + LiveKit together
docker compose up -d

# Or start only LiveKit (if Postgres is already running)
docker compose up -d livekit

# Start Next.js dev server
npm run dev
```

Verify LiveKit is healthy:

```bash
docker compose logs livekit --tail=10
# Expected output:
#   starting in development mode
#   no keys provided, using placeholder keys {"API Key": "devkey", "API Secret": "secret"}
#   starting LiveKit server {"portHttp": 7880, "rtc.portTCP": 7881, "rtc.portUDP": 7882}

curl http://localhost:7880
# Expected: OK
```

---

## Testing Multi-User Video

1. Open **Chrome** → `http://localhost:3000/live-test`
2. Log in as any user → enter room name `webscale-demo` → **Join Room**
3. Open **Chrome Incognito** → same URL → log in as a different user → join the same room
4. Both participants should see and hear each other

> The participant count in the top-right header updates in real time as users join and leave.

---

## Stopping

```bash
docker compose down          # stop everything (Postgres + LiveKit)
docker compose stop livekit  # stop only LiveKit, keep Postgres running
```

---

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| `7880` | HTTP/WebSocket | LiveKit server (token validation, signalling) |
| `7881` | TCP | WebRTC media (fallback when UDP is blocked) |
| `7882` | UDP | WebRTC media (primary) |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "Unable to reach the meeting server" toast | LiveKit container not running | `docker compose up -d livekit` |
| Black video tile | Camera permission denied | Allow camera in browser settings |
| No audio from remote participant | Microphone permission denied | Allow mic in browser settings |
| "Session expired or access denied" | Token mismatch or server restart in non-dev mode | Rejoin room; confirm `LIVEKIT_API_KEY=devkey` in `.env` |
| Stuck on "Reconnecting…" banner | LiveKit stopped | `docker compose start livekit`; clients reconnect automatically |
| Token error in server logs | `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` missing | Check `.env` and restart `npm run dev` |

---

## Architecture

```
Browser (User A)          Browser (User B)
     │                         │
     │  POST /live-test        │
     │  (getTokenAction)       │
     ▼                         ▼
Next.js Server                 │
  auth() → JWT token ──────────┤
     │                         │
     └──────── ws://localhost:7880 ──────────┐
                    LiveKit Server           │
               (livekit-client SDK)          │
                    WebRTC P2P ─────────────┘
```

- **Token generation** is server-only (`src/lib/livekit/token.ts` has `import "server-only"`)
- **API secret** never leaves the server — only the JWT token is sent to the browser
- **Identity** is always `session.user.id` — the browser cannot override it

---

## Phase 2 Notes (do not implement yet)

When Phase 2 begins, token generation will become role-aware:

```ts
// Phase 1 — current
generateToken(userId, userName, roomName)

// Phase 2 — planned
generateToken(userId, userName, roomName, {
  role: 'trainer' | 'student',
  canPublish: isTrainer,
  canSubscribe: true,
})
```

The `token.ts` utility accepts this extension without breaking the Phase 1 call signature.
