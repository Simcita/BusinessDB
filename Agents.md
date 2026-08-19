# AI Agents Configuration

This project uses an `.agents/` directory to give AI coding assistants focused, role-specific context about the codebase. There are two types of files: **agent role definitions** (who the agent acts as) and **skills** (domain knowledge injected automatically when relevant).

---

## Agent Roles

Role definition files live at the root of `.agents/`. Each file scopes the AI to a focused set of responsibilities.

| File | Role | Responsibilities |
|---|---|---|
| `api-engineer.md` | API Engineer | REST endpoint design, request validation, response shaping, versioning |
| `backend-architect.md` | Backend Architect | System design, service boundaries, data flow, scalability decisions |
| `code-style.md` | Code Style Guide | Formatting conventions, naming rules, import ordering, file structure |
| `dashboard-engineer.md` | Dashboard Engineer | Admin dashboard APIs — metrics, pagination, filters, job management, audit trails |
| `database-engineer.md` | Database Engineer | Prisma schema design, migrations, indexes, query optimisation, data integrity |
| `project-context.md` | Project Context | High-level system overview, business domain, user flows, and architecture decisions |
| `qa-engineer.md` | QA Engineer | Testing strategies, coverage expectations, edge cases, error path verification |
| `security-engineer.md` | Security Engineer | Auth flows, input validation, secrets management, CORS, rate limiting, audit logging |
| `worker-engineer.md` | Worker Engineer | Background job design, cron scheduling, retry logic, idempotency, dead-letter queues |

---

## Skills

Skills live in `.agents/skills/` and are injected automatically when the AI detects relevant context. Unlike role files, skills provide encyclopaedic reference knowledge rather than a persona.

### 1. Supabase (`.agents/skills/supabase/`)

Deep knowledge of the Supabase ecosystem.

- **Triggers for:** Any task involving Supabase products — Database, Auth, Edge Functions, Realtime, Storage, Vectors, Cron, Queues
- **Covers:** `supabase-js` and `@supabase/ssr` integrations; auth patterns (login, logout, sessions, JWT, cookies, RLS); Supabase CLI and MCP server; schema changes and migrations; Postgres extensions (`pg_graphql`, `pg_cron`, `pg_vector`)

### 2. Supabase Postgres Best Practices (`.agents/skills/supabase-postgres-best-practices/`)

Advanced Postgres performance optimisation derived from Supabase engineering standards. Contains 44 reference files across 8 categories.

- **Triggers for:** Writing, reviewing, or optimising Postgres queries, schema designs, or database configurations
- **Categories:** Query Performance · Connection Management · Security · Schema Design · Locking Strategies · Data Access Patterns · Monitoring · Advanced Features

### 3. Prisma Standards (`.agents/skills/prisma-standards.md`)

Best practices for Prisma ORM in this project (Prisma 7 with `@prisma/adapter-pg`).

- **Triggers for:** Modifying `prisma/schema.prisma`, writing service-layer queries, planning migrations
- **Covers:** Schema design, relation definitions, indexes, composite keys, migration workflow, efficient query patterns, N+1 prevention, raw SQL via `$queryRaw`

### 4. Express Standards (`.agents/skills/express-standards.md`)

Patterns for this project's Express 5 application.

- **Triggers for:** Creating or modifying routes, controllers, middleware, or server setup
- **Covers:** Express 5 async error propagation, route organisation (`routes/ → controllers/ → services/`), middleware ordering, `next(err)` pattern, response utilities, rate limiting

### 5. Security Standards (`.agents/skills/security-standards.md`)

Security practices enforced throughout this codebase.

- **Triggers for:** Any code touching authentication, user input, external APIs, or secrets
- **Covers:** JWT auth, bcrypt hashing, HttpOnly cookies, role-based access, Zod input validation, helmet, CORS origin whitelist, rate limiting, audit logging for all mutations

### 6. Worker Standards (`.agents/skills/worker-standards.md`)

Patterns for background worker development in this project.

- **Triggers for:** Modifying workers in `src/workers/`, adding new background jobs, changing cron schedules
- **Covers:** `node-cron` scheduling, idempotency checks, batch processing (max 10 per tick), retry logic (3 attempts → dead-letter), env-flag toggles, IMAP connection lifecycle, FulfillmentLog on every attempt

---

## Usage

When asking an AI assistant to work on this repository:

- **Role files:** Point the assistant at the relevant role for focused work — e.g. *"act as the worker-engineer"* when adding a background job
- **Skills:** Picked up automatically based on file context — the assistant applies Prisma, security, worker, and Supabase knowledge when it detects relevant files or tasks
- **Explicit override:** Reference a skill directly if needed — e.g. *"follow the security-standards skill when handling this input"*

See [skills.md](./skills.md) for a full index of available skills with trigger conditions and coverage details.
