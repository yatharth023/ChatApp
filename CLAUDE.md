# Project Instructions

This repository contains a production-grade private messaging platform built using the PERN stack.

You are the lead engineer responsible for this codebase.

Your responsibility is to continuously improve, extend, and maintain the project while following modern software engineering principles.

Never optimize for speed of generation.

Always optimize for:

- Readability
- Maintainability
- Scalability
- Security
- Performance
- Separation of Concerns
- Developer Experience

---

# Engineering Philosophy

Write code exactly as if it will be maintained by a team of senior engineers for the next 10 years.

Never write quick fixes.

Never duplicate logic.

Prefer reusable abstractions.

Prefer composition over inheritance.

Never sacrifice maintainability for fewer lines of code.

Every architectural decision should be production-ready.

---

# Code Quality Rules

Always:

- use strict TypeScript-style typing where applicable (or JSDoc if JavaScript)
- write self-documenting code
- use meaningful variable names
- keep functions small
- keep files focused
- use descriptive folder names
- avoid deeply nested logic
- avoid code duplication
- extract reusable utilities
- write pure functions whenever possible

Never:

- use magic numbers
- leave TODO comments
- leave console.log statements
- leave unused imports
- leave commented-out code
- hardcode secrets
- hardcode URLs
- hardcode IDs

---

# Architecture Rules

Always maintain feature-based architecture.

Example:

backend/

controllers/

routes/

middleware/

services/

socket/

config/

utils/

validators/

repositories/

cron/

frontend/

components/

pages/

layouts/

hooks/

context/

services/

store/

utils/

types/

assets/

Never place unrelated logic in the same directory.

---

# Component Rules

React components should:

- remain under 250 lines whenever possible
- have one responsibility
- use hooks correctly
- avoid unnecessary re-renders
- memoize expensive operations
- clean up listeners in useEffect
- never perform API logic directly inside UI components

Business logic belongs inside hooks or services.

---

# Socket Rules

Socket logic must never be mixed with REST logic.

Socket events should be modular.

Every event should have:

- validation
- authentication
- authorization
- error handling
- logging

Socket handlers must never directly access the database.

Always use services.

Flow:

Socket

↓

Handler

↓

Service

↓

Repository

↓

Database

---

# Database Rules

Never write raw SQL unless absolutely necessary.

Use Prisma.

Always:

- use transactions when needed
- use indexes
- define foreign keys
- use cascading deletes appropriately
- validate input before queries

Never perform multiple independent database calls when a transaction is appropriate.

---

# Security Rules

Every feature must be designed assuming hostile users.

Always:

Validate every request.

Validate every socket payload.

Sanitize input.

Escape output.

Hash passwords using bcrypt.

Verify JWTs.

Use secure cookies.

Rate limit endpoints.

Use Helmet.

Use CORS correctly.

Protect against:

- SQL Injection
- XSS
- CSRF
- Replay attacks
- Brute force attacks

Never trust client input.

---

# Authentication

Authentication should support:

Access Tokens

Refresh Tokens

Rotation

Logout

Logout Everywhere

Socket Authentication

Automatic Refresh

Expired Session Handling

---

# Error Handling

Never silently ignore errors.

Return meaningful error messages.

Log internal errors.

Never expose stack traces to clients.

Always use centralized error middleware.

---

# Logging

Implement structured logging.

Every important event should be logged.

Examples:

User login

Failed login

Socket connection

Socket disconnect

Message sent

Message delivered

Upload completed

Blocked attempt

Expired message cleanup

Avoid excessive logging.

---

# Performance

Always optimize for scale.

Prefer:

Pagination

Indexes

Redis caching

Memoization

Connection pooling

Batch operations

Debounced events

Avoid:

N+1 queries

Repeated renders

Repeated API requests

Repeated socket emissions

---

# Redis Usage

Redis should be responsible for:

Presence

Socket mapping

Sessions

Rate limiting

Caching

Never store permanent data inside Redis.

---

# Messaging Rules

Every message must support:

Text

Media

Replies

Reactions

Delivery Status

Read Status

Encryption

Expiry

Edits

Deletion

Every state transition should be synchronized across connected clients.

---

# Presence

Presence should support:

Online

Offline

Last Seen

Multiple Devices

Redis should determine user availability.

Never rely solely on socket connection state.

---

# Typing Indicator

Typing events should:

Be debounced.

Auto-expire.

Never spam sockets.

Never persist in database.

---

# Media Upload

Uploads must:

Go directly to Cloudinary.

Never pass binary files through Socket.io.

Only secure URLs travel through sockets.

Validate MIME types.

Validate file size.

---

# Encryption

Messages should be encrypted before socket transmission.

Use Web Crypto API.

Server stores encrypted payload only.

Server must never decrypt messages.

---

# API Rules

REST endpoints should:

Validate requests

Return consistent JSON

Use proper HTTP status codes

Support pagination

Support filtering

Support searching

Avoid business logic in controllers.

---

# Folder Ownership

Controllers

Receive request.

Call service.

Return response.

Nothing else.

Services

Business logic.

Repositories

Database interaction.

Utilities

Reusable helper functions.

Middleware

Authentication.

Validation.

Authorization.

Configuration.

Socket

Realtime communication only.

---

# UI Principles

The application should feel similar to:

WhatsApp

Discord

Telegram

Signal

Use:

Modern spacing

Responsive layout

Dark mode

Smooth animations

Optimistic UI

Accessible design

Skeleton loading

Empty states

Loading indicators

Meaningful transitions

---

# State Management

Prefer:

React Context

React Query

Custom Hooks

Only introduce Zustand if global realtime state becomes difficult.

Avoid prop drilling.

---

# File Naming

Use:

camelCase for variables

PascalCase for components

kebab-case for folders

No abbreviations unless universally understood.

---

# Git Standards

Every logical feature should be isolated.

Suggested commit style:

feat:

fix:

refactor:

perf:

docs:

test:

chore:

---

# Testing

Every important feature should include tests.

Prefer:

Unit Tests

Integration Tests

Socket Tests

API Tests

Component Tests

Critical flows must always be tested.

---

# Documentation

Whenever creating a feature:

Update documentation.

Update README if necessary.

Explain architectural decisions.

Document environment variables.

Document APIs.

Document socket events.

---

# Before Writing Code

Always think through:

1. Is this scalable?
2. Is this secure?
3. Can this be reused?
4. Can this be tested?
5. Can this be maintained?
6. Is there a cleaner abstraction?

If the answer is no, redesign first.

---

# Working Style

Never generate hundreds of files blindly.

Instead:

Analyze the existing project.

Understand current architecture.

Extend existing abstractions.

Avoid rewriting working code.

Preserve consistency across the repository.

---

# Response Style

When implementing features:

1. Explain the design briefly.
2. Explain why the approach was chosen.
3. Generate complete code.
4. Ensure imports are correct.
5. Ensure the project compiles.
6. Never leave placeholders.
7. Never omit required files.

Always prefer production-quality engineering over rapid generation.

This repository should be treated as enterprise software, not a tutorial project.