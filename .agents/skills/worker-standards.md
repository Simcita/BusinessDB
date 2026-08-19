# Worker Standards

Patterns for background worker development in this project. Apply these whenever modifying workers in `src/workers/`, adding new background jobs, or changing cron schedules.

---

## Scheduling

All workers are scheduled with `node-cron` inside `src/server.js`:

```js
import cron from 'node-cron'

const schedule = process.env.POLL_CRON_SCHEDULE || '*/15 * * * *'

if (process.env.DISABLE_EMAIL_POLLING !== 'true') {
  cron.schedule(schedule, () => gmailWorker.run())
}

if (process.env.DISABLE_JOB_PROCESSING !== 'true') {
  cron.schedule(schedule, () => verificationWorker.run())
  cron.schedule(schedule, () => fulfillmentWorker.run())
}
```

**Default schedule:** `*/15 * * * *` (every 15 minutes).

**Env-flag toggles** allow workers to be disabled without redeployment:
- `DISABLE_EMAIL_POLLING=true` — disables the Gmail worker
- `DISABLE_JOB_PROCESSING=true` — disables the verification and fulfillment workers
- `POLL_CRON_SCHEDULE` — overrides the default 15-minute schedule (any valid cron expression)

---

## Worker Structure

Each worker exports a single `run()` function:

```js
// src/workers/example.worker.js
import prisma from '../config/database.js'
import logger from '../utils/logger.js'

export const run = async () => {
  logger.info('[ExampleWorker] tick started')
  try {
    await processItems()
    logger.info('[ExampleWorker] tick completed')
  } catch (err) {
    logger.error('[ExampleWorker] tick failed', { error: err.message })
  }
}
```

Workers must not throw — catch all errors internally so one failing tick does not crash the server process.

---

## Idempotency

Every worker tick must be safe to re-run. If the same email, account, or job is encountered twice, the second run must be a no-op.

**Gmail worker:**
- Stars each email after parsing (`\Flagged`) to mark it as processed
- On the next tick, only fetches emails that are unseen **and** unflagged

**Verification worker:**
- Uses `upsert` to avoid duplicate `XmApprovedAccount` records:
  ```js
  await prisma.xmApprovedAccount.upsert({
    where: { accountId },
    update: {},
    create: { accountId, emailSubject, senderEmail },
  })
  ```

**Fulfillment worker:**
- Sets job status to `PROCESSING` before doing any work:
  ```js
  await prisma.fulfillmentJob.update({
    where: { id: job.id },
    data: { jobStatus: 'PROCESSING' },
  })
  ```
  This prevents a second concurrent tick from picking up the same job.

---

## Batch Processing

The fulfillment worker processes a **maximum of 10 `PENDING` jobs per tick** to avoid long-running ticks that block the event loop or overlap with the next scheduled tick:

```js
const jobs = await prisma.fulfillmentJob.findMany({
  where: { jobStatus: 'PENDING' },
  orderBy: { createdAt: 'asc' },
  take: 10,
})
```

If more than 10 jobs are pending, the remainder are picked up on the next tick.

---

## Retry Logic

| State | Condition | Action |
|---|---|---|
| `PENDING` | Freshly created or reset after a failure | Picked up on next tick |
| `PROCESSING` | Claimed by a worker this tick | Skipped by other workers |
| `COMPLETED` | Delivered successfully | Never re-processed |
| `FAILED` | Exhausted max retries | Moved to dead-letter; never retried |

**On failure:**

```js
const MAX_RETRIES = 3

if (job.retryCount + 1 >= MAX_RETRIES) {
  // Dead-letter: move to failed_jobs table
  await prisma.$transaction(async (tx) => {
    await tx.fulfillmentJob.update({
      where: { id: job.id },
      data: { jobStatus: 'FAILED' },
    })
    await tx.failedJob.create({
      data: { jobId: job.id, reason: err.message },
    })
  })
} else {
  // Reset for next tick
  await prisma.fulfillmentJob.update({
    where: { id: job.id },
    data: {
      jobStatus: 'PENDING',
      retryCount: { increment: 1 },
    },
  })
}
```

---

## Logging Requirements

**Parser logs (`parser_logs`):** Written after every Gmail email parse attempt, regardless of success or failure. Captures the email subject, sender, extracted account ID, and outcome.

**Fulfillment logs (`fulfillment_logs`):** Written after every delivery attempt, regardless of outcome. Captures the job ID, Whop API response or error, and timestamp.

These logs exist for debugging and audit purposes. Do not skip writing them even when an earlier step fails — partial log data is better than no log data.

---

## IMAP Connection Lifecycle

The Gmail worker uses `ImapFlow` to connect to Gmail via IMAP:

```js
const client = new ImapFlow({ ... })

try {
  await client.connect()
  const lock = await client.getMailboxLock('INBOX')
  try {
    // Fetch and process emails
    for await (const message of client.fetch('1:*', { ... })) {
      // parse, star, log
    }
  } finally {
    lock.release()
  }
} finally {
  await client.logout()
}
```

**Rules:**
- Always release the mailbox lock in a `finally` block
- Always call `client.logout()` in an outer `finally` block
- Never leave an IMAP connection open between ticks
- If `GMAIL_APP_PASSWORD` is not set in env, the worker logs a warning and exits the tick early — it does not crash

---

## FulfillmentLog Pattern

Every delivery attempt must be recorded, even failures. Use a single `create` call after each attempt:

```js
await prisma.fulfillmentLog.create({
  data: {
    jobId: job.id,
    attempt: job.retryCount + 1,
    status: delivered ? 'SUCCESS' : 'FAILED',
    response: JSON.stringify(apiResponse ?? error?.message),
  },
})
```

This provides a full history of delivery attempts per job, which is essential for debugging Whop API issues.
