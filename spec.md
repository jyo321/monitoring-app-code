# MonitoringHub - Technical Specification

## Overview

MonitoringHub is a lightweight infrastructure monitoring platform designed to collect disk utilization metrics from Linux servers and display them in a centralized dashboard.

The system consists of:

* Linux monitoring agents (shell scripts)
* ASP.NET Core backend API
* PostgreSQL database
* React frontend
* Email alerting service

The platform must support on-premises and cloud-hosted Linux servers.

---

# Goals

The platform should:

* Collect disk metrics from multiple Linux servers
* Store metrics historically
* Display current server health
* Trigger alerts when thresholds are exceeded
* Send email notifications
* Provide a centralized dashboard

---

# High Level Architecture

Linux Servers
|
| HTTPS POST
|
v
ASP.NET Core API
|
+------------------+
|                  |
v                  v
PostgreSQL     Alert Engine
|
v
React Dashboard

---

# Technology Stack

Backend:

* ASP.NET Core 8 Web API
* Entity Framework Core
* PostgreSQL
* Serilog Logging

Frontend:

* React
* TypeScript
* Material UI
* React Query

Database:

* PostgreSQL 16+

Deployment:

* Docker
* Docker Compose
* Nginx Reverse Proxy

---

# Agent Requirements

Monitoring agents are shell scripts executed via cron.

The agent should:

* Collect hostname
* Collect disk metrics
* Generate JSON payload
* Send payload to backend API
* Authenticate using API token
* Retry failed submissions
* Log failures locally

Cron frequency:

Every 5 minutes

---

# Disk Metric Collection

The following information must be collected:

Hostname

Mount Point

Filesystem

Filesystem Type

Total Size

Used Size

Available Size

Usage Percentage

Collection Timestamp

Example:

{
"hostname": "server01",
"ipAddress": "10.10.64.75",
"timestamp": "2026-06-20T10:00:00Z",
"disks": [
{
"mountPoint": "/",
"filesystem": "/dev/xvda1",
"fileSystemType": "ext4",
"totalSize": "50G",
"usedSize": "20G",
"availableSize": "30G",
"usagePercent": 40
}
]
}

---

# Backend Requirements

The backend must expose REST APIs.

Base URL:

/api

Required Endpoints:

POST /api/metrics/disk

GET /api/servers

GET /api/servers/{id}

GET /api/alerts

GET /api/dashboard

---

# Authentication

Each agent must authenticate using an API token.

Header:

Authorization: Bearer <token>

Requests with invalid tokens must return:

401 Unauthorized

---

# Database Design

## Servers

Fields:

* Id
* Hostname
* IpAddress
* Environment
* LastSeen
* CreatedAt

---

## DiskMetrics

Fields:

* Id
* ServerId
* MountPoint
* FileSystem
* FileSystemType
* TotalSize
* UsedSize
* AvailableSize
* UsagePercent
* CollectedAt

---

## Alerts

Fields:

* Id
* ServerId
* Severity
* AlertType
* Message
* CreatedAt
* IsResolved

---

## ApiTokens

Fields:

* Id
* Token
* Description
* CreatedAt
* IsActive

---

# Alerting Requirements

Disk Usage Thresholds:

Warning:

> = 80%

Critical:

> = 90%

Alert Types:

* Disk Warning
* Disk Critical

Duplicate alerts for the same mount point should not be generated within 24 hours.

---

# Email Notifications

Email notifications must be sent when:

* Warning alert is created
* Critical alert is created

Email must include:

* Hostname
* IP Address
* Mount Point
* Usage Percentage
* Timestamp

SMTP configuration must be stored in appsettings.json.

---

# Dashboard Requirements

## Dashboard Page

Display:

* Total Servers
* Healthy Servers
* Warning Servers
* Critical Servers
* Active Alerts

---

## Servers Page

Display:

* Hostname
* IP Address
* Last Seen
* Health Status

Features:

* Search
* Filtering
* Pagination

---

## Server Details Page

Display:

* Disk Usage Table
* Latest Metrics
* Historical Metrics
* Alert History

---

## Alerts Page

Display:

* Active Alerts
* Resolved Alerts
* Severity
* Server
* Created Time

---

# Health Status Rules

Healthy:
All filesystems below 80%

Warning:
Any filesystem between 80% and 89%

Critical:
Any filesystem >= 90%

---

# Historical Data

Metrics must be retained for:

365 Days

Support:

* Last 24 Hours
* Last 7 Days
* Last 30 Days
* Custom Range

---

# Logging

Use Serilog.

Log:

* API Requests
* Authentication Failures
* Alert Generation
* Email Delivery
* Exceptions

---

# Security Requirements

* HTTPS Only
* API Token Authentication
* Input Validation
* SQL Injection Protection
* CORS Configuration
* Rate Limiting

---

# Deployment

Docker Compose stack:

Services:

* frontend
* backend
* postgres
* nginx

Requirements:

* Persistent PostgreSQL storage
* Automatic startup
* Health checks
* Environment variables

---

# Future Enhancements

Phase 2:

* CPU Monitoring
* Memory Monitoring
* Service Monitoring
* SSL Expiry Monitoring
* Slack Notifications
* Teams Notifications

Phase 3:

* Multi-Tenant Support
* RBAC
* SSO Authentication
* Kubernetes Monitoring
* AWS Monitoring

---

# Success Criteria

The platform is considered complete when:

* Agents successfully send metrics
* Metrics are stored in PostgreSQL
* Dashboard displays server health
* Alerts are generated automatically
* Email notifications are delivered
* Historical trends are visible
* Deployment works through Docker Compose
