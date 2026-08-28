# Live Classroom — Production Deployment Guide

This guide covers deploying the full live classroom stack (Next.js + LiveKit + Egress + S3) to production on a Linux VPS.

> **Before you start**: LiveKit requires a server with a **public static IP** and open UDP ports. Shared hosting and serverless platforms cannot run the LiveKit media server.

---

## Infrastructure requirements

| Component | Minimum spec | Notes |
|-----------|-------------|-------|
| VPS (LiveKit + Egress) | 2 vCPU, 4 GB RAM | Egress recording is CPU-heavy; scale up for many concurrent recordings |
| Next.js app | Any Node.js host | Vercel, Railway, a second VPS, or the same VPS |
| PostgreSQL | Managed (Supabase, Neon, RDS) or self-hosted | |
| Object storage | S3-compatible (AWS S3, Backblaze B2, Cloudflare R2) | MinIO works for self-hosted |
| Domain | 1 subdomain for LiveKit | e.g. `live.yourdomain.com` |

---

## 1. Domain and TLS

LiveKit must be reachable over **WSS** (secure WebSocket). Browsers will not connect to an unencrypted `ws://` endpoint in production.

### Option A — Caddy reverse proxy (recommended)

Install Caddy on your VPS. It handles TLS automatically via Let's Encrypt.

```caddy
# /etc/caddy/Caddyfile

live.yourdomain.com {
    reverse_proxy localhost:7880
    # WebSocket upgrade is handled automatically by Caddy
}
```

```bash
systemctl enable --now caddy
```

LiveKit's external URL becomes `wss://live.yourdomain.com`.

### Option B — nginx + certbot

```nginx
server {
    listen 443 ssl;
    server_name live.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/live.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/live.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
}
```

---

## 2. Firewall — required open ports

```
TCP  443    HTTPS / WSS (reverse proxy)
TCP  7881   LiveKit RTC over TCP (fallback, for restrictive networks)
UDP  7882   LiveKit RTC over UDP (primary media — MUST be open)
TCP  80     Let's Encrypt ACME challenge (Caddy/certbot)
```

On Ubuntu/Debian with `ufw`:

```bash
ufw allow 443/tcp
ufw allow 7881/tcp
ufw allow 7882/udp
ufw allow 80/tcp
ufw enable
```

---

## 3. TURN server (optional but recommended)

Without TURN, participants on corporate networks or strict firewalls may fail to connect. LiveKit includes a built-in TURN server.

Add to `livekit.yml`:

```yaml
turn:
  enabled: true
  domain: live.yourdomain.com
  tls_port: 5349       # TURN over TLS (requires TCP 5349 open)
  udp_port: 3478       # TURN over UDP (requires UDP 3478 open)
  external_tls: true   # Caddy/nginx terminates TLS; TURN itself uses plain port
```

Open the extra ports:

```bash
ufw allow 5349/tcp
ufw allow 3478/udp
```

---

## 4. LiveKit production config (`livekit.yml`)

```yaml
port: 7880

rtc:
  tcp_port: 7881
  port_range_start: 7882
  port_range_end: 7882
  use_external_ip: true   # LiveKit auto-detects the public IP of the VPS

keys:
  <YOUR_API_KEY>: <YOUR_API_SECRET>

logging:
  level: warn

webhook:
  api_key: <YOUR_API_KEY>
  urls:
    - https://yourdomain.com/api/livekit/webhook

turn:
  enabled: true
  domain: live.yourdomain.com
  tls_port: 5349
  udp_port: 3478
  external_tls: true
```

Generate a secure API key pair:

```bash
# Any 20+ char random string works
openssl rand -hex 16   # → api key
openssl rand -hex 32   # → api secret
```

---

## 5. Egress production config (`egress.yml`)

```yaml
log_level: warn

api_key: <SAME_API_KEY_AS_LIVEKIT>
api_secret: <SAME_API_SECRET_AS_LIVEKIT>

ws_url: ws://localhost:7880   # Egress on same machine → connects locally

redis:
  address: localhost:6379     # Redis on same machine

s3:
  access_key: <S3_ACCESS_KEY>
  secret: <S3_SECRET>
  region: <S3_REGION>
  bucket: recordings
  endpoint: <S3_ENDPOINT>     # Leave blank for AWS S3; set for R2/B2/MinIO
  force_path_style: true      # Required for non-AWS S3 providers
```

---

## 6. Docker Compose — production

Use a stripped-down compose for the VPS (no Postgres or MinIO containers if you use managed services):

```yaml
# compose.prod.yml
services:
  livekit:
    image: livekit/livekit-server:latest
    restart: always
    network_mode: host          # Exposes UDP 7882 on the host interface directly
    volumes:
      - ./livekit.yml:/etc/livekit/livekit.yml:ro
    command: --config /etc/livekit/livekit.yml

  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "127.0.0.1:6379:6379"  # Bind only to loopback

  livekit-egress:
    image: livekit/egress:latest
    restart: always
    cap_add:
      - SYS_ADMIN
    volumes:
      - ./egress.yml:/etc/egress/egress.yml:ro
    environment:
      EGRESS_CONFIG_FILE: /etc/egress/egress.yml
```

> **`network_mode: host`** is the most reliable option for UDP. With bridge networking, Docker's NAT can interfere with ICE candidate resolution on high-load hosts.

Start:

```bash
docker compose -f compose.prod.yml up -d
```

---

## 7. Next.js environment variables

Set these on your hosting platform (Vercel dashboard, Railway, etc.):

```env
# LiveKit — MUST use wss:// in production
LIVEKIT_URL="wss://live.yourdomain.com"
LIVEKIT_API_KEY="<YOUR_API_KEY>"
LIVEKIT_API_SECRET="<YOUR_API_SECRET>"

# S3 / object storage
S3_BUCKET="recordings"
S3_INTERNAL_ENDPOINT=""            # Leave blank — Next.js uses public endpoint
S3_PUBLIC_ENDPOINT="https://your-s3-endpoint"
S3_ACCESS_KEY="<ACCESS_KEY>"
S3_SECRET="<SECRET_KEY>"
S3_REGION="<REGION>"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
AUTH_URL="https://yourdomain.com"
AUTH_SECRET="<generate with: npx auth secret>"
DATABASE_URL="postgresql://..."

# Telegram (if used)
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_WEBHOOK_SECRET="..."

# Cron
CRON_SECRET="<random 32+ char string>"
```

> The app throws at startup if `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET` are missing. It also throws if `LIVEKIT_URL` uses `ws://` in production.

---

## 8. Webhook verification

The LiveKit webhook is verified using the `api_key` set in `livekit.yml`. The webhook handler at `src/app/api/livekit/webhook/route.ts` validates every incoming request with the LiveKit SDK. No extra configuration is needed — just ensure `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in the Next.js environment match the `keys:` block in `livekit.yml`.

---

## 9. S3 / object storage setup

### AWS S3

1. Create a bucket named `recordings` (or your preference — set `S3_BUCKET`)
2. Create an IAM user with `s3:PutObject`, `s3:GetObject` on that bucket
3. Generate access key + secret
4. Leave `S3_INTERNAL_ENDPOINT` blank (AWS SDK auto-resolves)
5. Set `S3_REGION` to your bucket's region (e.g. `eu-west-1`)

### Cloudflare R2

1. Create an R2 bucket named `recordings`
2. Create an API token with Object Read & Write
3. Set `S3_PUBLIC_ENDPOINT` to `https://<account_id>.r2.cloudflarestorage.com`
4. Set `S3_REGION` to `auto`
5. Set `force_path_style: true` in `egress.yml`

### Backblaze B2

1. Create a B2 bucket
2. Create an application key with read+write access
3. Set endpoint to `https://s3.<region>.backblazeb2.com`

---

## 10. Security checklist

Before going live:

- [ ] `LIVEKIT_URL` uses `wss://` — the app enforces this at startup
- [ ] API key in `livekit.yml` is not `devkey` / secret is not `secret` — the app throws in production if defaults are detected
- [ ] `AUTH_SECRET` is a strong random value (`npx auth secret`)
- [ ] `CRON_SECRET` is set and cron routes require the `Authorization: Bearer <secret>` header
- [ ] `TELEGRAM_WEBHOOK_SECRET` is set (if Telegram is used)
- [ ] UDP port 7882 is open on the VPS firewall
- [ ] TLS terminates at the reverse proxy — LiveKit traffic is encrypted end-to-end
- [ ] TURN is configured for participants on restrictive networks
- [ ] Redis is bound to loopback only (`127.0.0.1:6379`)
- [ ] MinIO (if self-hosted) is not publicly accessible — only Egress and Next.js can reach it
- [ ] S3 bucket policy does not allow public `s3:ListBucket` or `s3:GetObject` (recordings are private; URLs are pre-signed or proxied)
- [ ] Database is not publicly accessible (use a private network or VPC)
- [ ] Egress container has `SYS_ADMIN` cap only (not `--privileged`)
- [ ] DB indexes are applied: `Attendance(registrationId, sessionDate)`, `LiveSession(courseSessionId)`, `Notification(userId, createdAt)`

---

## 11. Verifying the production deployment

```bash
# 1. LiveKit responds
curl https://live.yourdomain.com
# → "OK"

# 2. Webhook is reachable (LiveKit sends a POST; this curl just checks the route exists)
curl -X POST https://yourdomain.com/api/livekit/webhook
# → 400 (expected — no body) confirms the route is live

# 3. Test a live session
# Log in as Trainer → open a Course Session → Live tab → Go Live
# Confirm status changes to LIVE in the database
# Confirm participant can join and audio/video works
# Confirm attendance row created after session ends
```

---

## 12. Scaling considerations

| Scenario | Action |
|----------|--------|
| > 100 concurrent participants | Add more LiveKit nodes behind a load balancer (LiveKit Cloud or LiveKit SFU cluster) |
| > 5 simultaneous recordings | Add a second Egress instance pointing at the same LiveKit + Redis |
| High Next.js traffic | Scale horizontally on Vercel / Railway — stateless by design |
| Recording storage growing | Set an S3 lifecycle rule to move old recordings to Glacier/cold tier after 90 days |
