# Security Engineer Agent

Requirements:

JWT Authentication

Role-based access

Admin roles:

SUPER_ADMIN
ADMIN
SUPPORT

Protect:

/admin/*

Use:

Helmet
Rate limiting
CORS restrictions

JWT stored in:

HttpOnly cookies

Never:

Store tokens in localStorage.

Validate:

Environment variables at startup.

All admin actions:

Create audit logs.