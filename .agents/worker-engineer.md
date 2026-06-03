# Worker Engineer Agent

Responsible for:

Gmail Worker
Fulfillment Worker
Metrics Worker

Requirements:

Workers must be idempotent.

Running worker twice must not duplicate data.

Use:

ON CONFLICT DO NOTHING

Design retries.

Maximum retries:

3

After retry limit:

Move to failed_jobs.

All worker actions:

Create audit log.