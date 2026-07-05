# MonitoringHub

Disk utilization monitoring — ASP.NET Core 8 API · React + MUI dashboard · PostgreSQL · Shell agent.

---

## Run locally (step-by-step)

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| .NET SDK | 8+ | https://dotnet.microsoft.com/download |
| Node.js | 20+ | https://nodejs.org |
| Docker Desktop | any | https://www.docker.com/products/docker-desktop — only needed for PostgreSQL |

---

### Step 1 — Start PostgreSQL

```bash
docker run -d --name monitoringhub-pg \
  -e POSTGRES_DB=monitoringhub \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

> If you already have PostgreSQL installed locally, just create a database named `monitoringhub` with user `postgres` / password `postgres`.

---

### Step 2 — Start the backend API

```bash
cd backend/MonitoringHub.API
dotnet run
```

Expected output:
```
Now listening on: http://localhost:5000
```

The database tables are created automatically on first run (EF Core migration).

Verify it is up:
```
http://localhost:5000/swagger
```

---

### Step 3 — Configure email alerts (optional)

Edit `backend/MonitoringHub.API/appsettings.json`:

```json
"Smtp": {
  "Host": "smtp.gmail.com",
  "Port": 587,
  "Username": "your@gmail.com",
  "Password": "your-app-password",
  "FromAddress": "alerts@monitoringhub.local",
  "ToAddress":   "oncall@yourcompany.com",
  "EnableSsl": true
}
```

Leave `Host` blank to disable email — alerts will still appear in the dashboard and logs.

For Gmail: use an [App Password](https://myaccount.google.com/apppasswords), not your main password.

---

### Step 4 — Start the React frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Push endpoint (for agents)

```
POST http://localhost:5000/api/metrics/disk
Authorization: Bearer dev-token-12345
Content-Type: application/json
```

**Payload shape:**

```json
{
  "hostname":  "server01",
  "ipAddress": "10.10.64.75",
  "timestamp": "2026-06-21T10:00:00Z",
  "disks": [
    {
      "mountPoint":    "/",
      "filesystem":    "/dev/xvda1",
      "fileSystemType":"ext4",
      "totalSize":     "50G",
      "usedSize":      "20G",
      "availableSize": "30G",
      "usagePercent":  40
    }
  ]
}
```

Test with curl:

```bash
curl -X POST http://localhost:5000/api/metrics/disk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token-12345" \
  -d '{
    "hostname":  "server01",
    "ipAddress": "10.10.64.75",
    "timestamp": "2026-06-21T10:00:00Z",
    "disks": [{
      "mountPoint":    "/",
      "filesystem":    "/dev/xvda1",
      "fileSystemType":"ext4",
      "totalSize":     "50G",
      "usedSize":      "46G",
      "availableSize": "4G",
      "usagePercent":  92
    }]
  }'
```

This triggers a **Critical** alert (≥ 90 %) and sends an email if SMTP is configured.

---

## Other API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Summary stats + active alerts |
| `GET` | `/api/servers` | Paginated server list (`?search=&status=&page=&pageSize=`) |
| `GET` | `/api/servers/{id}` | Server detail with latest disks + alert history |
| `GET` | `/api/servers/{id}/history` | Disk history (`?mountPoint=/&range=24h\|7d\|30d`) |
| `GET` | `/api/alerts` | Paginated alerts (`?resolved=false&severity=Critical`) |
| `PATCH` | `/api/alerts/{id}/resolve` | Manually resolve an alert |

All endpoints are also browsable at **http://localhost:5000/swagger**.

---

## Deploy the agent on target Linux servers

### Files to put in your GitHub/GitLab repo

```
agent/
├── disk-monitor.sh   ← the collection + push script
└── app.config        ← endpoint config (one per environment, or one shared)
```

### Agent setup on each server

```bash
# 1. Clone your repo (or scp both files)
git clone https://github.com/your-org/your-monitoring-repo.git /opt/monitoring
# or
scp agent/disk-monitor.sh agent/app.config user@server:/opt/monitoring/

# 2. Set permissions
chmod +x /opt/monitoring/disk-monitor.sh
chmod 600 /opt/monitoring/app.config   # token should not be world-readable

# 3. Edit app.config on the server — set your API URL
vi /opt/monitoring/app.config
#   API_URL=http://YOUR_MONITORINGHUB_HOST:5000
#   API_TOKEN=dev-token-12345

# 4. Test manually
/opt/monitoring/disk-monitor.sh

# 5. Add cron job (runs every 5 minutes)
crontab -e
# Add this line:
# */5 * * * * /opt/monitoring/disk-monitor.sh
```

### app.config fields

```bash
API_URL=http://YOUR_SERVER_IP:5000   # required — backend base URL
API_TOKEN=dev-token-12345            # required — must be active in ApiTokens table
LOG_FILE=/var/log/disk-monitor.log   # optional — default: /var/log/disk-monitor.log
MAX_RETRIES=3                        # optional — default: 3
```

### What the agent collects

The script runs `df -hPT` which produces:

```
Filesystem     Type   Size  Used Avail Use% Mounted on
/dev/xvda1     ext4    50G   20G   30G  40% /
/dev/xvdb1     ext4   200G  180G   20G  90% /data
```

Fields mapped per row: `filesystem`, `fileSystemType`, `totalSize`, `usedSize`, `availableSize`, `usagePercent`, `mountPoint`.  
Pseudo-filesystems (`tmpfs`, `devtmpfs`, `squashfs`) are excluded automatically.

---

## Alert thresholds

| Severity | Trigger |
|----------|---------|
| Warning  | ≥ 80 %  |
| Critical | ≥ 90 %  |

- Duplicate alerts for the same mount point are suppressed for **24 hours**.
- Alerts **auto-resolve** when usage drops back below 80 %.
- Email is sent for every new Warning and Critical alert.

---

## All-in-one Docker Compose (alternative to manual steps)

```bash
cp .env.example .env    # fill in SMTP settings if needed
docker compose up --build

# Frontend:  http://localhost:3000
# Swagger:   http://localhost:5000/swagger
# Push URL:  http://localhost:5000/api/metrics/disk
```
# monitoring-app-code
