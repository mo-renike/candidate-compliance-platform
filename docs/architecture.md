# Architecture Note

## Overview

This repository implements a focused vertical slice of a multi-tenant candidate compliance platform for regulated workforce services. The design prioritises tenant isolation, explicit authorisation, auditability, immutable compliance history, reliable asynchronous verification, and governed AI-assisted CV extraction.

The API uses NestJS and TypeScript, PostgreSQL with Prisma, and a Next.js/React frontend.

## Tenant isolation

Tenant identity is derived exclusively from the authenticated user's JWT claims. A tenant ID supplied through a request body or query parameter is never treated as authoritative.

The request path is:

```text
JWT authentication
        ↓
TenantContextGuard
        ↓
validate user + tenant membership
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
Application tenant filters + PostgreSQL RLS
        ↓
Database
```

Isolation is deliberately enforced at two independent layers.

### Application layer

Domain queries explicitly scope records by `tenantId`. Services receive the tenant from authenticated server-side context rather than accepting it as client-controlled input.

Tenant-scoped operations use `TenantTransactionService`, which establishes:

```sql
SET LOCAL app.tenant_id = '<tenant-id>'
```

inside the transaction before domain queries execute.

### Database layer

PostgreSQL Row-Level Security is enabled and forced on tenant-scoped tables including:

- `Candidate`
- `ComplianceDocument`
- `DocumentVersion`
- `AuditEvent`
- `OutboxEvent`
- `AIExtraction`
- `IdempotencyKey`

The policies compare each record's `tenantId` with `current_setting('app.tenant_id', true)`.

This is defence in depth. A missed application-level filter should not automatically become a cross-tenant data leak, while application checks make the intended boundary explicit and testable.

The test suite creates separate tenants and verifies that one tenant cannot read, update, or delete another tenant's candidate records at the database layer. Permission and API tests separately cover the authenticated operation boundary.

## Authentication and authorisation

Authentication is implemented with JWT and Passport.

Authorisation is permission-based rather than relying on one broad role check. Routes declare the specific permission required for an operation, including candidate, document, verification and AI permissions.

Supported roles are:

- `ADMIN`
- `RECRUITER`
- `COMPLIANCE_MANAGER`

Tenant context is validated after authentication and before domain logic runs. The tenant guard verifies that the tenant exists and that the authenticated user belongs to it.

## API design

The API is versioned under:

```text
/api/v1
```

Global validation uses NestJS `ValidationPipe` with whitelisting, transformation and rejection of unexpected properties.

Errors are normalised into Problem Details responses.

List endpoints support bounded pagination and filtering.

Idempotency is implemented on compliance-document creation. The request body is hashed with the tenant-scoped idempotency key. A safe retry returns the stored response, while reuse of a key with a different request is rejected.

## Audit ledger

Candidate and compliance-document operations are auditable, including sensitive reads.

Audit events contain:

- tenant
- actor
- action
- record type
- record ID
- timestamp
- before/after hashes

Audit creation occurs within the same tenant-scoped transaction as the corresponding mutation. This prevents a successful audited mutation from committing without its audit event.

The audit ledger is append-only. PostgreSQL permissions revoke normal `UPDATE` and `DELETE` access, while a database trigger rejects mutation attempts at the table level.

This makes immutability a database invariant rather than merely an application convention.

## Immutable compliance records

A `ComplianceDocument` represents the logical document while `DocumentVersion` preserves its history.

An update creates a new version rather than destructively overwriting the previous version. The new version can reference the version it supersedes, while the logical document tracks the current version.

A production implementation would add row-level locking or a serializable transaction around version allocation to remove the remaining concurrency window when two corrections occur simultaneously. The unique document/version constraint prevents silent duplicate versions.

## Right-to-Work verification

Right-to-Work verification uses a transactional outbox pattern.

Verification state and its corresponding outbox event are persisted transactionally. An in-process worker polls pending events, claims work, invokes the verifier, and updates verification/document state atomically.

The intended workflow is:

```text
requested
    ↓
pending
    ↓
verified / failed
```

Processing is retry-safe and bounded so failures eventually become terminal rather than retrying indefinitely.

The verifier is interface-driven, allowing a real provider to replace the deterministic mock without changing the domain workflow.

The in-process worker is an intentional take-home trade-off. At production scale it would be replaced by durable queue/worker infrastructure with distributed coordination, stronger retry semantics and dead-letter handling.

## Governed AI CV extraction

The AI feature treats model output as untrusted proposed data.

The workflow is:

```text
Upload CV
   ↓
Extract text
   ↓
CV extraction provider
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

The extracted fields are:

- full name
- skills
- years of experience
- certifications

The result is stored as `PROPOSED` and cannot modify candidate data until an authorised human explicitly confirms it.

There is no automatic candidate-rejection path.

The current provider is deterministic and local. It is bound through the NestJS `CV_EXTRACTION_PROVIDER` dependency-injection token to `MockCvExtractionProvider`. This is an abstraction boundary, not an environment-variable switch.

A production implementation could bind the same interface to an LLM provider with timeouts, retries, model/version tracking, cost controls, tenant-level rate limits and additional content-processing safeguards.

## Frontend

The Next.js frontend demonstrates:

- authentication
- dashboard
- candidate listing
- candidate creation
- search and pagination
- governed CV upload
- human review/editing
- confirmation/rejection of AI proposals

Frontend role checks are UX behaviour only. Backend authentication, authorisation and tenant isolation remain authoritative.

## Scaling and service extraction

The current modular monolith keeps shared transactional concerns simple while maintaining clear domain boundaries:

```text
Candidates
Compliance Documents
Verification
AI Extraction
Audit
Authentication
```

Verification is a natural first extraction candidate because it already has an asynchronous processing boundary.

A future extraction would:

1. move verification persistence to its own database/schema;
2. replace the in-process poller with a durable queue consumer;
3. replace direct Prisma access to other domains with API/event contracts;
4. preserve tenant identity in service-to-service calls and events;
5. publish audit events to a shared audit service or central event sink.

The audit ledger is the main cross-cutting concern that would need redesign during service extraction. Direct writes to a shared audit table work well in the monolith but would be replaced by a service/event-based model across independently deployed services.

At scale, `AuditEvent` is a natural candidate for partitioning or archival by time and/or tenant.

## Trade-offs under the time limit

The implementation intentionally avoids infrastructure that would obscure the engineering patterns being assessed.

Key trade-offs were:

- in-process outbox worker instead of separately deployed queue infrastructure;
- deterministic local/mock AI and verification providers instead of paid external services;
- targeted idempotency rather than generic middleware for every mutation;
- focused frontend flows rather than a complete recruitment product;
- extracted CV data remaining on the AI extraction record rather than introducing a larger candidate-profile model.

These choices keep the take-home reproducible while leaving clear production evolution paths.

## Production improvements

Before production I would prioritise:

- durable queue/worker infrastructure;
- distributed worker coordination and dead-letter handling;
- row-level locking/serializable version allocation;
- object storage and malware/content scanning for uploaded files;
- real LLM integration with model governance and cost/rate controls;
- refresh-token/session management;
- rate limiting and tenant-aware quotas;
- structured logging, tracing and security monitoring;
- CI/CD with dependency and security scanning;
- managed secrets;
- backup/restore and disaster-recovery procedures;
- broader API-wide idempotency coverage;
- additional security and load testing.
