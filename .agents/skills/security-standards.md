# Security Standards

Security practices enforced throughout this codebase. Apply these whenever writing code that touches authentication, user input, external APIs, or secrets.

---

## Authentication — JWT + HttpOnly Cookie

JWTs are signed with `JWT_SECRET` and stored in an **HttpOnly cookie** named `admin_auth_token`. This prevents JavaScript access to the token and mitigates XSS-based token theft.

```js
// Signing — src/utils/jwt.js
import jwt from 'jsonwebtoken'

export const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET)

// Setting the cookie after login
res.cookie('admin_auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
})
```

---

## Token Extraction — Auth Middleware

`src/middleware/auth.middleware.js` reads the token from the cookie first, then falls back to the `Authorization: Bearer` header. This supports both browser sessions and API clients.

```js
const token =
  req.cookies?.admin_auth_token ??
  req.headers.authorization?.replace('Bearer ', '')

if (!token) throw new UnauthorizedError('No token provided')

req.user = verifyToken(token)
```

---

## Password Hashing

Always hash passwords with bcrypt via `src/utils/password.js`. Never store plaintext passwords or use reversible encoding.

```js
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS)
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash)
```

---

## Role-Based Access Control

Roles follow a strict hierarchy: `SUPPORT < ADMIN < SUPER_ADMIN`.

`src/middleware/role.middleware.js` enforces minimum role requirements on protected routes:

```js
export const roleMiddleware = (requiredRole) => (req, res, next) => {
  const hierarchy = { SUPPORT: 1, ADMIN: 2, SUPER_ADMIN: 3 }
  if (hierarchy[req.user?.role] < hierarchy[requiredRole]) {
    throw new ForbiddenError('Insufficient permissions')
  }
  next()
}
```

Apply `authMiddleware` first, then `roleMiddleware`:

```js
router.delete('/users/:id', authMiddleware, roleMiddleware('SUPER_ADMIN'), controller.deleteUser)
```

---

## Input Validation — Zod

All external input (request body, query params, route params) must be validated with Zod **at the route boundary** before reaching service or database code.

```js
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  xmAccountId: z.string().min(1).max(50),
})

const parsed = schema.safeParse(req.body)
if (!parsed.success) {
  return error(res, parsed.error.errors[0].message, 400)
}
```

**Never use** `req.body.field` directly in a service or database query without prior validation.

---

## Security Headers — Helmet

`helmet()` is applied globally in `src/app.js` with default settings. This sets:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Strict-Transport-Security` (in production)
- `X-XSS-Protection`

Do not remove or selectively disable helmet defaults without a documented reason.

---

## CORS

CORS is restricted to the frontend origin defined in the `FRONTEND_URL` environment variable:

```js
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}))
```

`credentials: true` is required to allow the browser to send the HttpOnly cookie cross-origin.

**Never set `origin: '*'`** — it disables cookie-based auth and opens the API to arbitrary origins.

---

## Secrets

| Rule | Enforcement |
|---|---|
| All secrets live in `.env` only | `.gitignore` includes `.env` |
| Never log secrets | No `console.log(process.env.*)` in committed code |
| Never hardcode credentials | Lint + code review |
| Rotate secrets via env var update | No secret rotation logic in application code |

Secrets used by this project: `JWT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `WHOP_API_KEY`, `WHOP_PLAN_ID`, `AFFILIATE_CODE`, `AFFILIATE_LINK`.

---

## Rate Limiting

All public API routes are rate-limited via `src/middleware/rate-limit.middleware.js` (100 req / 15 min per IP). See [[express-standards]] for middleware ordering.

Rate limiting requires `app.set('trust proxy', 1)` to function correctly behind Railway's reverse proxy — without it, all requests appear to come from the same proxy IP and rate limiting becomes ineffective.

---

## Audit Logging

Every admin mutation (create, update, delete) must write a record to `audit_logs` via `src/services/audit.service.js`:

```js
await auditService.log({
  adminId: req.user.id,
  action: 'DELETE_USER',
  targetId: req.params.id,
  metadata: { reason: req.body.reason },
})
```

Audit logs must never be deleted or modified. They are append-only and provide the compliance trail for all admin actions.

---

## SQL Injection Prevention

Prisma parameterises all queries by default. When using raw SQL:

```js
// Safe — tagged template literal (Prisma parameterises $1, $2 automatically)
const rows = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`

// UNSAFE — never do this
const rows = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`)
```

See [[prisma-standards]] for full raw query guidance.
