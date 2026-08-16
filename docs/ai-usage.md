# How I Used AI Assistants

I used AI coding assistants, including ChatGPT and Claude, throughout the implementation as development and review tools.

## Where AI helped

AI assistance was used for:

- scaffolding and refining NestJS controllers, services and DTOs;
- exploring Prisma transaction and schema patterns;
- debugging TypeScript, Prisma and Jest configuration issues;
- generating and improving test cases;
- reviewing tenant-isolation and authorisation logic;
- refining the frontend implementation;
- reviewing security issues and the supplied code-review task;
- drafting and editing documentation.

AI was also useful as a second set of eyes for identifying edge cases and challenging implementation decisions after the core functionality was working.

## Where I exercised my own judgement

Generated suggestions were treated as proposals rather than authoritative implementation.

I made and validated the key architectural decisions around:

- PostgreSQL RLS plus application-layer tenant checks for defence in depth;
- deriving tenant identity from authenticated server-side context;
- validating tenant membership before domain logic;
- explicit per-operation permissions and least privilege;
- append-only audit records enforced at the database level;
- immutable/versioned compliance history;
- transactional outbox processing for Right-to-Work verification;
- human confirmation of AI-generated CV data;
- ensuring AI has no automatic candidate-rejection path;
- deterministic local/mock providers because the assessment explicitly permits them;
- keeping infrastructure scoped within the take-home's time budget.

I ran the application locally, exercised the frontend flows, ran the unit/integration and E2E suites, and verified both backend and frontend builds before treating the implementation as complete.

## AI provider design

The CV extraction implementation uses the NestJS `CV_EXTRACTION_PROVIDER` dependency-injection token.

The token is currently bound to `MockCvExtractionProvider`, a deterministic local implementation.

It is important that this is a **NestJS DI token, not an environment variable**. The abstraction allows a real LLM provider to implement the same `CvExtractionProvider` interface later without coupling the domain service to a specific vendor.

## Final responsibility

AI assistants contributed suggestions and implementation support, but I remained responsible for the final architecture, security boundaries, code changes, testing, trade-offs and submission.
