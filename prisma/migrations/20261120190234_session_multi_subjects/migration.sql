-- One tuition class can now cover several subjects (e.g. Matematik + 3M).

-- CreateTable
CREATE TABLE "tuition_session_subjects" (
    "sessionId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "tuition_session_subjects_pkey" PRIMARY KEY ("sessionId","subjectId")
);

-- CreateIndex
CREATE INDEX "tuition_session_subjects_subjectId_idx" ON "tuition_session_subjects"("subjectId");

-- AddForeignKey
ALTER TABLE "tuition_session_subjects" ADD CONSTRAINT "tuition_session_subjects_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "tuition_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tuition_session_subjects" ADD CONSTRAINT "tuition_session_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep every existing class's subject: copy it into the new table before removing the old column.
INSERT INTO "tuition_session_subjects" ("sessionId", "subjectId")
SELECT "id", "subjectId" FROM "tuition_sessions" WHERE "subjectId" IS NOT NULL;

-- Remove the old single-subject column.
ALTER TABLE "tuition_sessions" DROP CONSTRAINT "tuition_sessions_subjectId_fkey";
ALTER TABLE "tuition_sessions" DROP COLUMN "subjectId";
