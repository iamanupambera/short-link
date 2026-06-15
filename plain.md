# ShortLink v1 - Product Development Plan

## Current Build And Deployment Summary

Last checked: 2026-06-15.

### What Is Built

- NestJS backend project is set up and compiles successfully.
- Auth module exists: register, login, refresh token, logout, email verification, forgot password, reset password, get profile, update profile, and profile picture upload.
- Link module exists: create short URL, custom alias, list links, search/filter links, get one link, update link, delete link, expiration, inactive status, and password hashing for protected links.
- Redirect module exists: short-code redirect, Redis cache lookup, database fallback, expiration check, inactive-link check, password prompt, and async analytics queue push.
- Analytics module exists: total clicks, unique visitors, device stats, browser stats, country stats, referrer stats, dashboard totals, clicks over time, and top links.
- QR module exists: QR code generation and optional PNG download.
- Security basics exist: JWT auth guard, refresh-token cookie rotation, Redis-backed rate limiting, DTO validation, Helmet, CORS, password hashing, IP hashing for analytics, and URL validation blocking localhost/private IP URLs.
- Deployment basics exist: Dockerfile, Docker Compose for app, MySQL, Redis, Prometheus, and Grafana.
- Health and monitoring exist: `/health` and `/metrics`.

### Verified Status

- `npm.cmd run build`: passed.
- `npm.cmd test -- --runInBand`: passed, 2 unit test suites.
- `npm.cmd run test:e2e -- --runInBand`: passed, 1 e2e test.
- `npm.cmd run lint`: failed with 4 lint errors in `src/config/winston.config.ts`.

### What Is Remaining Before Launch

- Fix lint errors in `src/config/winston.config.ts`.
- Add real integration/e2e tests for auth, links, redirects, analytics, QR, refresh-token rotation, password reset, and permission checks.
- Add a deployment startup flow for migrations and seed data. Docker Compose starts services, but it does not automatically run migrations before the app starts.
- Add production environment validation so missing or weak secrets fail fast.
- Confirm production values for `CLIENT_URL`, `API_URL`, JWT secrets, Redis password, DB credentials, mail settings, and `IP_SALT_SECRET`.
- Add backup/restore strategy for MySQL.
- Add production logs/alerting around errors, queue backlog, redirect latency, DB health, Redis health, and HTTP 5xx rates.
- Load test redirect latency and rate limiting against the target: 1M redirects/month and less than 100ms redirect latency.
- Add frontend/client app if the product needs a user dashboard UI. The current repo is backend/API focused.

### Security Issues Remaining

- Password-protected redirects currently submit password via query string: `?password=...`. This can leak into browser history, logs, referrer headers, and monitoring tools. Use POST or a short-lived unlock token instead.
- Uploaded profile images are written to local storage without strong file type, file size, extension, or image-content validation visible in the controller/service. Add MIME sniffing, size limits, allowed extensions, and malware/image validation.
- Password policy only checks minimum length. Add stronger password validation and consider breached-password checks.
- Forgot-password and resend-verification endpoints can reveal whether an email exists. Consider generic responses and strict rate limits.
- Refresh-token cookie uses `secure: true`, which is good for HTTPS production, but can break local HTTP testing unless environment-specific cookie settings are handled.
- Helmet CSP allows `'unsafe-inline'`, and the redirect pages load Google Fonts. Tighten CSP for production if possible.
- `app.set('trust proxy', 'loopback')` may not match production proxy topology. If deployed behind Nginx, Cloudflare, ALB, or another proxy, configure this carefully or IP-based rate limiting and analytics can be wrong.
- Docker Compose exposes MySQL and Redis ports. For production, avoid public exposure and restrict them to a private network.
- Default super-admin seed has a fallback password if `SUPER_ADMIN_PASSWORD` is missing. Production should require an explicit strong password and fail otherwise.
- `.env` exists locally. Ensure it is never committed or copied into images/logs.

### Things That May Break

- Lint currently fails, so CI/CD should fail if lint is required.
- Docker deployment can start the app before migrations are applied, causing database table/column errors.
- The app depends on Redis for sessions, rate limiting, cache, and analytics queue. If Redis is down, login/session behavior, redirects, rate limits, and analytics can degrade or fail.
- The original plan says UUID IDs, but implementation uses integer IDs. This is not automatically wrong, but it differs from the design.
- Local file uploads may be lost on container rebuild/redeploy unless the upload directory is mounted as a persistent volume.
- Password-protected links use GET form submission, so password leaks are possible and users may accidentally share URLs containing the password.
- There is very little test coverage. Many important flows can regress without tests catching them.

### Launch Readiness

Current status: backend MVP is partially feature-complete and buildable, but not yet production-ready.

Recommended next steps:

1. Fix lint.
2. Fix password-protected redirect password handling.
3. Add upload validation.
4. Add migration startup/deployment process.
5. Add integration tests for core launch flows.
6. Run Docker Compose end-to-end with a clean database.
7. Load test redirect and analytics paths.

## Product Overview

**Product Name:** ShortLink

**Tagline:** Shorten. Share. Track.

**Goal:**
Build a scalable URL shortening platform that allows users to create, manage, and analyze shortened URLs.

---

# Version 1 Scope (Launch MVP)

## User Features

### Authentication

- Register
- Login
- Refresh Token
- Forgot Password
- Reset Password
- Email Verification

### Link Management

- Create Short URL
- Custom Alias
- Edit URL
- Delete URL
- Link Expiration
- Password Protected Links
- URL Validation

### Analytics

- Total Clicks
- Unique Visitors
- Device Analytics
- Browser Analytics
- Country Analytics
- Referrer Analytics

### QR Code

- Generate QR Code
- Download QR Code

### User Dashboard

- Link Listing
- Search Links
- Filter Links
- Analytics Overview

### Security

- Rate Limiting
- Abuse Detection
- Input Validation

---

# Non-Functional Requirements

## Performance

Redirect latency:

- < 100ms

API response:

- < 300ms

Analytics processing:

- Asynchronous

---

## Scalability

Target:

- 100K URLs
- 1M Redirects / Month

Architecture should support future scaling without major redesign.

---

# Tech Stack

## Backend

- Node.js
- NestJS
- TypeScript

## Database

- MySQL

## Cache

- Redis

## Queue

- Redis

## ORM

- Typeorm

## Authentication

- JWT
- Refresh Tokens

## Storage

- AWS S3 (future)
- Local Storage (v1)

## Deployment

- Docker
- Docker Compose

---

# System Architecture

Client
↓
API Gateway
↓
Auth Module
↓
Link Module
↓
Analytics Module
↓
MySQL

Redis
↓
Cache Layer

redis
↓
Analytics Processing

---

# Database Design

## users

| Field      | Type     |
| ---------- | -------- |
| id         | integer  |
| email      | varchar  |
| password   | varchar  |
| verified   | boolean  |
| created_at | datetime |

---

## links

| Field         | Type     |
| ------------- | -------- |
| id            | integer  |
| user_id       | integer  |
| short_code    | varchar  |
| original_url  | text     |
| custom_alias  | varchar  |
| password_hash | varchar  |
| expires_at    | datetime |
| status        | enum     |
| created_at    | datetime |

---

## clicks

| Field      | Type     |
| ---------- | -------- |
| id         | integer  |
| link_id    | integer  |
| ip_hash    | varchar  |
| country    | varchar  |
| browser    | varchar  |
| device     | varchar  |
| referrer   | varchar  |
| created_at | datetime |

---

# Modules

## Auth Module

Responsibilities:

- Register
- Login
- Refresh Token
- Email Verification
- Password Reset

Endpoints:

POST /auth/register

POST /auth/login

POST /auth/refresh

POST /auth/forgot-password

POST /auth/reset-password

---

## Link Module

Responsibilities:

- Create URL
- Update URL
- Delete URL
- Get URL
- Redirect

Endpoints:

POST /links

GET /links

GET /links/:id

PATCH /links/:id

DELETE /links/:id

GET /:shortCode

---

## Analytics Module

Responsibilities:

- Click Tracking
- Statistics Aggregation
- Reporting

Endpoints:

GET /analytics/:linkId

GET /analytics/dashboard

---

## QR Module

Responsibilities:

- Generate QR
- Download QR

Endpoints:

GET /links/:id/qrcode

---

# Redirect Flow

User Hits URL

↓

Redis Lookup

↓ Found

Redirect Immediately

↓ Not Found

MySQL Lookup

↓

Store In Redis

↓

Redirect

---

# Analytics Flow

User Clicks Link

↓

Redirect Immediately

↓

Publish Event To Redis

↓

Consumer Processes Event

↓

Store Analytics

↓

Update Aggregates

This prevents redirect performance degradation.

---

# Redis Strategy

## Cache Short URLs

Key:

short:{code}

Example:

short:abc123

TTL:

24 Hours

---

## Rate Limiting

Key:

rate_limit:user_id

Window:

100 requests / minute

---

# Security

## Password Protected URLs

Store:

bcrypt hash

Never store raw passwords.

---

## Abuse Prevention

- URL validation
- Block malformed URLs
- Rate limiting
- Request throttling

---

# API Versioning

/api/v1

Future:

/api/v2

---

# Development Phases

## Phase 1 (Week 1)

Project Setup

Tasks:

- NestJS Setup
- Typeorm Setup
- MySQL Setup
- Docker Setup
- CI/CD Setup
- Environment Management

Deliverable:

Running backend application.

---

## Phase 2 (Week 2)

Authentication

Tasks:

- Registration
- Login
- Refresh Tokens
- Password Reset

Deliverable:

Complete auth system.

---

## Phase 3 (Week 3)

Link Management

Tasks:

- Create Links
- Custom Alias
- Update Links
- Delete Links
- Expiration Logic

Deliverable:

Functional URL shortener.

---

## Phase 4 (Week 4)

Redirect Engine

Tasks:

- Redis Cache
- Fast Redirect
- Expiration Validation

Deliverable:

Production-ready redirects.

---

## Phase 5 (Week 5)

Analytics

Tasks:

- Redis Integration
- Click Tracking
- Dashboard APIs

Deliverable:

Analytics system.

---

## Phase 6 (Week 6)

QR Code + Security

Tasks:

- QR Generation
- Password Protected URLs
- Rate Limiting
- Validation

Deliverable:

Feature complete MVP.

---

## Phase 7 (Week 7)

Testing & Optimization

Tasks:

- Unit Testing
- Integration Testing
- Load Testing
- Performance Tuning

Deliverable:

Release Candidate.

---

# Launch Checklist

- Authentication Complete
- Link Management Complete
- Redirect Engine Complete
- Analytics Complete
- QR Generation Complete
- Security Complete
- Dockerized Deployment
- Monitoring Enabled
- Backup Strategy Enabled

---

# Success Metrics

Month 1 Goals

- 100 Registered Users
- 10,000 Short URLs Created
- 100,000 Redirects
- 99.9% Redirect Availability

---

# Future Roadmap (v2)

- Custom Domains
- Team Workspaces
- Role Based Access
- Public API
- Bulk URL Import
- Webhooks
- AI Analytics
- Geo Routing
- A/B Testing
- Enterprise SSO
