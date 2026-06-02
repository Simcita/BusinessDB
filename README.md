# Modern Trader - Backend System

This repository contains the backend services for the Modern Trader platform. Built with Node.js, Express, and Prisma, it handles user submissions, verification workflows, and automated fulfillments (Email & WhatsApp) via background workers.

## Tech Stack

- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma Client
- **Authentication**: JWT & bcrypt (Admin Auth), Supabase SSR/JS
- **Email Processing**: `imapflow` & `mailparser` (for Gmail IMAP integration)
- **Notifications**: Resend (Emails) & WhatsApp Service
- **Task Scheduling**: `node-cron`
- **Validation**: Zod

## Core Features

1. **User Submissions & Verification**
   - Users submit their details along with their XM Trading Account ID.
   - The system verifies these submissions against approved accounts.

2. **Automated Email Parsing**
   - A cron worker (`gmail.worker.js`) connects to an email inbox via IMAP.
   - Parses incoming approval emails from the broker to extract approved XM Account IDs automatically.

3. **Fulfillment Engine**
   - A background job system (`fulfillment.worker.js`) processes verified submissions.
   - Dispatches notifications via WhatsApp or Email based on the configured fulfillment type.
   - Retries failed jobs and logs all delivery statuses.

4. **Admin Dashboard APIs**
   - Complete admin management with role-based access control (Super Admin, Admin, Support).
   - Metrics tracking, parser logs, audit logs, and failed job management.

## Project Structure

```
├── .agents/               # AI Agent configurations and skills
├── prisma/                # Prisma schema and migrations
│   └── schema.prisma      # Database schema definition
├── src/
│   ├── config/            # Application configuration & env variables
│   ├── controllers/       # Route controllers (Admin, Health, Verification)
│   ├── middleware/        # Express middleware (Rate limiting, Auth)
│   ├── routes/            # API Route definitions
│   ├── services/          # Core business logic (Gmail, WhatsApp, Email, Metrics)
│   ├── utils/             # Helper utilities
│   ├── workers/           # Background jobs (Gmail parser, Fulfillment)
│   ├── app.js             # Express app setup
│   └── server.js          # Entry point
├── package.json           # Project metadata and dependencies
└── ...
```

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL Database (Supabase)
- Required API Keys (Resend, WhatsApp provider, Gmail IMAP credentials)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env` (use `.env.example` if available).

3. Run database migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Running the App

- **Development Mode**:
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```
