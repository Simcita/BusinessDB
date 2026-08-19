# Express Standards

Patterns for this project's Express 5 application. Apply these whenever creating or modifying routes, controllers, middleware, or the server setup.

---

## Layer Responsibilities

```
src/routes/        → Mount middleware, call controller methods. No business logic.
src/controllers/   → Validate input, call one service, return response.
src/services/      → All business logic and database access via Prisma.
src/middleware/    → Cross-cutting concerns (auth, roles, rate limiting, error handling).
```

**Never put Prisma queries in controllers.** Controllers call services; services own the data layer.

---

## Middleware Order

Defined in `src/app.js`:

```
helmet()
  → cors()
    → express.json()
      → morgan()
        → rateLimitMiddleware (public routes only)
          → authMiddleware (protected routes)
            → roleMiddleware (admin routes)
              → route handler
                → errorMiddleware (catch-all)
```

Do not add middleware outside this ordering unless you have a compelling reason — order determines behaviour for every request.

---

## Express 5 Async Error Handling

Express 5 catches rejected promises from `async` route handlers automatically. **Do not wrap route handlers in try/catch.** Throw or let errors bubble — the global error handler catches them.

```js
// Good — Express 5 handles the rejected promise
router.get('/submissions/:id', async (req, res) => {
  const submission = await submissionService.findById(req.params.id)
  if (!submission) throw new NotFoundError('Submission not found')
  success(res, submission)
})

// Bad — unnecessary boilerplate in Express 5
router.get('/submissions/:id', async (req, res, next) => {
  try {
    const submission = await submissionService.findById(req.params.id)
    success(res, submission)
  } catch (err) {
    next(err)
  }
})
```

The global error handler lives at `src/middleware/error.middleware.js` — it maps error types to HTTP status codes and formats the response.

---

## Response Shape

Always use the utilities in `src/utils/response.js`. Never call `res.json()` or `res.status().json()` directly in controllers.

```js
import { success, error } from '../utils/response.js'

// 200 with data
success(res, { submission })

// 201 with data
success(res, { id }, 201)

// 400 validation error
error(res, 'Email is required', 400)

// 404
error(res, 'Submission not found', 404)
```

The `success` helper always wraps data in `{ success: true, data: ... }`.
The `error` helper always returns `{ success: false, message: ... }`.

---

## Input Validation

Validate at the route boundary using Zod schemas — before any business logic runs.

```js
// src/validators/submission.validators.js
import { z } from 'zod'

export const createSubmissionSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  xmAccountId: z.string().min(1),
})

// In the route handler
const parsed = createSubmissionSchema.safeParse(req.body)
if (!parsed.success) {
  return error(res, parsed.error.errors[0].message, 400)
}
```

Public input validators live in `src/utils/validation.js`. Admin-specific validators live in `src/validators/admin.validators.js`.

---

## Route Organisation

```js
// src/routes/submissions.routes.js
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { roleMiddleware } from '../middleware/role.middleware.js'
import * as submissionController from '../controllers/submission.controller.js'

const router = Router()

router.get('/', authMiddleware, roleMiddleware('ADMIN'), submissionController.list)
router.post('/', submissionController.create)

export default router
```

- Each resource gets its own router file
- Mount routers in `src/app.js` under a versioned prefix (`/api/`)
- Keep route files thin — middleware refs and controller calls only

---

## Rate Limiting

Applied via `src/middleware/rate-limit.middleware.js`:

```js
import rateLimit from 'express-rate-limit'

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,                    // requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
})
```

**Rules:**
- Apply to all public API routes by default
- Health check (`/health`) and admin routes are exempt
- Because this app runs behind Railway's reverse proxy, `trust proxy` must be set:
  ```js
  app.set('trust proxy', 1)
  ```
  This ensures `req.ip` resolves the real client IP, not the proxy's.

---

## Error Classes

Throw named error classes to let the error middleware map to the right HTTP status:

```js
// src/utils/errors.js
export class NotFoundError extends Error { constructor(msg) { super(msg); this.statusCode = 404 } }
export class ValidationError extends Error { constructor(msg) { super(msg); this.statusCode = 400 } }
export class UnauthorizedError extends Error { constructor(msg) { super(msg); this.statusCode = 401 } }
export class ForbiddenError extends Error { constructor(msg) { super(msg); this.statusCode = 403 } }
```

The global error handler reads `err.statusCode` and falls back to 500 for unknown errors.
