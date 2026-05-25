CREATE TABLE IF NOT EXISTS "SubmissionAttempt" (
  "id" TEXT NOT NULL,
  "formType" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "accepted" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubmissionAttempt_formType_createdAt_idx" ON "SubmissionAttempt"("formType", "createdAt");
CREATE INDEX IF NOT EXISTS "SubmissionAttempt_ipAddress_createdAt_idx" ON "SubmissionAttempt"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "SubmissionAttempt_email_createdAt_idx" ON "SubmissionAttempt"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "SubmissionAttempt_phone_createdAt_idx" ON "SubmissionAttempt"("phone", "createdAt");
