-- Sales Operations migration
-- Extends LeadStatus, adds interestedSessionId on Lead

-- Add new LeadStatus values
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'NOT_INTERESTED';
ALTER TYPE "LeadStatus" ADD VALUE IF NOT EXISTS 'UNREACHABLE';

-- Add interestedSessionId to Lead (nullable FK to CourseSession)
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "interestedSessionId" TEXT;

-- FK constraint
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_interestedSessionId_fkey"
  FOREIGN KEY ("interestedSessionId")
  REFERENCES "CourseSession"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Index for efficient lookup
CREATE INDEX IF NOT EXISTS "Lead_interestedSessionId_idx" ON "Lead"("interestedSessionId");
