-- This is an empty migration.-- Audit events are append-only.
REVOKE UPDATE, DELETE ON "AuditEvent" FROM PUBLIC;

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit events are immutable';
END;
$$;

CREATE TRIGGER audit_event_immutable
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_mutation();