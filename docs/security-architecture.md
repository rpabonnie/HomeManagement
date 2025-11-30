# Security Architecture & Best Practices

**Document Version:** 1.0  
**Date:** November 29, 2025  
**Scope:** Household Management System (HMS)

---

## Executive Summary

This document defines the security architecture for the HMS, a personal household application handling sensitive financial data (budgets, expenses) and operational data (generator usage). While this is not an enterprise system, it contains personally identifiable information (PII) and financial details that warrant proper security controls.

The security strategy balances **practical implementation effort** against **actual threat models** for a personal/small household application.

---

## 1. Threat Model Analysis

### 1.1 What Are We Protecting?

| Data Type | Sensitivity | Impact if Compromised |
|-----------|-------------|----------------------|
| Salary/Income | High | Financial privacy violation |
| Expense details | Medium-High | Spending pattern exposure |
| Debt information | High | Financial vulnerability exposure |
| Generator usage | Low | Minimal (schedule patterns) |
| User credentials | Critical | Full account takeover |
| API keys | Critical | Unauthorized access to all data |

### 1.2 Realistic Threat Actors

| Threat Actor | Likelihood | Motivation |
|--------------|------------|------------|
| **Opportunistic bot** | High | Scanning for exposed APIs, default credentials |
| **Credential stuffing** | Medium | Reusing leaked passwords from other breaches |
| **Targeted attacker** | Low | Personal vendetta, stalking |
| **Insider (household member)** | Low | Snooping on finances |
| **Nation-state** | Negligible | Not a valuable target |

### 1.3 Attack Surface

```
┌─────────────────────────────────────────────────────────────┐
│                      ATTACK SURFACE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ Web App     │    │ iOS         │    │ Direct API  │     │
│  │ (Browser)   │    │ Shortcuts   │    │ Access      │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         └────────────┬─────┴──────────────────┘             │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │   API Layer   │  ◄── Authentication here     │
│              └───────┬───────┘                              │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │   Database    │  ◄── Encryption at rest      │
│              └───────────────┘                              │
│                      │                                      │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │   Backups     │  ◄── Encrypted before send   │
│              └───────────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Strategy

### 2.1 Authentication Options Analysis

| Method | Complexity | Security | iOS Shortcuts Compatible | Self-Host Friendly |
|--------|------------|----------|--------------------------|-------------------|
| **API Key (Static)** | Low | Medium | ✅ Excellent | ✅ Yes |
| **JWT (Self-issued)** | Medium | High | ⚠️ Complex | ✅ Yes |
| **OAuth 2.0 (Auth0/Clerk)** | High | Very High | ❌ Not practical | ⚠️ Depends on provider |
| **Passkeys/WebAuthn** | Medium | Very High | ❌ No | ⚠️ Requires setup |
| **Basic Auth + HTTPS** | Low | Medium | ✅ Yes | ✅ Yes |

### 2.2 Recommended: Hybrid Authentication

Given the dual interface (Web App + iOS Shortcuts), I recommend a **hybrid approach**:

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WEB APPLICATION                 iOS SHORTCUTS              │
│  ┌─────────────────┐            ┌─────────────────┐        │
│  │ Login Form      │            │ API Key Header  │        │
│  │ (email/password)│            │ (pre-configured)│        │
│  └────────┬────────┘            └────────┬────────┘        │
│           │                              │                  │
│           ▼                              ▼                  │
│  ┌─────────────────┐            ┌─────────────────┐        │
│  │ Issue JWT       │            │ Validate API Key│        │
│  │ (httpOnly cookie)│           │ (static token)  │        │
│  └────────┬────────┘            └────────┬────────┘        │
│           │                              │                  │
│           └──────────┬───────────────────┘                  │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │ Authorized    │                              │
│              │ API Access    │                              │
│              └───────────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Rationale:

1. **Web App uses JWT in httpOnly cookies**: Prevents XSS token theft, standard secure pattern
2. **iOS Shortcuts use API Keys**: Shortcuts can't handle OAuth flows; static keys are the only practical option
3. **Both validated at API layer**: Single point of enforcement

### 2.3 Implementation

#### User & API Key Schema

```sql
-- Users table (for web login)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,  -- Argon2id hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- API Keys (for iOS Shortcuts and integrations)
CREATE TABLE api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    key_hash TEXT NOT NULL,       -- SHA-256 hash of the key
    key_prefix TEXT NOT NULL,     -- First 8 chars for identification (e.g., "hms_abc1")
    name TEXT NOT NULL,           -- "iPhone Shortcut", "Home Assistant"
    scopes TEXT NOT NULL DEFAULT '["*"]',  -- JSON array: ["generator:write", "budget:read"]
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,         -- NULL = never expires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP          -- Soft delete
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
```

#### Authentication Middleware

```typescript
// apps/api/src/middleware/auth.ts
import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { timingSafeEqual } from 'crypto';
import { db } from '../db';

type AuthMethod = 'jwt' | 'api_key';

interface AuthResult {
  userId: number;
  method: AuthMethod;
  scopes: string[];
}

export async function authMiddleware(c: Context, next: Next) {
  let authResult: AuthResult | null = null;

  // Try JWT from cookie first (web app)
  const token = c.req.cookie('auth_token');
  if (token) {
    try {
      const payload = await verify(token, process.env.JWT_SECRET!);
      authResult = {
        userId: payload.sub as number,
        method: 'jwt',
        scopes: ['*'] // Full access for web users
      };
    } catch {
      // Invalid JWT, try API key
    }
  }

  // Try API Key from header (iOS Shortcuts)
  if (!authResult) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer hms_')) {
      const apiKey = authHeader.slice(7);
      authResult = await validateApiKey(apiKey);
    }
  }

  if (!authResult) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('auth', authResult);
  await next();
}

async function validateApiKey(key: string): Promise<AuthResult | null> {
  const prefix = key.slice(0, 8);
  
  const record = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.key_prefix, prefix),
      isNull(apiKeys.revoked_at)
    )
  });

  if (!record) return null;

  // Check expiration
  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return null;
  }

  // Timing-safe comparison of hash
  const keyHash = createHash('sha256').update(key).digest('hex');
  const storedHash = Buffer.from(record.key_hash, 'hex');
  const providedHash = Buffer.from(keyHash, 'hex');

  if (!timingSafeEqual(storedHash, providedHash)) {
    return null;
  }

  // Update last used
  await db.update(apiKeys)
    .set({ last_used_at: new Date() })
    .where(eq(apiKeys.id, record.id));

  return {
    userId: record.user_id,
    method: 'api_key',
    scopes: JSON.parse(record.scopes)
  };
}
```

#### API Key Generation

```typescript
// apps/api/src/routes/settings/api-keys.ts
import { randomBytes, createHash } from 'crypto';

export async function generateApiKey(userId: number, name: string, scopes: string[]) {
  // Generate a secure random key
  const randomPart = randomBytes(24).toString('base64url');
  const key = `hms_${randomPart}`; // e.g., "hms_aB3dE5fG7hI9jK1lM3nO5pQ7"
  
  const keyHash = createHash('sha256').update(key).digest('hex');
  const keyPrefix = key.slice(0, 8);

  await db.insert(apiKeys).values({
    user_id: userId,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
    scopes: JSON.stringify(scopes)
  });

  // Return the key ONCE - it cannot be retrieved later
  return {
    key,           // Show to user, they must copy it now
    prefix: keyPrefix,
    name,
    scopes
  };
}
```

### 2.4 Password Security

```typescript
// apps/api/src/auth/password.ts
import { hash, verify } from '@node-rs/argon2';

// Argon2id configuration (OWASP recommended)
const ARGON2_OPTIONS = {
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 parallel threads
  hashLength: 32        // 256-bit hash
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verify(hash, password);
}
```

**Why Argon2id?**
- Winner of the Password Hashing Competition
- Memory-hard (resists GPU/ASIC attacks)
- Better than bcrypt for modern hardware
- `@node-rs/argon2` is a fast, native Node.js binding

---

## 3. Data Protection

### 3.1 Encryption at Rest

#### SQLite Database Encryption

**Option A: SQLCipher (Recommended for sensitive deployments)**

```typescript
// apps/api/src/db/index.ts
import Database from 'better-sqlite3';

const db = new Database('/data/hms.db');

// Enable encryption (SQLCipher)
db.pragma(`key = '${process.env.DB_ENCRYPTION_KEY}'`);

// Verify encryption is active
const result = db.pragma('cipher_version');
if (!result) {
  throw new Error('Database encryption not available');
}
```

**Option B: Application-Level Encryption (Simpler)**

For specific sensitive fields only:

```typescript
// packages/crypto/field-encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptField(encrypted: string): string {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Usage in Schema:**

```typescript
// Encrypt salary before storing
const encryptedSalary = encryptField(salary.toString());
await db.insert(salaryConfig).values({
  amount_encrypted: encryptedSalary,
  // ...
});
```

**Recommendation:** Start with Option B (field-level encryption) for salary and debt amounts only. Full-database encryption (SQLCipher) adds complexity and may interfere with Litestream backups.

### 3.2 Encryption in Transit

**Mandatory: HTTPS Everywhere**

```yaml
# docker-compose.yml with Caddy for automatic HTTPS
services:
  hms-api:
    build: ./apps/api
    expose:
      - "3000"
    # Not exposed directly to internet
    
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
    environment:
      - DOMAIN=${HMS_DOMAIN}
```

```
# Caddyfile
{$DOMAIN} {
    reverse_proxy hms-api:3000
    
    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### 3.3 Backup Encryption

**Always encrypt backups before sending to external storage:**

```typescript
// packages/backup/encrypted-backup.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGzip, createGunzip } from 'zlib';

const ALGORITHM = 'aes-256-gcm';

export async function encryptBackup(
  inputPath: string, 
  outputPath: string, 
  password: string
): Promise<{ iv: string; salt: string; authTag?: string }> {
  const salt = randomBytes(32);
  const iv = randomBytes(12);
  
  // Derive key from password
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 32, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  await pipeline(
    createReadStream(inputPath),
    createGzip(),
    cipher,
    createWriteStream(outputPath)
  );

  return {
    iv: iv.toString('hex'),
    salt: salt.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

// Store metadata alongside backup
// backup-2025-11-29.db.enc.json = { iv, salt, authTag }
```

**Email Backup with Encryption:**

```typescript
async function sendEncryptedBackup(dbPath: string, recipient: string) {
  const encryptedPath = `/tmp/hms-backup-${Date.now()}.db.enc`;
  const password = process.env.BACKUP_ENCRYPTION_PASSWORD!;
  
  const metadata = await encryptBackup(dbPath, encryptedPath, password);
  
  await transporter.sendMail({
    to: recipient,
    subject: `HMS Encrypted Backup - ${new Date().toISOString().split('T')[0]}`,
    text: `Backup encryption metadata (keep this safe):\n${JSON.stringify(metadata, null, 2)}`,
    attachments: [{
      filename: 'hms-backup.db.enc',
      path: encryptedPath
    }]
  });
  
  // Clean up temp file
  await unlink(encryptedPath);
}
```

---

## 4. API Security Best Practices

### 4.1 Rate Limiting

```typescript
// apps/api/src/middleware/rate-limit.ts
import { rateLimiter } from 'hono-rate-limiter';

// General API rate limit
export const generalLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,               // 100 requests per window
  standardHeaders: true,
  keyGenerator: (c) => {
    // Use API key prefix or IP
    const auth = c.get('auth');
    return auth?.method === 'api_key' 
      ? `key:${auth.userId}` 
      : c.req.header('x-forwarded-for') || 'unknown';
  }
});

// Strict limit for auth endpoints
export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,                 // 5 login attempts per 15 min
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown'
});
```

### 4.2 Input Validation (Zod)

```typescript
// packages/validation/budget.ts
import { z } from 'zod';

export const BudgetItemSchema = z.object({
  name: z.string()
    .min(1, 'Name required')
    .max(100, 'Name too long')
    .regex(/^[\w\s\-\.]+$/, 'Invalid characters'), // Prevent injection
  
  amount: z.number()
    .positive('Amount must be positive')
    .max(1_000_000_000, 'Amount too large'), // Sanity check
  
  category_id: z.number().int().positive(),
  
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'yearly']),
  
  is_active: z.boolean().default(true),
  
  notes: z.string()
    .max(1000)
    .optional()
    .transform(val => val ? sanitizeHtml(val) : val) // Sanitize HTML
});

// Use in route
app.post('/budget/items', async (c) => {
  const body = await c.req.json();
  const result = BudgetItemSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ 
      error: 'Validation failed', 
      details: result.error.flatten() 
    }, 400);
  }
  
  // result.data is now typed and sanitized
  await db.insert(budgetItems).values(result.data);
});
```

### 4.3 SQL Injection Prevention

**Drizzle ORM handles this automatically**, but be vigilant with raw queries:

```typescript
// ❌ NEVER do this
const query = `SELECT * FROM users WHERE email = '${email}'`;

// ✅ Drizzle ORM (parameterized automatically)
const user = await db.query.users.findFirst({
  where: eq(users.email, email)
});

// ✅ If raw SQL is needed, use parameters
const result = await db.execute(
  sql`SELECT * FROM users WHERE email = ${email}`
);
```

### 4.4 Security Headers

```typescript
// apps/api/src/middleware/security-headers.ts
import { secureHeaders } from 'hono/secure-headers';

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // For Tailwind
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin'
}));
```

---

## 5. Secrets Management

### 5.1 Environment Variables Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   SECRETS HIERARCHY                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DEVELOPMENT          PRODUCTION (Azure)    SELF-HOSTED     │
│  ┌─────────────┐     ┌─────────────┐      ┌─────────────┐  │
│  │ .env.local  │     │ Azure Key   │      │ Docker      │  │
│  │ (gitignored)│     │ Vault       │      │ Secrets     │  │
│  └─────────────┘     └─────────────┘      └─────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Required Secrets

```bash
# .env.example (commit this, not actual values)

# Authentication
JWT_SECRET=                    # 256-bit random: openssl rand -hex 32
JWT_EXPIRES_IN=7d

# Database
DB_ENCRYPTION_KEY=             # 256-bit: openssl rand -hex 32

# Backup
BACKUP_ENCRYPTION_PASSWORD=    # Strong passphrase
SMTP_HOST=
SMTP_USER=
SMTP_PASS=
BACKUP_EMAIL=

# Optional: Cloud Backup
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
GDRIVE_SERVICE_ACCOUNT_KEY=   # Base64 encoded JSON

# Optional: SMS Alerts
TWILIO_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=
```

### 5.3 Azure Key Vault Integration

```typescript
// apps/api/src/config/secrets.ts
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

let secrets: Record<string, string> = {};

export async function loadSecrets() {
  if (process.env.NODE_ENV === 'development') {
    // Use .env.local in development
    return;
  }

  if (process.env.AZURE_KEY_VAULT_URL) {
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(
      process.env.AZURE_KEY_VAULT_URL, 
      credential
    );

    const secretNames = [
      'jwt-secret',
      'db-encryption-key',
      'backup-password',
      'smtp-pass'
    ];

    for (const name of secretNames) {
      const secret = await client.getSecret(name);
      const envName = name.toUpperCase().replace(/-/g, '_');
      process.env[envName] = secret.value;
    }
  }
}
```

### 5.4 Docker Secrets (Self-Hosted)

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  hms-api:
    image: hms-api:latest
    secrets:
      - jwt_secret
      - db_encryption_key
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_ENCRYPTION_KEY_FILE=/run/secrets/db_encryption_key

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_encryption_key:
    file: ./secrets/db_encryption_key.txt
```

```typescript
// Read from file if _FILE env var is set
function getSecret(name: string): string {
  const fileEnv = process.env[`${name}_FILE`];
  if (fileEnv) {
    return readFileSync(fileEnv, 'utf8').trim();
  }
  return process.env[name] || '';
}
```

---

## 6. iOS Shortcuts Security

### 6.1 Risks and Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| API key exposed in Shortcut | Medium | Keys are scoped and revocable |
| Key stolen from iCloud backup | Medium | Create device-specific keys |
| Shortcut shared accidentally | High | Include warning in key name |
| Man-in-the-middle attack | High | HTTPS mandatory |

### 6.2 Secure Shortcut Configuration

**Best Practices:**

1. **Create dedicated keys per device**
   - "iPhone 15 Pro - Generator" 
   - "iPad - Budget Read Only"

2. **Scope keys minimally**
   ```typescript
   // Generator shortcut only needs these scopes
   const generatorKey = await generateApiKey(userId, 'iPhone Generator', [
     'generator:start',
     'generator:stop',
     'generator:read'
   ]);
   
   // Budget view shortcut
   const budgetKey = await generateApiKey(userId, 'iPad Budget', [
     'budget:read'  // No write access
   ]);
   ```

3. **Store key in Shortcut's secure storage**
   - Use "Text" action with "Don't show in Widget"
   - Or use iOS Keychain via Shortcuts (more complex)

4. **Set expiration for keys**
   ```typescript
   // Rotate keys annually
   const key = await generateApiKey(userId, 'iPhone', scopes, {
     expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
   });
   ```

### 6.3 Scope Enforcement

```typescript
// apps/api/src/middleware/scope-check.ts
export function requireScopes(...requiredScopes: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth');
    
    if (auth.scopes.includes('*')) {
      // Full access (web users)
      return next();
    }
    
    const hasAllScopes = requiredScopes.every(
      scope => auth.scopes.includes(scope)
    );
    
    if (!hasAllScopes) {
      return c.json({ 
        error: 'Insufficient permissions',
        required: requiredScopes,
        granted: auth.scopes
      }, 403);
    }
    
    return next();
  };
}

// Usage
app.post('/generator/start', 
  authMiddleware,
  requireScopes('generator:start'),
  async (c) => { /* ... */ }
);
```

---

## 7. Audit Logging

### 7.1 What to Log

| Event | Priority | Data Captured |
|-------|----------|---------------|
| Login success | High | User ID, IP, timestamp |
| Login failure | High | Email attempted, IP, timestamp |
| API key created | High | Key prefix, scopes, creator |
| API key revoked | High | Key prefix, revoker |
| Budget item modified | Medium | Item ID, old value, new value, user |
| Backup completed | Medium | Timestamp, destination, size |
| Backup failed | High | Error details, timestamp |

### 7.2 Implementation

```typescript
// packages/audit/logger.ts
import { db } from '../db';

interface AuditEvent {
  event_type: string;
  user_id?: number;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export async function logAuditEvent(event: AuditEvent) {
  await db.insert(auditLogs).values({
    ...event,
    details: JSON.stringify(event.details),
    created_at: new Date()
  });
  
  // Also log to console for container log aggregation
  console.log(JSON.stringify({
    type: 'audit',
    ...event,
    timestamp: new Date().toISOString()
  }));
}

// Schema
// CREATE TABLE audit_logs (
//   id INTEGER PRIMARY KEY,
//   event_type TEXT NOT NULL,
//   user_id INTEGER,
//   resource_type TEXT,
//   resource_id TEXT,
//   details TEXT,
//   ip_address TEXT,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );
```

---

## 8. Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables, not code
- [ ] `.env` files in `.gitignore`
- [ ] HTTPS configured and enforced
- [ ] Rate limiting enabled
- [ ] CORS configured for specific origins only
- [ ] SQL injection prevented (parameterized queries)
- [ ] Input validation on all endpoints
- [ ] Password hashing with Argon2id
- [ ] JWT secret is 256+ bits
- [ ] API keys are hashed before storage

### Operational

- [ ] Backup encryption enabled
- [ ] Audit logging active
- [ ] API key rotation policy defined
- [ ] Monitoring for failed login attempts
- [ ] Container runs as non-root user
- [ ] Database file permissions restricted

### Periodic Review

- [ ] Review and revoke unused API keys (quarterly)
- [ ] Update dependencies for security patches (monthly)
- [ ] Test backup restoration process (quarterly)
- [ ] Review audit logs for anomalies (monthly)

---

## 9. Incident Response Plan

### If API Key is Compromised

1. **Immediately revoke** the key via web UI or direct DB update
2. **Check audit logs** for unauthorized access
3. **Generate new key** for legitimate device
4. **Update Shortcut** with new key
5. **Review** what data may have been accessed

### If Database is Exposed

1. **Rotate all secrets** (JWT, encryption keys)
2. **Force password resets** for all users
3. **Revoke all API keys**
4. **Restore from clean backup** if tampering suspected
5. **Review and patch** the vulnerability

### If Backup is Intercepted

1. **Encrypted backups are safe** — attacker needs password
2. **Rotate backup encryption password** as precaution
3. **Review backup destination security** (email account, cloud storage)

---

## 10. Summary

| Security Layer | Implementation | Complexity |
|----------------|----------------|------------|
| **Authentication** | JWT + API Keys (hybrid) | Medium |
| **Data at Rest** | Field-level AES-256-GCM | Low |
| **Data in Transit** | HTTPS via Caddy | Low |
| **Backup Security** | Encrypted before send | Medium |
| **API Security** | Rate limiting, Zod validation | Low |
| **Secrets Management** | Env vars / Key Vault / Docker secrets | Medium |
| **Audit Trail** | SQLite + console logging | Low |

**Key Takeaways:**

1. **Don't over-engineer** — This is a personal app, not a bank
2. **Encrypt sensitive fields**, not necessarily the whole database
3. **API keys are fine** for iOS Shortcuts when scoped and revocable
4. **Always encrypt backups** before sending anywhere
5. **HTTPS is non-negotiable** — Caddy makes it trivial
6. **Argon2id for passwords** — Don't use bcrypt in 2025

This security architecture provides defense-in-depth appropriate for a household financial application while remaining implementable by a solo developer.
