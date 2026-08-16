-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "recordId" DROP NOT NULL;
