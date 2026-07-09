# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (eslint-config-next)
npm test             # Run all Vitest tests once
npm run test:watch   # Vitest in watch mode

# Run a single test file / filter by name
npx vitest run src/__tests__/products.test.ts
npx vitest run -t "returns 200"

# Prisma
npx prisma migrate dev --name <name>   # Create + apply a migration (dev)
npx prisma migrate deploy              # Apply pending migrations (CI/test)
npx prisma generate                    # Regenerate the client after schema edits
```

Local Postgres for development comes from `docker-compose.yml` (`docker compose up -d`). `DATABASE_URL` is read from `.env`. Note the datasource in `prisma/schema.prisma` has **no `url`** — the connection string is supplied at runtime via `prisma.config.ts` / the `pg` adapter in [src/app/lib/prisma.ts](src/app/lib/prisma.ts).

## Architecture

This is a Next.js (App Router) CRUD API over two entities, `Product` and `Category`, built as a strict **route → service → repository** layering. Each layer has a single responsibility and the dependency arrow only points downward:

- **Route handlers** ([src/app/api/*/route.ts](src/app/api/)) — the only HTTP-aware layer. They parse the request (`parseBody`, `parseId` from [src/lib/http.ts](src/lib/http.ts)), call a service, and wrap everything in `try/catch` that funnels to `handleError`. They never touch Prisma or business rules directly.
- **Services** ([src/services/](src/services/)) — business logic and domain invariants (e.g. referenced category must exist; product name must be unique within its category). Services throw **domain errors**, never `Response` objects.
- **Repositories** ([src/repositories/](src/repositories/)) — the only layer that touches Prisma. Pure data access, no business rules, no HTTP.

Each layer is an exported singleton object literal (e.g. `productService`, `productRepository`), not a class.

### Error handling flow

Errors are the seam between layers. [src/lib/errors.ts](src/lib/errors.ts) defines an HTTP-agnostic hierarchy — `AppError` carries a `status`, with `ValidationError` (400), `NotFoundError` (404), `ConflictError` (409). Services throw these; `handleError` in [src/lib/http.ts](src/lib/http.ts) is the single place that maps a thrown error to a `Response`. `ValidationError` may carry flattened Zod issues under `details`, returned as `{ errors }`; other `AppError`s return `{ error: message }`; anything else is logged and becomes a 500. When adding a new failure mode, throw the appropriate domain error from the service rather than returning a response early.

### Validation

Zod schemas live in [src/lib/validations/](src/lib/validations/). POST uses the full schema; PUT uses `Schema.partial()` (all fields optional), and `parseBody(..., { rejectEmpty: true })` guards against empty patch bodies. Inferred types (e.g. `ProductInput`, `ProductUpdateInput`) flow down into service/repository signatures.

### Pagination

List endpoints (`GET /api/products`, `GET /api/categories`) return an envelope `{ data, total, limit, offset }`, driven by `?limit=` (default 20, max 100) and `?offset=`, parsed by `parsePagination` in [src/lib/http.ts](src/lib/http.ts). Repositories order by a stable key so pages don't skip/repeat.

### Data model

`Product` has a required FK `categoryId` → `Category` and a `views` counter (`Int @default(0)`). Product name is unique *per category* (not globally), but this is enforced **only in the service layer** (`existsByNameInCategory` in create/update) — there is intentionally no DB unique constraint, so it carries a small TOCTOU race under concurrency. `Category.name` is globally unique (DB constraint). Because of the FK, deletion and cleanup order matters: **products before categories**.

## Deferred security work (required before any real deployment)

Deliberately skipped during the 2026-07 hardening pass; the API is currently safe only because it runs locally:

1. **Authentication** — all write endpoints (POST/PUT/DELETE) are open to anyone. Planned approach: single API key in `.env`, checked via a `requireAuth(request)` helper throwing a new `UnauthorizedError(401)` from [src/lib/errors.ts](src/lib/errors.ts); GET stays public.
2. **Rate limiting** — nothing stops request flooding, and the view counter (a DB write on every single-product GET) makes this cheap to abuse. Planned approach: small in-memory per-IP limiter returning 429 (Redis only if the app ever runs multi-instance).

Also known and accepted: product name uniqueness is service-layer-only (TOCTOU race, see Data model), and `price` is stored as `Float` — switch to `Decimal`/integer cents if money math ever matters.

## Testing

Tests are integration tests ([src/__tests__/](src/__tests__/)) that import route handlers directly and invoke them with `new Request(...)` — there is no HTTP server in the loop. They run against a **real Postgres** spun up via Testcontainers, not mocks:

- [vitest.global-setup.ts](vitest.global-setup.ts) starts one `postgres:17` container for the whole run, sets `DATABASE_URL`, and runs `prisma migrate deploy`.
- [vitest.setup.ts](vitest.setup.ts) truncates tables `beforeEach` (products then categories, per the FK order).
- `fileParallelism: false` — test files share the one DB and must run serially.

Docker must be running, and the first run pulls the image (timeouts are set to 60s). Tests that create products must first create a category to satisfy the FK.
