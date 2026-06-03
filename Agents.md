# AI Agents Configuration

This project integrates with AI agents to assist in development, maintenance, and optimization. The configuration and capabilities for these agents are stored in the `.agents` directory.

## Available Agent Skills

The agents equipped to work on this repository have access to the following specialized skills, located in `.agents/skills/`:

### 1. Supabase (`.agents/skills/supabase`)
Provides the agent with deep knowledge of the Supabase ecosystem. 
- **Triggers for**: Any tasks involving Supabase products (Database, Auth, Edge Functions, Realtime, Storage, etc.).
- **Capabilities**: Assists with client libraries (`supabase-js`, `@supabase/ssr`), SSR integrations, auth issues (RLS, JWTs), schema changes, migrations, and utilizing Postgres extensions.

### 2. Supabase Postgres Best Practices (`.agents/skills/supabase-postgres-best-practices`)
Equips the agent with advanced Postgres performance optimization techniques derived from Supabase best practices.
- **Triggers for**: Writing, reviewing, or optimizing Postgres queries, schema designs, or database configurations.
- **Capabilities**: Ensures the database remains performant, secure, and adheres to the best standards for scaling on Supabase.

### 3. Code Style (`.agents/skills/code-style.md`)
Defines consistent code formatting, naming conventions, and structural patterns across the codebase.
- **Triggers for**: Writing or reviewing any code files (JavaScript, TypeScript, etc.).
- **Capabilities**: Applies project‑specific linting rules, indentation, brace styles, and naming conventions to maintain readability and uniformity.

### 4. Documentation Style (`.agents/skills/documentation-style.md`)
Establishes guidelines for writing clear, maintainable documentation (READMEs, inline comments, API docs).
- **Triggers for**: Creating or updating documentation files, code comments, or user‑facing explanations.
- **Capabilities**: Ensures consistent formatting, tone, and structure, making documentation easy to navigate and update.

### 5. Prisma Standards (`.agents/skills/prisma-standards.md`)
Provides best practices for using Prisma ORM, including schema design, migrations, and query optimization.
- **Triggers for**: Modifying `prisma/schema.prisma`, writing database queries, or planning migrations.
- **Capabilities**: Guides the agent on using relation fields, indexes, composite keys, and efficient query patterns (e.g., `include`, `select`, raw SQL when needed).

### 6. Express Standards (`.agents/skills/express-standards.md`)
Defines patterns for building robust Express.js applications: middleware, routing, error handling, and project structure.
- **Triggers for**: Creating or modifying Express routes, middleware, controllers, or server setup.
- **Capabilities**: Promotes consistent API design, proper use of `next()` for errors, modular route organization, and security middleware (helmet, cors, rate limiting).

### 7. Next.js Standards (`.agents/skills/nextjs-standards.md`)
Covers Next.js specific patterns: App Router, API routes, server components, client components, and static/edge rendering.
- **Triggers for**: Working on Next.js pages, layouts, API endpoints, or data fetching strategies.
- **Capabilities**: Guides the agent on when to use server vs client components, optimal caching (ISR/SSG), and performance‑friendly dynamic imports.

### 8. Security Standards (`.agents/skills/security-standards.md`)
Enforces security best practices to protect against common vulnerabilities (injection, XSS, CSRF, broken auth, etc.).
- **Triggers for**: Code that handles authentication, user input, database queries, external APIs, or secrets.
- **Capabilities**: Reminds the agent to validate/sanitize inputs, use parameterized queries or Prisma’s built‑in protections, implement proper CORS, and store secrets via environment variables.

### 9. Testing Standards (`.agents/skills/testing-standards.md`)
Defines testing approaches, tooling, and coverage expectations (unit, integration, e2e).
- **Triggers for**: Writing or updating tests, test utilities, or CI pipelines.
- **Capabilities**: Encourages the agent to write meaningful assertions, mock external services appropriately, and maintain a balanced test pyramid with tools like Jest, Supertest, or Playwright.

## Usage

When requesting AI assistance for this backend system:
- The AI automatically detects the `.agents` folder and its included skills.
- It will intelligently apply Supabase, PostgreSQL, and all the above coding standards when you ask it to create new database models in `prisma/schema.prisma`, write business logic in `services/`, or implement API routes.
- You can refer the agent to these skills explicitly if you want to ensure it follows a particular standard (e.g., “follow the Security Standards when validating user input”).