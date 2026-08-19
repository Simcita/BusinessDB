# Skills Reference

Skills are domain-knowledge packages in `.agents/skills/` that AI assistants load automatically when working on relevant areas of this codebase. They provide reference material and standards rather than a persona — think of them as the project's internal style guides and encyclopaedias.

This file is a quick-reference index. For role definitions (API Engineer, Database Engineer, etc.) see [Agents.md](./Agents.md).

---

## Available Skills

### 1. Supabase
**Path:** `.agents/skills/supabase/`
**Trigger:** Any task involving Supabase products

Covers the full Supabase ecosystem:
- Client libraries: `supabase-js`, `@supabase/ssr`
- Auth: login, logout, sessions, JWTs, cookies, `getSession`, `getUser`, `getClaims`
- Row Level Security (RLS) — policies, performance, debugging
- Supabase CLI and MCP server usage
- Schema changes and migration workflows
- Postgres extensions: `pg_graphql`, `pg_cron`, `pg_vector`
- Realtime, Storage, Edge Functions, Queues, Cron

---

### 2. Supabase Postgres Best Practices
**Path:** `.agents/skills/supabase-postgres-best-practices/`
**Trigger:** Writing, reviewing, or optimising Postgres queries, schemas, or database config

44 reference files across 8 categories:

| Category | Topics |
|---|---|
| **Query Performance** | Partial indexes, covering indexes, composite indexes, missing indexes, index types |
| **Connection Management** | Pooling, idle timeouts, connection limits, prepared statements |
| **Data Access Patterns** | Pagination, N+1 prevention, batch inserts, upserts |
| **Schema Design** | Constraints, data types, FK indexes, lowercase identifiers, partitioning, primary keys |
| **Security** | Privileges, RLS basics, RLS performance |
| **Locking Strategies** | Advisory locks, deadlock prevention, short transactions, skip locked |
| **Monitoring** | EXPLAIN ANALYZE, `pg_stat_statements`, VACUUM/ANALYZE |
| **Advanced Features** | Full-text search, JSONB indexing |

---

### 3. Prisma Standards
**Path:** `.agents/skills/prisma-standards.md`
**Trigger:** Modifying `prisma/schema.prisma`, writing service-layer queries, or planning migrations

Standards for Prisma 7 with `@prisma/adapter-pg`:
- Schema conventions: model naming (PascalCase → snake_case table), field types, `@id`, `@unique`, `@default`
- Relation definitions: one-to-many, many-to-many, optional vs required FKs
- Index strategy: `@@index`, `@@unique`, composite keys
- Migration workflow: `prisma migrate dev` in development, `prisma migrate deploy` in CI/production
- Query patterns: prefer `select` over `include` for performance, avoid `findMany` without pagination, use `$transaction` for multi-step writes
- N+1 prevention: always use `include` or nested `select` instead of looping queries
- Raw SQL: `$queryRaw` with tagged template literals (never string interpolation)
- Adapter config: `@prisma/adapter-pg` — connection via `pg.Pool`, passed to `PrismaClient`

---

### 4. Express Standards
**Path:** `.agents/skills/express-standards.md`
**Trigger:** Creating or modifying routes, controllers, middleware, or server setup

Patterns for this project's Express 5 application:

**Layer responsibilities:**
- `routes/` — mounts middleware and calls controller methods, no logic
- `controllers/` — validates input, calls one service, returns response via `src/utils/response.js`
- `services/` — all business logic and database access via Prisma

**Middleware order** (as defined in `src/app.js`):
```
helmet → cors → express.json() → morgan → rate-limit → auth → role → handler → error
```

**Express 5 async handling:**
Express 5 propagates rejected promises automatically — no try/catch needed in route handlers. Throw errors directly; the global error handler in `src/middleware/error.middleware.js` catches them.

**Response shape** (always use `src/utils/response.js`):
- `success(res, data, statusCode)` for 2xx
- `error(res, message, statusCode)` for 4xx/5xx

**Rate limiting:** Applied at route level via `src/middleware/rate-limit.middleware.js` (100 req / 15 min). Health and admin routes are exempt.

---

### 5. Security Standards
**Path:** `.agents/skills/security-standards.md`
**Trigger:** Any code touching auth, user input, external APIs, or secrets

Security practices enforced in this project:

| Concern | Implementation |
|---|---|
| Authentication | JWT signed with `JWT_SECRET`, stored in `admin_auth_token` HttpOnly cookie |
| Token extraction | `src/middleware/auth.middleware.js` — reads cookie first, falls back to `Authorization: Bearer` |
| Password hashing | bcrypt via `src/utils/password.js` — always hash, never store plaintext |
| Role-based access | `src/middleware/role.middleware.js` — `SUPPORT < ADMIN < SUPER_ADMIN` |
| Input validation | Zod schemas at the route boundary — `src/utils/validation.js` (public) and `src/validators/admin.validators.js` (admin) |
| CORS | Origin whitelist from `FRONTEND_URL` env var only |
| Security headers | `helmet()` with defaults applied globally in `src/app.js` |
| Rate limiting | `express-rate-limit` on all public API routes |
| Secrets | All secrets in `.env` only — never hardcoded, never logged |
| Audit trail | Every admin mutation writes to `audit_logs` via `src/services/audit.service.js` |
| Trust proxy | `app.set('trust proxy', 1)` — required for Railway / reverse-proxy deployments |

---

### 6. Worker Standards
**Path:** `.agents/skills/worker-standards.md`
**Trigger:** Modifying workers in `src/workers/`, adding background jobs, or changing cron schedules

Patterns for background worker development:

**Scheduling:**
- All workers use `node-cron` via `src/server.js`
- Default schedule: `*/15 * * * *` (every 15 minutes), configurable via `POLL_CRON_SCHEDULE` env var
- Workers can be fully disabled without redeployment: `DISABLE_EMAIL_POLLING=true` (gmail worker) or `DISABLE_JOB_PROCESSING=true` (verification + fulfillment workers)

**Idempotency:**
- Always check for existing records before inserting (e.g. `upsert` or `findFirst` → skip)
- Gmail worker stars processed emails (`\Flagged`) to prevent reprocessing
- Verification worker transitions status atomically: `PENDING → VERIFIED / FAILED`

**Batch processing:**
- Fulfillment worker processes max 10 `PENDING` jobs per cron tick
- Jobs are set to `PROCESSING` immediately to prevent double pickup by concurrent ticks

**Retry logic:**
- Max 3 attempts per job
- On failure: increment `retryCount`, reset `jobStatus` to `PENDING`
- After 3 failures: mark `FAILED`, copy to `failed_jobs` dead-letter table via `src/services/retry.service.js`

**Logging:**
- Every email parse attempt writes a `parser_logs` row (SUCCESS or FAILED) — even if extraction fails
- Every delivery attempt writes a `fulfillment_logs` row regardless of outcome

**IMAP lifecycle** (gmail worker):
- Open connection → fetch unseen + unflagged emails → parse → star each → close connection
- Never leave connections open between ticks
