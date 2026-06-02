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

## Usage

When requesting AI assistance for this backend system:
- The AI automatically detects the `.agents` folder and its included skills.
- It will intelligently apply Supabase and PostgreSQL best practices when you ask it to create new database models in `prisma/schema.prisma` or write complex queries in the `services/` directory.
- You can refer the agent to these skills explicitly if you want to ensure it optimizes a specific database query or Supabase integration.
