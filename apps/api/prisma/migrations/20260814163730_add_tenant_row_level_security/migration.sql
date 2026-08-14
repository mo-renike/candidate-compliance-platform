-- ============================================================
-- Tenant Row-Level Security
-- ============================================================

-- Candidate isolation
ALTER TABLE "Candidate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Candidate" FORCE ROW LEVEL SECURITY;

CREATE POLICY "candidate_tenant_isolation"
ON "Candidate"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Compliance document isolation
ALTER TABLE "ComplianceDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceDocument" FORCE ROW LEVEL SECURITY;

CREATE POLICY "compliance_document_tenant_isolation"
ON "ComplianceDocument"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Document version isolation
ALTER TABLE "DocumentVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentVersion" FORCE ROW LEVEL SECURITY;

CREATE POLICY "document_version_tenant_isolation"
ON "DocumentVersion"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Audit isolation
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "audit_event_tenant_isolation"
ON "AuditEvent"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Outbox isolation
ALTER TABLE "OutboxEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OutboxEvent" FORCE ROW LEVEL SECURITY;

CREATE POLICY "outbox_event_tenant_isolation"
ON "OutboxEvent"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- AI extraction isolation
ALTER TABLE "AIExtraction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AIExtraction" FORCE ROW LEVEL SECURITY;

CREATE POLICY "ai_extraction_tenant_isolation"
ON "AIExtraction"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);

-- Idempotency isolation
ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" FORCE ROW LEVEL SECURITY;

CREATE POLICY "idempotency_key_tenant_isolation"
ON "IdempotencyKey"
USING (
  "tenantId" = current_setting('app.tenant_id', true)
)
WITH CHECK (
  "tenantId" = current_setting('app.tenant_id', true)
);