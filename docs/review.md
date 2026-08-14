One important architectural point

We're deliberately putting tenantId on Candidate, ComplianceDocument, DocumentVersion, AuditEvent, OutboxEvent, AIExtraction, and IdempotencyKey rather than relying only on relationships.

That redundancy is intentional.

It lets us enforce tenant boundaries at multiple levels and makes tenant-scoped indexes/queries much more straightforward.

The critical rule:

No controller/service should accept a tenant ID from the client and trust it.
Never trust a tenant ID supplied by the client. The tenant comes from the authenticated user's server-side context.
