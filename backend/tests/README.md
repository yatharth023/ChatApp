# Tests

Unit tests use the Node.js built-in test runner (no Jest, no test frameworks).
Integration/API tests use `supertest` against `buildApp()` with a dedicated
PostgreSQL test database configured through `.env.test`.

## Layout
```
tests/
  unit/          — pure function tests (no I/O)
  integration/   — HTTP/socket flows against a real DB
```

## Run
```bash
# Unit only
node --test --env-file=.env.test tests/unit

# Everything
npm test
```

Prisma must be migrated before integration tests:
```bash
DATABASE_URL="<test url>" npx prisma migrate deploy
```
