-- AlterTable
ALTER TABLE "app_settings" ALTER COLUMN "centreName" SET DEFAULT 'Moons Home Tutor';

-- Marks are now entered and shown as percentages: every result is stored out of 100.
-- Convert any result that was out of another total (e.g. 33/50 -> 66).
UPDATE "tuition_results" AS r
SET "marksObtained" = ROUND((r."marksObtained" / e."totalMarks" * 100)::numeric, 1)
FROM "tuition_examinations" AS e
WHERE r."examId" = e."id" AND e."totalMarks" > 0 AND e."totalMarks" <> 100;

UPDATE "tuition_examinations" SET "totalMarks" = 100 WHERE "totalMarks" <> 100;

UPDATE "school_results"
SET "marksObtained" = ROUND(("marksObtained" / "totalMarks" * 100)::numeric, 1), "totalMarks" = 100
WHERE "totalMarks" > 0 AND "totalMarks" <> 100;

-- Brand rename (only if the centre name was never customised).
UPDATE "app_settings" SET "centreName" = 'Moons Home Tutor' WHERE "centreName" = 'Moon''s Home Tuition';
