# Candidate Compliance Platform

A full-stack, multi-tenant candidate compliance platform built as a focused vertical slice of a regulated workforce SaaS platform.

The implementation prioritises tenant isolation, explicit authorisation, auditability, immutable compliance history, reliable asynchronous verification, and governed AI-assisted CV extraction.

## Implemented

- Multi-tenant PostgreSQL data model
- Candidate CRUD with pagination and filtering
- Compliance document CRUD and version history
- PostgreSQL Row-Level Security (RLS) with `FORCE ROW LEVEL SECURITY`
- Application-layer tenant checks
- JWT authentication
- Explicit permission checks per operation
- Problem Details error responses
- Versioned REST API under `/api/v1`
- Swagger/OpenAPI documentation
- Append-only audit ledger
- Database trigger preventing audit UPDATE/DELETE
- Right-to-Work verification using a transactional outbox and in-process poller
- Retry and terminal-failure handling
- Idempotency support for compliance-document creation
- Governed CV extraction with a provider abstraction
- Schema validation of AI output
- Human confirmation/rejection before candidate data is changed
- AI audit records
- Documents-expiring-within-30-days endpoint
- Next.js/React frontend for authentication, candidates, dashboard and AI CV extraction
- Unit, integration and tenant-isolation tests

## Architecture

```text
HTTP request
    ↓
JWT authentication
    ↓
TenantContextGuard
    ↓
PermissionsGuard
    ↓
Controller
    ↓
Domain service
    ↓
TenantTransactionService
    ↓
SET LOCAL app.tenant_id
    ↓
PostgreSQL RLS + application tenant filters
    ↓
Database
```

Tenant identity is never accepted from the client. It comes from the authenticated user's server-side context.

Tenant-scoped transactions set `app.tenant_id` before domain queries execute. PostgreSQL RLS then enforces the tenant boundary.

RLS protects:

- `Candidate`
- `ComplianceDocument`
- `DocumentVersion`
- `AuditEvent`
- `OutboxEvent`
- `AIExtraction`
- `IdempotencyKey`

## Auditability

Audit events contain tenant, actor, action, record type/ID, timestamp and before/after hashes.

The audit ledger is append-only. The database migration revokes UPDATE/DELETE from `PUBLIC` and installs a trigger that rejects audit-event mutation.

## Compliance versioning

A logical compliance document has associated `DocumentVersion` records.

Corrections create a new version rather than destructively overwriting history. Each version can reference the version it supersedes.

## Right-to-Work verification

Verification requests and outbox events are persisted transactionally.

The in-process worker:

1. Reads pending events.
2. Claims an event.
3. Loads tenant-scoped verification state.
4. Calls the verifier outside the DB transaction.
5. Re-checks state.
6. Updates verification/document/version state atomically.
7. Writes audit events.
8. Marks the event processed.
9. Retries failures up to a bounded attempt count.

The verifier is interface-driven so a real provider can replace the mock.

## Governed AI

The CV workflow is:

```text
Upload CV
   ↓
Extract text
   ↓
Provider
   ↓
Structured output
   ↓
Schema validation
   ↓
PROPOSED
   ↓
Human review/edit
   ↓
ACCEPTED / REJECTED
```

AI output never automatically rejects a candidate.

The current provider is deterministic and local and is bound through the CV_EXTRACTION_PROVIDER NestJS dependency-injection token. It is currently mapped to MockCvExtractionProvider; it is not an environment-variable switch.

## Frontend

The Next.js frontend provides:

- Login
- Dashboard
- Candidate directory
- Candidate creation
- Candidate search/pagination
- Governed CV extraction
- Human review and confirmation of proposed AI data

Frontend role checks are only UX behaviour. Backend authentication, authorisation and tenant isolation remain authoritative.

## Local setup

### API

```bash
cd apps/api
npm install
```

Create `apps/api/.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<database>
JWT_SECRET=<local-development-secret>
PORT=8080
```

Then:

```bash
npm run generate
npx prisma migrate deploy
npm run db.seed
npm run start:dev
```

Swagger:

```text
http://localhost:8080/api/docs
```

### Web

```bash
cd apps/web
npm install
```

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

Then:

```bash
npm run dev
```

## Seed accounts

Two tenants are seeded for isolation testing.

### Tenant A

```text
Acme Recruitment
admin@acme.test
recruiter@acme.test
```

### Tenant B

```text
Global Talent Partners
admin@global.test
recruiter@global.test
```

Password for all seeded users:

```text
Password123!
```

These credentials are for local development/testing only.

## Testing

Backend unit/integration tests:

```bash
cd apps/api
npm test -- --runInBand
```

E2E tests:

```bash
npm run test:e2e -- --runInBand
```

Coverage:

```bash
npm run test:cov
```

Build:

```bash
npm run build
```

Frontend:

```bash
cd apps/web
npm run lint
npm run build
```

The test suite includes tenant-isolation, permissions, audit, candidate/document, verification and AI extraction coverage.

## API conventions

Endpoints are versioned:

```text
/api/v1/...
```

Authentication:

```http
Authorization: Bearer <access-token>
```

Global validation uses NestJS `ValidationPipe`.

Errors are returned using Problem Details, for example:

```json
{
  "type": "https://httpstatuses.com/400",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation or domain error",
  "instance": "/api/v1/...",
  "timestamp": "..."
}
```

## Deliberate scope decisions

This is a time-boxed take-home rather than a production deployment.

The outbox uses an in-process poller rather than a separately deployed worker because the brief permits an in-process equivalent and the approach demonstrates the required transactional outbox and retry semantics without unnecessary infrastructure.

The AI and Right-to-Work providers are mock/local implementations behind interfaces because the brief evaluates integration design and governance rather than access to paid external services.

The frontend focuses on the highest-value demonstration flows rather than attempting to implement a complete recruitment product.

Idempotency is implemented for compliance-document creation. A production implementation would apply the same mechanism consistently across every externally retried write endpoint.

## Production improvements

If this moved beyond the take-home, I would add:

- Dedicated queue/worker infrastructure
- Distributed worker coordination
- Exponential retry backoff and dead-letter handling
- Object storage for uploaded CVs
- Malware/content scanning
- Real LLM integration with model governance
- Stronger file-size/content validation
- Structured observability and distributed tracing
- Refresh-token/session management
- Rate limiting
- Cloud secret management
- CI/CD and security scanning
- Database backup/restore procedures
- Broader API-wide idempotency coverage

## Documentation

- [Architecture note](docs/architecture.md)
- [Code review](docs/review.md)
- [AI usage](docs/ai-usage.md)
