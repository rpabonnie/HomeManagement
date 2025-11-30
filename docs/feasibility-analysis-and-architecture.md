# Household Management System: Feasibility Analysis & Architectural Design

**Document Version:** 1.0  
**Date:** November 29, 2025  
**Author:** Cloud Solutions Architect

---

## Executive Summary

This document provides a comprehensive feasibility analysis for the Household Management System (HMS), encompassing two modules: an **Expense Calculator & Budget Planner** and a **Generator Usage & Maintenance Log**. After analyzing the requirements against cloud-agnostic deployment patterns, cost constraints, and portability needs, this report recommends:

- **Architecture**: Combined Modular Monolith in a single repository
- **Runtime**: Containerized REST API (not Azure Functions) for maximum portability
- **Database**: SQLite with file-based backup strategy
- **Frontend**: React-based Progressive Web App (PWA)
- **Deployment**: Docker Compose for local/self-hosted; Azure Container Apps for cloud

The analysis concludes that both modules share sufficient infrastructure needs to warrant consolidation, while the "pack and redeploy" requirement eliminates Azure Functions as a viable option despite its serverless appeal.

---

## 1. Architectural Recommendation

### 1.1 Combined vs. Separate: The Verdict

| Factor | Combined (Monorepo) | Separate Services |
|--------|---------------------|-------------------|
| Deployment Complexity | Single container/compose file | Multiple deployments to manage |
| Shared Auth | One implementation | Duplicated or extracted to third service |
| Database Management | Single backup strategy | Multiple backup jobs |
| Portability | One `docker-compose.yml` | Multiple compose files or orchestration |
| Development Overhead | Lower for solo developer | Higher context switching |
| Cost | Single compute instance | Multiple instances (even if small) |

**Recommendation: Combined Modular Monolith**

**Rationale:**
1. Both modules serve the same user (household administrator)
2. Both require the same authentication context
3. Backup strategy is unified (one database, one export job)
4. "Pack and redeploy" is simpler with one artifact
5. Future integration is possible (e.g., "generator fuel cost impacts budget")

### 1.2 Achieving "Pack and Redeploy"

The portability requirement demands that infrastructure dependencies be minimized and containerized.

#### Deployment Target Matrix

| Environment | Solution | Config Changes Required |
|-------------|----------|------------------------|
| **Azure (Primary)** | Azure Container Apps | None (baseline) |
| **AWS** | AWS App Runner or ECS Fargate | Change env vars for backup destination |
| **Google Cloud** | Cloud Run | Change env vars for backup destination |
| **Local/Self-Hosted** | Docker Compose + Raspberry Pi/NAS | Point backup to local NFS or Synology |
| **Hybrid** | Fly.io / Railway | Minimal (env vars only) |

#### Recommended Approach: Docker Compose as Universal Baseline

```yaml
# docker-compose.yml (works everywhere)
version: '3.8'
services:
  hms-api:
    build: ./apps/api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/data/hms.db
      - BACKUP_PROVIDER=${BACKUP_PROVIDER:-local}
      - BACKUP_DESTINATION=${BACKUP_DESTINATION:-/backups}
    volumes:
      - hms-data:/data
      - hms-backups:/backups

volumes:
  hms-data:
  hms-backups:
```

**Why Not Kubernetes?**
- Overkill for a personal household app
- Adds complexity without proportional benefit
- Docker Compose achieves the same portability for single-user workloads
- Kubernetes requires cluster management overhead

**Azure Container Apps Compatibility:**
Azure Container Apps natively supports Docker Compose-style multi-container apps. The same `docker-compose.yml` can be deployed with:
```bash
az containerapp compose create --environment MyEnv --compose-file docker-compose.yml
```

---

## 2. Technology Stack Selection

### 2.1 Azure Functions vs. Standard REST API

This is the critical decision for portability. Let's analyze honestly:

| Criterion | Azure Functions | Standard REST API (Fastify/Express) |
|-----------|-----------------|-------------------------------------|
| **Cold Start** | 1-10s (Consumption plan) | 0s (always warm in container) |
| **Local Development** | Requires Azure Functions Core Tools | Standard Node.js tooling |
| **Portability** | ❌ Azure-specific triggers/bindings | ✅ Runs anywhere Node.js runs |
| **Self-Hosted** | ❌ Complex (requires KEDA + custom runtime) | ✅ `docker run` and done |
| **AWS Migration** | ❌ Rewrite to Lambda | ✅ Same container, different cloud |
| **Cost (Azure)** | Free tier: 1M executions/month | Container Apps: 180k vCPU-sec free |
| **iOS Shortcut Integration** | Works (HTTP trigger) | Works (REST endpoint) |

**Recommendation: Standard REST API**

**Rationale:**
Azure Functions' vendor lock-in directly contradicts the "deploy anywhere" requirement. While Functions offer elegant serverless scaling, the portability cost is prohibitive:

1. **Triggers are proprietary**: Azure Queue triggers, Timer triggers, etc. don't exist in AWS/GCP without rewrites
2. **Local self-hosting is impractical**: Running Azure Functions locally long-term requires maintaining the Azure Functions runtime
3. **The Generator module is simple**: It's just two endpoints (`POST /start`, `POST /stop`). Functions adds complexity without benefit.

**Exception Consideration:**
If the app will *never* leave Azure and cost is paramount, Functions could work. But given the explicit "migratable to local machine" requirement, REST API wins definitively.

### 2.2 Database Selection

| Database | Cloud Scaling | Local Simplicity | Backup Ease | Portability | Cost |
|----------|---------------|------------------|-------------|-------------|------|
| **PostgreSQL** | ✅ Excellent | ⚠️ Requires server process | ⚠️ pg_dump scheduling | ✅ Universal | $$-$$$ |
| **SQLite** | ⚠️ Single-writer | ✅ Zero config | ✅ Copy file | ✅ Universal | Free |
| **MongoDB** | ✅ Atlas free tier | ⚠️ Requires mongod | ⚠️ mongodump | ✅ Good | $-$$ |
| **Turso (libSQL)** | ✅ Edge replicas | ✅ SQLite compatible | ✅ Built-in | ✅ Excellent | Free tier |

**Recommendation: SQLite (with Turso as cloud upgrade path)**

**Rationale:**
1. **Backup simplicity**: SQLite backup = copy a file. This directly enables the "email/OneDrive" backup requirement.
2. **Zero operational overhead**: No database server to manage locally or in cloud
3. **Portability**: The `.db` file moves with the container
4. **Sufficient scale**: A household app will never hit SQLite's write limits
5. **Turso upgrade path**: If multi-device sync becomes needed, Turso provides libSQL (SQLite-compatible) with cloud replication

**Schema Consideration:**
SQLite's weakness is concurrent writes. For HMS, this is irrelevant—there's one household, likely one user at a time. The Generator module's start/stop won't create write contention.

### 2.3 Frontend Framework

| Framework | PWA Support | Offline Capability | Learning Curve | Bundle Size |
|-----------|-------------|-------------------|----------------|-------------|
| **Next.js** | ✅ Excellent | ✅ With next-pwa | Medium | Medium |
| **React + Vite** | ✅ With vite-pwa | ✅ Good | Low | Small |
| **SvelteKit** | ✅ Native | ✅ Excellent | Medium | Smallest |
| **Vue + Nuxt** | ✅ Good | ✅ Good | Low | Small |

**Recommendation: React + Vite (with PWA plugin)**

**Rationale:**
1. **PWA for iOS Shortcuts complement**: The web app handles complex interactions; Shortcuts handle quick actions
2. **Offline capability**: Budget calculator should work without network
3. **Type sharing**: React + TypeScript shares types with the Node.js backend via monorepo
4. **Vite over Next.js**: No SSR needed for a personal dashboard app; Vite is simpler and faster

**Adaptive Web App Strategy:**
```
├── apps/web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── budget/        # Expense Calculator UI
│   │   │   └── generator/     # Generator Log UI (minimal, mostly Shortcuts)
│   │   └── pwa/
│   │       └── service-worker.ts  # Offline caching
```

---

## 3. Data Strategy

### 3.1 Database Schema Design

#### Module 1: Expense Calculator & Budget Planner

```sql
-- Core configuration
CREATE TABLE salary_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    amount DECIMAL(10,2) NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'biweekly', -- 'weekly', 'biweekly', 'monthly'
    currency TEXT NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (id = 1) -- Singleton pattern
);

-- Expense categories (enum-like)
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('expense', 'debt', 'subscription')),
    icon TEXT, -- emoji or icon name
    color TEXT  -- hex color for UI
);

-- Budget items (the core entity)
CREATE TABLE budget_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly', 'yearly'
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- THE KEY TOGGLE FEATURE
    due_day INTEGER, -- Day of month (1-31) for bills
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Debt-specific extensions
CREATE TABLE debt_details (
    budget_item_id INTEGER PRIMARY KEY REFERENCES budget_items(id),
    principal DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,4), -- e.g., 0.0599 for 5.99%
    minimum_payment DECIMAL(10,2),
    current_balance DECIMAL(10,2) NOT NULL,
    target_payoff_date DATE
);

-- What-if scenarios (saved configurations)
CREATE TABLE scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    item_states JSON NOT NULL, -- {"item_id": true/false, ...}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX idx_budget_items_active ON budget_items(is_active);
CREATE INDEX idx_budget_items_category ON budget_items(category_id);
```

#### Module 2: Generator Usage & Maintenance Log

```sql
-- Generator configuration
CREATE TABLE generators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT 'Primary Generator',
    model TEXT,
    oil_change_interval_hours DECIMAL(6,1) NOT NULL DEFAULT 100.0,
    last_oil_change_at DECIMAL(10,1) DEFAULT 0, -- Total hours at last change
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage sessions
CREATE TABLE usage_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generator_id INTEGER NOT NULL REFERENCES generators(id) DEFAULT 1,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_hours DECIMAL(6,2), -- Computed on stop
    notes TEXT,
    -- Computed columns for queries
    is_open BOOLEAN GENERATED ALWAYS AS (end_time IS NULL) STORED
);

-- Maintenance log
CREATE TABLE maintenance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    generator_id INTEGER NOT NULL REFERENCES generators(id),
    type TEXT NOT NULL CHECK (type IN ('oil_change', 'filter', 'spark_plug', 'other')),
    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hours_at_maintenance DECIMAL(10,1) NOT NULL,
    cost DECIMAL(8,2),
    notes TEXT
);

-- Alerts configuration
CREATE TABLE alert_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    email TEXT,
    phone TEXT, -- For SMS
    hours_before_due DECIMAL(6,1) DEFAULT 10.0, -- Alert 10 hours before oil change
    CHECK (id = 1)
);

-- Indexes
CREATE INDEX idx_sessions_open ON usage_sessions(is_open) WHERE is_open = TRUE;
CREATE INDEX idx_sessions_generator ON usage_sessions(generator_id);

-- View for total runtime
CREATE VIEW generator_stats AS
SELECT 
    g.id,
    g.name,
    g.oil_change_interval_hours,
    g.last_oil_change_at,
    COALESCE(SUM(us.duration_hours), 0) as total_hours,
    COALESCE(SUM(us.duration_hours), 0) - g.last_oil_change_at as hours_since_oil_change,
    g.oil_change_interval_hours - (COALESCE(SUM(us.duration_hours), 0) - g.last_oil_change_at) as hours_until_oil_change
FROM generators g
LEFT JOIN usage_sessions us ON us.generator_id = g.id AND us.end_time IS NOT NULL
GROUP BY g.id;
```

### 3.2 Automated Backup Strategy

The backup requirement (email/OneDrive/Google Drive) is critical. Here's a multi-provider approach:

#### Backup Architecture

```
┌─────────────────┐
│   SQLite DB     │
│  /data/hms.db   │
└────────┬────────┘
         │ Scheduled Job (cron or node-cron)
         ▼
┌─────────────────┐
│  Backup Service │
│  - Compress DB  │
│  - Encrypt      │
└────────┬────────┘
         │
    ┌────┴────┬─────────────┐
    ▼         ▼             ▼
┌───────┐ ┌───────┐   ┌──────────┐
│ Email │ │OneDrive│   │Google    │
│ SMTP  │ │ Graph  │   │Drive API │
└───────┘ └───────┘   └──────────┘
```

#### Implementation Options

**Option A: Email Backup (Simplest, Most Portable)**
```typescript
// packages/backup/email-backup.ts
import nodemailer from 'nodemailer';
import { createReadStream } from 'fs';
import { createGzip } from 'zlib';

async function backupToEmail(dbPath: string, recipient: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const date = new Date().toISOString().split('T')[0];
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject: `HMS Backup - ${date}`,
    text: 'Automated database backup attached.',
    attachments: [{
      filename: `hms-backup-${date}.db.gz`,
      content: createReadStream(dbPath).pipe(createGzip())
    }]
  });
}
```

**Option B: OneDrive (Microsoft Graph API)**
```typescript
// packages/backup/onedrive-backup.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { readFileSync } from 'fs';

async function backupToOneDrive(dbPath: string, accessToken: string) {
  const client = Client.init({
    authProvider: (done) => done(null, accessToken)
  });

  const date = new Date().toISOString().split('T')[0];
  const content = readFileSync(dbPath);

  await client
    .api(`/me/drive/root:/Backups/HMS/hms-backup-${date}.db:/content`)
    .put(content);
}
```

**Option C: Google Drive (Service Account)**
```typescript
// packages/backup/gdrive-backup.ts
import { google } from 'googleapis';
import { createReadStream } from 'fs';

async function backupToGoogleDrive(dbPath: string, folderId: string) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });

  const drive = google.drive({ version: 'v3', auth });
  const date = new Date().toISOString().split('T')[0];

  await drive.files.create({
    requestBody: {
      name: `hms-backup-${date}.db`,
      parents: [folderId]
    },
    media: {
      mimeType: 'application/x-sqlite3',
      body: createReadStream(dbPath)
    }
  });
}
```

#### Backup Scheduling

```typescript
// apps/api/src/jobs/backup-scheduler.ts
import cron from 'node-cron';

// Daily backup at 2 AM
cron.schedule('0 2 * * *', async () => {
  const provider = process.env.BACKUP_PROVIDER;
  
  switch (provider) {
    case 'email':
      await backupToEmail('/data/hms.db', process.env.BACKUP_EMAIL!);
      break;
    case 'onedrive':
      await backupToOneDrive('/data/hms.db', await getOneDriveToken());
      break;
    case 'gdrive':
      await backupToGoogleDrive('/data/hms.db', process.env.GDRIVE_FOLDER_ID!);
      break;
    case 'local':
    default:
      await copyToLocalBackup('/data/hms.db', '/backups');
  }
});
```

**Portability Note:** When moving to self-hosted, simply set `BACKUP_PROVIDER=local` and mount a network share to `/backups`. No code changes required.

---

## 4. Critical Review

### 4.1 iOS Shortcuts as Primary UI for Generator Module

**Feasibility Assessment: ✅ Highly Feasible (with caveats)**

#### How It Works

```
┌──────────────────┐         ┌─────────────────┐
│   iOS Shortcut   │  HTTP   │    HMS API      │
│   "Start Gen"    │────────▶│ POST /generator │
│                  │         │     /start      │
└──────────────────┘         └─────────────────┘

┌──────────────────┐         ┌─────────────────┐
│   iOS Shortcut   │  HTTP   │    HMS API      │
│   "Stop Gen"     │────────▶│ POST /generator │
│                  │         │     /stop       │
└──────────────────┘         └─────────────────┘
```

#### API Design for iOS Shortcuts

```typescript
// apps/api/src/routes/generator.ts
import { Hono } from 'hono';
import { db } from '../db';

const generator = new Hono();

// POST /generator/start
// Response must be simple for Shortcut parsing
generator.post('/start', async (c) => {
  const session = await db.insert(usageSessions).values({
    generator_id: 1,
    start_time: new Date()
  }).returning();

  // iOS Shortcuts handles JSON well, but keep it simple
  return c.json({
    success: true,
    message: 'Generator started',
    session_id: session[0].id,
    started_at: session[0].start_time
  });
});

// POST /generator/stop
generator.post('/stop', async (c) => {
  // Find open session
  const openSession = await db.query.usageSessions.findFirst({
    where: eq(usageSessions.is_open, true)
  });

  if (!openSession) {
    return c.json({ success: false, message: 'No active session' }, 400);
  }

  const endTime = new Date();
  const durationMs = endTime.getTime() - openSession.start_time.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  await db.update(usageSessions)
    .set({ 
      end_time: endTime, 
      duration_hours: Math.round(durationHours * 100) / 100 
    })
    .where(eq(usageSessions.id, openSession.id));

  // Check if maintenance is due
  const stats = await db.query.generatorStats.findFirst();
  const maintenanceDue = stats.hours_until_oil_change <= 10;

  return c.json({
    success: true,
    message: maintenanceDue 
      ? `⚠️ Stopped. Oil change needed in ${stats.hours_until_oil_change.toFixed(1)} hours!`
      : `Stopped. Ran for ${durationHours.toFixed(2)} hours.`,
    duration_hours: durationHours,
    total_hours: stats.total_hours,
    maintenance_due: maintenanceDue
  });
});
```

#### iOS Shortcut Configuration

**Start Generator Shortcut:**
1. Action: "Get Contents of URL"
   - URL: `https://hms.yourdomain.com/generator/start`
   - Method: POST
   - Headers: `Authorization: Bearer ${API_KEY}` (stored in Shortcut)
2. Action: "Get Dictionary Value" → `message`
3. Action: "Show Notification" → Show the message

**Stop Generator Shortcut:**
1. Same HTTP call to `/generator/stop`
2. Parse `message` and `maintenance_due`
3. If `maintenance_due` is true, add "Send Email" action to self

#### Caveats and Mitigations

| Issue | Mitigation |
|-------|------------|
| **No network = no logging** | Accept this limitation; generator use isn't latency-sensitive |
| **Double-tap accident** | API should be idempotent: second "start" returns existing session |
| **Forgot to stop** | Add a "running too long" alert (> 8 hours) via scheduled job |
| **Authentication** | Use simple API key in Shortcut; don't over-engineer |

### 4.2 Migration Bottlenecks: Azure → Local

**Analysis of Potential Pain Points**

| Component | Azure Dependency | Migration Effort | Mitigation |
|-----------|------------------|------------------|------------|
| **Compute** | Container Apps | 🟢 Low | Docker Compose works anywhere |
| **Database** | None (SQLite in container) | 🟢 None | File moves with container |
| **Backup to OneDrive** | Microsoft Graph API | 🟡 Medium | Switch to `BACKUP_PROVIDER=local` or email |
| **Custom Domain + HTTPS** | Azure-managed TLS | 🟡 Medium | Use Caddy/Traefik with Let's Encrypt locally |
| **Alerts (SMS)** | Azure Communication Services | 🔴 High | Switch to Twilio or email-only |
| **Secret Management** | Azure Key Vault | 🟡 Medium | Use `.env` file or Docker secrets locally |

#### Detailed Migration Checklist

**From Azure Container Apps to Local Docker:**

```bash
# 1. Export current database
az containerapp exec -n hms-app -g hms-rg --command "cp /data/hms.db /tmp/hms.db"
az containerapp exec -n hms-app -g hms-rg --command "cat /tmp/hms.db" > hms.db

# 2. On local machine
docker-compose up -d

# 3. Copy database into container
docker cp hms.db hms-api:/data/hms.db

# 4. Update DNS or use local hosts file
# 5. Update iOS Shortcuts to point to new URL
```

**Estimated Migration Time:** 1-2 hours for basic migration, additional 2-4 hours for HTTPS and DNS setup.

#### The HTTPS Challenge

Local self-hosting requires solving HTTPS for iOS Shortcuts (which may enforce HTTPS for security).

**Solutions:**
1. **Tailscale Funnel**: Expose local server with automatic HTTPS
2. **Cloudflare Tunnel**: Free, provides HTTPS termination
3. **Caddy reverse proxy**: Automatic Let's Encrypt certificates (requires domain)
4. **Accept HTTP for local**: If on same network, iOS allows HTTP to local IPs

**Recommendation:** Use Cloudflare Tunnel for self-hosted deployments. It's free, provides HTTPS, and doesn't require opening firewall ports.

```yaml
# docker-compose.local.yml
services:
  hms-api:
    # ... same as before

  cloudflared:
    image: cloudflare/cloudflared
    command: tunnel run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
```

---

## 5. Complete Technology Stack Summary

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Language** | TypeScript | Type safety, shared types frontend/backend |
| **Backend Runtime** | Node.js + Hono | Lightweight, fast, portable |
| **Frontend** | React + Vite | PWA support, type sharing, fast builds |
| **Database** | SQLite (Drizzle ORM) | Zero-config, file-based backup |
| **Validation** | Zod | Runtime + compile-time safety |
| **Container** | Docker + Compose | Universal deployment artifact |
| **Cloud (Primary)** | Azure Container Apps | Free tier, scale-to-zero |
| **Cloud (Backup)** | Email SMTP / OneDrive | Automated off-site backup |
| **Local Hosting** | Docker + Cloudflare Tunnel | HTTPS without complexity |
| **Mobile Input** | iOS Shortcuts | Native integration, zero app development |

---

## 6. Final Recommendations

### Do This ✅

1. **Build as Modular Monolith**: Single repo, single container, two logical modules
2. **Use SQLite**: Perfect for backup requirements and portability
3. **Skip Azure Functions**: REST API in a container is more portable
4. **Implement iOS Shortcuts for Generator**: It's elegant and requires no app store submission
5. **Use email backup as primary**: Most reliable, works everywhere
6. **Design API for idempotency**: Prevent double-logging from shortcut misfires

### Avoid This ❌

1. **Don't use Azure-specific services** (Service Bus, Event Grid, etc.)
2. **Don't use managed databases** (Azure SQL, Cosmos DB) — they don't migrate
3. **Don't build a native mobile app** — iOS Shortcuts + PWA covers all use cases
4. **Don't over-engineer alerts** — email notifications are sufficient for v1

### Future Considerations 🔮

1. **Multi-device sync**: If needed, migrate SQLite → Turso (libSQL) for edge replication
2. **Voice integration**: Siri Shortcuts already support this; no additional work needed
3. **LLM chatbot**: Add an endpoint that accepts natural language and maps to budget operations
4. **Forecasting**: Use simple linear regression in TypeScript (no ML infrastructure needed)

---

## Appendix A: iOS Shortcut Templates

### Start Generator Shortcut

```
1. [Text] → Store API key
2. [Get Contents of URL]
   - URL: https://your-domain.com/api/generator/start
   - Method: POST
   - Headers: 
     - Authorization: Bearer [API Key]
     - Content-Type: application/json
3. [Get Dictionary Value] → Key: "message"
4. [Show Notification] → [Dictionary Value]
```

### Stop Generator Shortcut

```
1. [Text] → Store API key
2. [Get Contents of URL]
   - URL: https://your-domain.com/api/generator/stop
   - Method: POST
   - Headers: 
     - Authorization: Bearer [API Key]
3. [Get Dictionary Value] → Key: "message"
4. [Get Dictionary Value] → Key: "maintenance_due"
5. [If] maintenance_due equals true
   - [Show Alert] → "⚠️ Schedule oil change soon!"
6. [End If]
7. [Show Notification] → [message]
```

---

## Appendix B: Cost Estimation

| Resource | Azure (Monthly) | Self-Hosted (Monthly) |
|----------|-----------------|----------------------|
| Compute | $0 (free tier) | $0 (existing hardware) |
| Database | $0 (SQLite) | $0 (SQLite) |
| Backup Storage | $0.01 (Blob) | $0 (local NAS) |
| HTTPS/Domain | $0 (Azure managed) | $0 (Cloudflare) |
| SMS Alerts | $0.0075/msg | $0 (email only) |
| **Total** | **~$0-1/month** | **~$0/month** |

---

*This analysis concludes that the Household Management System is highly feasible with the proposed architecture. The combination of containerized deployment, SQLite persistence, and iOS Shortcuts integration provides a robust, portable, and cost-effective solution that meets all stated requirements.*
