# Aura Beauty Studio - Production Runbook & Operations Manual

This runbook provides actionable procedures for sysadmins, DevOps, and studio engineers operating the Aura Beauty Studio booking and POS platform in production.

---

## 1. System Architecture & Component Map

| Component | Technology | Default Port | Internal URL / Role |
| :--- | :--- | :--- | :--- |
| **Frontend & API Server** | Next.js 16 (Node.js 20 standalone) | `3000` | Public App Router & Admin Dashboard |
| **Relational Database** | PostgreSQL 16 (Alpine) | `5432` | Core transactional data store |
| **Exclusion Constraints** | PostgreSQL `btree_gist` | N/A | Guarantees atomic non-overlapping slot holds |
| **Background Job Queue** | `pg-boss` on PostgreSQL | Internal | Asynchronous SMS notifications & reminders |
| **Payment Gateway** | Paystack Ghana REST API | HTTPS 443 | Cards & Mobile Money (MTN, Telecel, AT) |
| **SMS Gateway** | Arkesel / mNotify REST API | HTTPS 443 | OTP delivery & appointment reminders |
| **Error Monitoring** | Sentry SDK | HTTPS 443 | Real-time exception capture & alerting |

---

## 2. Health Monitoring & Diagnostics

### 2.1 Live Healthcheck Endpoint
The application exposes a structured JSON health check at `/api/health`:
```bash
curl -s http://localhost:3000/api/health | jq .
```

Expected Response (`200 OK`):
```json
{
  "status": "healthy",
  "timestamp": "2026-10-27T14:00:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "latencyMs": 3
    },
    "jobQueue": {
      "status": "healthy",
      "stats": {
        "pending": 0,
        "processing": 0,
        "failed": 0,
        "completed": 142
      }
    },
    "system": {
      "uptimeSeconds": 86400,
      "memoryUsageMb": {
        "rss": 142,
        "heapUsed": 84
      }
    }
  }
}
```

---

## 3. Database Backup & Disaster Recovery

### 3.1 Automated Scheduled Backups
Backups are executed via `scripts/backup-db.sh`. It performs:
1. `pg_dump` with custom gzip compression (`.sql.gz`).
2. SHA-256 integrity checksum verification (`.sha256`).
3. Automated pruning of backups older than 14 days.

**Cron Configuration** (Every night at 02:00 AM Africa/Accra):
```cron
0 2 * * * /Users/khatayon/Booking-System/scripts/backup-db.sh >> /var/log/aura_backup.log 2>&1
```

**Manual Backup Execution**:
```bash
./scripts/backup-db.sh
```
Backups are stored in `./backups/aura_backup_YYYYMMDD_HHMMSS.sql.gz`.

### 3.2 Tested Restore Procedure
To restore the database from a verified backup archive:
```bash
# 1. Stop web traffic or set maintenance mode
docker compose stop app

# 2. Execute restore script with target backup path
./scripts/restore-db.sh ./backups/aura_backup_20261027_133000.sql.gz

# 3. Restart application
docker compose start app
```
The restore script automatically checks the SHA-256 hash before applying the SQL stream.

---

## 4. Key & Secret Rotation Procedures

### 4.1 Paystack API Key Migration (Test -> Live)
1. Log in to the [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer).
2. Toggle from **Test Mode** to **Live Mode**.
3. Copy `Live Public Key` (`pk_live_...`) and `Live Secret Key` (`sk_live_...`).
4. Update the `.env` file on the production server:
   ```bash
   PAYSTACK_PUBLIC_KEY="pk_live_YOUR_PAYSTACK_PUBLIC_KEY"
   PAYSTACK_SECRET_KEY="sk_live_YOUR_PAYSTACK_SECRET_KEY"
   ```
5. Set Webhook URL to: `https://aurastudio.gh/api/webhooks/paystack`.
6. Restart the Next.js process: `docker compose restart app`.

### 4.2 Application Secret (`AUTH_SECRET`) Rotation
When rotating `AUTH_SECRET`:
1. Generate new 32-byte secret: `openssl rand -base64 32`.
2. Update `AUTH_SECRET` in `.env`.
3. Note: Active user sessions will be invalidated and staff will need to re-authenticate at `/login`.

---

## 5. Incident Response & Graceful Degradation

### 5.1 Paystack API Outage / Network Timeout
- **Symptoms**: Customer booking fails at checkout with `PAYMENT_GATEWAY_ERROR` or POS card processing hangs.
- **Graceful Fallback**:
  - In POS: Receptionists can select **Cash Payment** or **Manual Mobile Money** to record sales offline.
  - In Booking Engine: Slot holds remain reserved for 10 minutes; customers are presented with an explanatory prompt: *"Payment gateway is temporarily delayed. Your slot is held. Please try again or call the studio at +233 24 111 2233."*
  - Re-query failed transactions using the Paystack Transaction Verification API once connectivity restores.

### 5.2 SMS Gateway Downtime (Arkesel Outage / Telecom Congestion)
- **Symptoms**: SMS reminders not delivered; customer lookup OTP delays.
- **Graceful Fallback**:
  - Failed SMS notifications are automatically logged to the `NotificationLog` table with status `FAILED` and error metadata.
  - Receptionists can view pending bookings on the `/bookings` dashboard and trigger manual WhatsApp confirmation links directly to the client's phone.
  - Lookup by Booking Reference (`AUR-XXXXXX`) does **not** mandate SMS OTP if emergency bypass is toggled in Settings.

---

## 6. Staging vs Production Checklist

Before pointing production DNS (`aurastudio.gh`):

- [ ] `NODE_ENV` is set to `"production"`.
- [ ] `APP_URL` uses HTTPS (`https://aurastudio.gh`).
- [ ] Database URL uses strong, non-default credentials and SSL connection.
- [ ] `scripts/seed-first-owner.ts` has been run and default owner password changed.
- [ ] Paystack test keys replaced with `pk_live_...` and `sk_live_...`.
- [ ] Paystack live webhook URL configured and verified with test live transaction.
- [ ] Nightly backup cron configured and tested with `restore-db.sh`.
- [ ] Sentry DSN active and receiving unhandled runtime errors.
- [ ] Arkesel SMS sender ID `"AuraStudio"` approved by Ghana NCA/telecoms.
