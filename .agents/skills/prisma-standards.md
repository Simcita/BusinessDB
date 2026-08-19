# Prisma Standards

Standards for using Prisma 7 with `@prisma/adapter-pg` in this project. Apply these whenever modifying `prisma/schema.prisma`, writing service-layer database queries, or planning migrations.

---

## Setup & Configuration

This project uses the Prisma driver adapter pattern. The Prisma client is initialised once as a singleton in `src/config/database.js`:

```js
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
export default new PrismaClient({ adapter })
```

Never create a new `PrismaClient` instance outside of `src/config/database.js`.

---

## Schema Conventions

- **Model names:** PascalCase (`UserSubmission`). Prisma maps these to snake_case table names automatically via `@@map`.
- **Field names:** camelCase in schema, snake_case in the database.
- **Primary keys:** Always `id String @id @default(uuid())` — no integer auto-increment IDs.
- **Timestamps:** Every mutable model must have `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- **Enums:** Define enums in the schema, not as string literals in application code.
- **Soft delete:** Use `deletedAt DateTime?` — always filter `WHERE deletedAt IS NULL` in queries.

---

## Relations

```prisma
// One-to-many: always define both sides
model Campaign {
  id          String           @id @default(uuid())
  submissions UserSubmission[]
}

model UserSubmission {
  id         String    @id @default(uuid())
  campaignId String?
  campaign   Campaign? @relation(fields: [campaignId], references: [id])
}
```

- Optional FK (`String?`) → `@relation` with `onDelete: SetNull`
- Required FK (`String`) → `@relation` with `onDelete: Restrict` to prevent orphan records
- PostgreSQL does **not** auto-index FK columns — add `@@index([foreignKeyField])` explicitly

---

## Indexes

```prisma
model UserSubmission {
  // ...
  @@index([xmAccountId])         // primary lookup
  @@index([status])              // filter
  @@index([submittedAt])         // ordered pagination
  @@index([email])               // search
}
```

Add an index for every column used in:
- `WHERE` clauses (filters, lookups)
- `ORDER BY` clauses
- FK columns (not auto-indexed in PostgreSQL)
- Frequently searched text fields

---

## Query Patterns

### Always paginate list queries
```js
const results = await prisma.userSubmission.findMany({
  where: { deletedAt: null },
  orderBy: { submittedAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
})
```

### Prefer `select` over `include` when you don't need the full relation
```js
// Good — fetches only what is needed
const submission = await prisma.userSubmission.findUnique({
  where: { id },
  select: { id: true, name: true, email: true, status: true },
})

// Avoid — fetches entire related campaign object unnecessarily
const submission = await prisma.userSubmission.findUnique({
  where: { id },
  include: { campaign: true },
})
```

### Avoid N+1 — never query inside a loop
```js
// Bad
const jobs = await prisma.fulfillmentJob.findMany({ ... })
for (const job of jobs) {
  const sub = await prisma.userSubmission.findUnique({ where: { id: job.submissionId } })
}

// Good — use include or a single batched query
const jobs = await prisma.fulfillmentJob.findMany({
  include: { submission: true },
})
```

### Multi-step writes — use `$transaction`
```js
await prisma.$transaction(async (tx) => {
  const submission = await tx.userSubmission.update({ ... })
  await tx.fulfillmentJob.createMany({ ... })
})
```

### Raw SQL — only when Prisma cannot express the query
```js
// Always use tagged template literals — never string interpolation
const rows = await prisma.$queryRaw`
  SELECT * FROM user_submissions WHERE status = ${status}
`
```

---

## Migration Workflow

```bash
# Development — creates a new migration file and applies it
npx prisma migrate dev --name <descriptive_name>

# Production / CI — applies pending migrations only (no new files)
npm run db:migrate   # alias for: prisma migrate deploy

# After any schema change — regenerate the Prisma client
npm run db:generate  # alias for: prisma generate
```

**Rules:**
- Never edit migration SQL files after they have been applied to any environment
- Migration names must be descriptive (`add_campaign_soft_delete`, not `fix` or `update`)
- Run `prisma generate` any time you change `schema.prisma`, even without a migration

---

## Upsert Pattern (idempotent inserts)

Used heavily in workers to prevent duplicate records:

```js
await prisma.xmApprovedAccount.upsert({
  where: { accountId },
  update: {},           // no-op if exists
  create: { accountId, emailSubject, senderEmail },
})
```
