#!/bin/bash
# PalTech MonitoringHub — Disk Usage Agent
# Place both disk-monitor.sh and app.config in the same directory (e.g. /opt/monitoring/)
#
# Setup on each server:
#   chmod +x /opt/monitoring/disk-monitor.sh
#   crontab -e
#   */5 * * * * /opt/monitoring/disk-monitor.sh
#
# Manual test:
#   /opt/monitoring/disk-monitor.sh

# ── Load config ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${MONITORING_CONFIG:-${SCRIPT_DIR}/app.config}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "ERROR: app.config not found at ${CONFIG_FILE}" >&2
    exit 1
fi

source "$CONFIG_FILE"

if [ -z "$API_URL" ] || [ -z "$API_TOKEN" ]; then
    echo "ERROR: API_URL and API_TOKEN must be set in app.config" >&2
    exit 1
fi

LOG_FILE="${LOG_FILE:-/var/log/disk-monitor.log}"
MAX_RETRIES="${MAX_RETRIES:-3}"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "$LOG_FILE"; }

# ── Collect host info ─────────────────────────────────────────────────────────
HOSTNAME_VAL=$(hostname -f 2>/dev/null || hostname)
IP_ADDRESS=$(hostname -I 2>/dev/null | awk '{print $1}')
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# ── Collect disk metrics ──────────────────────────────────────────────────────
# df -hPT columns: Filesystem | Type | Size | Used | Avail | Use% | Mounted on
# Skips tmpfs, devtmpfs, squashfs (snap/virtual mounts)

DISKS_JSON="["
FIRST=1

while IFS= read -r line; do
    [[ "$line" =~ ^Filesystem ]] && continue

    FILESYSTEM=$(awk '{print $1}' <<< "$line")
    FSTYPE=$(    awk '{print $2}' <<< "$line")
    TOTAL_H=$(   awk '{print $3}' <<< "$line")
    USED_H=$(    awk '{print $4}' <<< "$line")
    AVAIL_H=$(   awk '{print $5}' <<< "$line")
    USE_PCT=$(   awk '{print $6}' <<< "$line" | tr -d '%')
    MOUNT=$(     awk '{print $7}' <<< "$line")

    [ -z "$MOUNT" ] && continue

    [[ $FIRST -eq 0 ]] && DISKS_JSON+=","
    FIRST=0

    DISKS_JSON+=$(printf \
        '{"mountPoint":"%s","filesystem":"%s","fileSystemType":"%s","totalSize":"%s","usedSize":"%s","availableSize":"%s","usagePercent":%s}' \
        "$MOUNT" "$FILESYSTEM" "$FSTYPE" "$TOTAL_H" "$USED_H" "$AVAIL_H" "$USE_PCT")

done < <(df -hPT -x tmpfs -x devtmpfs -x squashfs 2>/dev/null)

DISKS_JSON+="]"

PAYLOAD=$(printf \
    '{"hostname":"%s","ipAddress":"%s","timestamp":"%s","disks":%s}' \
    "$HOSTNAME_VAL" "$IP_ADDRESS" "$TIMESTAMP" "$DISKS_JSON")

log "Sending metrics for ${HOSTNAME_VAL} (${IP_ADDRESS})"

# ── Submit with retry ─────────────────────────────────────────────────────────
for attempt in $(seq 1 "$MAX_RETRIES"); do
    RESP_FILE=$(mktemp)

    HTTP_STATUS=$(curl -s \
        -o "$RESP_FILE" \
        -w "%{http_code}" \
        -X POST "${API_URL}/api/metrics/disk" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${API_TOKEN}" \
        --connect-timeout 10 \
        --max-time 30 \
        -d "$PAYLOAD")

    if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
        log "SUCCESS attempt=${attempt} status=${HTTP_STATUS} response=$(cat "$RESP_FILE")"
        rm -f "$RESP_FILE"
        exit 0
    fi

    log "FAILED attempt=${attempt} status=${HTTP_STATUS} body=$(cat "$RESP_FILE")"
    rm -f "$RESP_FILE"

    [ "$attempt" -lt "$MAX_RETRIES" ] && sleep $((attempt * 5))
done

log "GAVE UP after ${MAX_RETRIES} attempts — check API_URL is reachable and API_TOKEN is correct"
exit 1
