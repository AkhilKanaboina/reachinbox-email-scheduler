# Email Job Scheduler Service & Dashboard

A production-grade, full-stack email campaign scheduler built with **Node.js + Express**, **BullMQ + Redis**, **MySQL (Prisma ORM)**, **Nodemailer / Ethereal Email**, and a **Vite + React SPA** dashboard with **Google OAuth**.

---

## 📌 Project Overview

This project is a high-throughput, crash-resilient **Email Job Scheduler Service and Dashboard**. It enables users to upload lead lists via CSV files, draft personalized email templates with dynamic tags (like `{{name}}`), and schedule campaigns to be sent at specific future times.

Behind the scenes, the system handles heavy background workloads:
* **No Cron Jobs**: Scheduling is powered purely by **BullMQ delayed jobs** backed by Redis.
* **Rate Limiting**: Enforces strict hourly send limits per sender using atomic **Redis Lua scripts**, automatically deferring overflow emails to subsequent hour windows without dropping leads.
* **Crash Resilience**: Ensures that if the server or worker crashes mid-execution, zero emails are lost or re-sent upon restart.
* **Provider Throttling**: Controls the delay between individual email dispatches to prevent rate-limit bans from SMTP providers.

---

## 🏗 System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  Vite + React Single-Page Application (Port 3000)                      │
│  - Google Identity OAuth 2.0 Sign-In                                   │
│  - Sidebar Navigation & Custom Inbox Message List                      │
│  - Client-side PapaParse CSV Lead Parser                               │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Bearer JWT (HS256)
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Express.js Backend API (Port 4000)                                    │
│  - POST /api/auth/google      → Verifies Google token & issues JWT     │
│  - POST /api/campaigns/schedule → Enqueues BullMQ delayed jobs          │
│  - GET  /api/emails           → Paginated queries with status filter   │
└────────┬─────────────────────────┬─────────────────────────────────────┘
         │                         │
   ┌─────▼────────┐         ┌──────▼────────┐
   │  MySQL 8     │         │  Redis 7.2    │
   │  (Prisma)    │         │  (Docker)     │
   │  User        │         │  BullMQ       │
   │  Campaign    │         │  Rate Limit   │
   │  EmailJob    │         │  Counters     │
   └──────────────┘         └──────┬────────┘
                                   │
                            ┌──────▼────────┐
                            │ BullMQ Worker │
                            │ (Concurrency:5)
                            └──────┬────────┘
                                   │
                            ┌──────▼────────┐
                            │ Ethereal SMTP │
                            │ (Preview URL) │
                            └───────────────┘
```

---

## ✨ Features & Capabilities

### Backend Capabilities
* **Delayed Job Scheduling**: Calculates exact millisecond delays for each recipient in a campaign and schedules them using BullMQ pipelines.
* **Atomic Redis Rate Limiting**: Protects sender reputations by capping emails sent per sender within any 60-minute window.
* **Multi-Worker Concurrency**: Concurrently processes jobs (default: 5 workers) safely across asynchronous execution loops.
* **Crash Safety & Idempotency**: Pre-generates deterministic UUIDs for each email job. If the backend process restarts, BullMQ resumes from Redis state without sending duplicate emails.
* **Fake SMTP Integration**: Delivers test emails via Nodemailer + Ethereal Email and stores web preview links in the database for visual verification.

### Frontend Dashboard Features
* **Google OAuth Authentication**: Secure login via Google Identity Services, issuing a backend-compatible JWT stored in `localStorage`.
* **Sidebar Navigation**: Features user profile details, quick logout, a green outline "Compose" CTA, and tabbed navigation (`Scheduled` and `Sent`).
* **Custom Message List**: Renders scheduled emails with orange time pills (e.g. `Tue 9:15:12 AM`), completed emails with `Sent` status pills, subject/body snippets, and interactive star toggles.
* **Bottom Sheet Composer**: Includes inline header actions (`Paperclip` CSV uploader, `Clock` start-time selector, `Send Later` CTA), green recipient lead pills, inline throttling inputs, and a rich text formatting toolbar.

---

## 🛠 Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Backend** | Node.js 20+, Express.js 4, TypeScript | REST API service layer |
| **Queue** | BullMQ 5.x | Redis-backed delayed job queue |
| **Database** | MySQL 8.x + Prisma 5 ORM | Persistent relational storage |
| **Cache / Queue Store** | Redis 7.2 | Queue storage & atomic rate-limit counters |
| **SMTP** | Nodemailer + Ethereal Email | Test email delivery & preview URLs |
| **Frontend** | React 19, Vite 6, TypeScript | Single-page application UI |
| **Styling** | Tailwind CSS 3 | Utility-first CSS styling |
| **Auth** | Google Identity Services + HS256 JWT | OAuth 2.0 authentication |

---

## ⚡ Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** 20+ and **npm** 10+
* **MySQL 8** running locally
* **Docker Desktop** (for Redis)
* A **Google Cloud Console** Client ID for OAuth

---

### 2. Environment Configuration

#### Backend `.env`
Create a `.env` file inside the `backend/` directory:
```env
NODE_ENV=development
PORT=4000
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/reachinbox"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-at-least-32-chars-long-key-here"
FRONTEND_URL="http://localhost:3000"
WORKER_CONCURRENCY=5
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"

# Ethereal Email (leave empty to auto-generate test credentials on startup):
ETHEREAL_USER=
ETHEREAL_PASS=
```

#### Frontend `.env.local`
Create a `.env.local` file inside the `frontend/` directory:
```env
VITE_API_URL="http://localhost:4000"
VITE_GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
```

---

### 3. Installation & Running

#### Step A: Start Redis (Docker)
From the project root:
```bash
docker-compose up -d redis
```

#### Step B: Setup & Start Backend
```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

#### Step C: Start Frontend (Vite)
Open a second terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

---

## ⚙️ How It Works (Deep Dive)

### 1. Scheduling Without Cron
Instead of polling the database periodically with cron jobs, emails are enqueued directly into BullMQ as **delayed jobs**:
```typescript
const startDelay = Math.max(0, startTime.getTime() - Date.now());
const delay = startDelay + index * delaySeconds * 1000;

await queue.add('send-email', emailData, { 
  jobId: `email-job:${emailJobId}`, 
  delay 
});
```
BullMQ stores these jobs in a Redis sorted set ordered by execution timestamp. When a job's timer expires, Redis triggers the worker processor immediately.

---

### 2. Atomic Rate Limiting (Lua Script)
Under high concurrency, checking sending limits using standard `SELECT` or `GET` queries causes race conditions. To solve this, the worker executes an atomic **Redis Lua script**:

```lua
local key     = KEYS[1]                          -- rate_limit:sender@domain:YYYY-MM-DD-HH
local limit   = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key) or '0')

if current >= limit then
  return {0, current}                            -- BLOCKED
end

local new_count = redis.call('INCR', key)
redis.call('EXPIRE', key, 3600)                  -- Auto-expire in 1 hour
return {1, new_count}                            -- ALLOWED
```

#### Overflow Handling:
If the limit is reached:
1. The script returns `allowed: false` along with the remaining milliseconds until the next hour window (`retryAfterMs`).
2. The worker re-queues the job into BullMQ for the next hour window using a deterministic retry ID: `rate-limited:${emailJobId}:${hourKey}`.
3. The job returns safely without throwing an exception, ensuring **no leads are dropped or failed prematurely**.

---

### 3. Crash Recovery & Persistence
* **Redis AOF**: Redis runs with Append-Only File enabled (`--appendonly yes`), committing operations to disk every second.
* **Restart Recovery**: If the backend process crashes or restarts:
  1. Pending delayed jobs remain safe in Redis.
  2. Upon backend restart, BullMQ reconnects and continues processing scheduled jobs at their designated times.
  3. Pre-generated deterministic job IDs prevent duplicate enqueues.

---

### 4. Behavior Under Heavy Load (1,000+ Emails)
When 1,000+ emails are scheduled simultaneously:
1. `queue.addBulk()` batches all 1,000 delayed jobs into Redis via a single pipeline connection.
2. The 5 concurrent workers pull jobs in parallel.
3. Once the sender's hourly limit (e.g., 50/hour) is met, the atomic Lua script blocks further dispatches for that hour, re-queueing the remaining 950 jobs to the next hour window automatically.

---

## 📡 API Endpoints

### Authentication
* `POST /api/auth/google` — Exchanges a Google ID Token for a backend session JWT.

### Campaigns *(Requires Bearer Token)*
* `POST /api/campaigns/schedule` — Schedules a new campaign with leads and send configuration.
* `GET /api/campaigns` — Fetches all campaigns for the logged-in user.

### Email Jobs *(Requires Bearer Token)*
* `GET /api/emails?status=scheduled|sent|failed|all&page=1&limit=20` — Retrieves paginated email jobs filtered by status.

---

## ⚖️ Trade-offs & Engineering Decisions

1. **BullMQ Delayed Jobs vs. Cron Polling**:
   * *Trade-off*: Requires a running Redis instance.
   * *Benefit*: Zero database polling overhead, exact execution timing, built-in retry mechanisms, and native distributed lock support across multiple backend instances.

2. **Atomic Redis Counters vs. Relational DB Counters**:
   * *Trade-off*: Counters live in Redis memory (persisted via AOF).
   * *Benefit*: Sub-millisecond execution speeds for limit checks, completely immune to multi-worker race conditions.

3. **Clientside JWT vs. Server Cookies**:
   * *Trade-off*: Token is stored in `localStorage`.
   * *Benefit*: Decouples the Vite React frontend from the Express backend, enabling pure SPA deployment on CDN hosts while supporting cross-origin requests securely.

---
