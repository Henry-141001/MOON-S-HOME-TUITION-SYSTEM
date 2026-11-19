-- AlterTable
ALTER TABLE "tuition_examinations" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tuition_sessions" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;
