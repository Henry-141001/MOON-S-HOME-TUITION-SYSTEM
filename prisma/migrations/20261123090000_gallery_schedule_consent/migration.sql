-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'REPLACEMENT', 'HOLIDAY', 'CANCELLED');

-- AlterTable
ALTER TABLE "app_settings" ALTER COLUMN "centreName" SET DEFAULT 'Moons HomeTuition';

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "nameConfirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tuition_sessions" ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateTable
CREATE TABLE "comment_photos" (
    "commentId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_photos_pkey" PRIMARY KEY ("commentId")
);

-- CreateTable
CREATE TABLE "gallery_photos" (
    "id" TEXT NOT NULL,
    "takenOn" DATE NOT NULL,
    "activity" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_consents" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "parentCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "statement" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_photos_takenOn_idx" ON "gallery_photos"("takenOn");

-- CreateIndex
CREATE INDEX "parent_consents_parentId_agreedAt_idx" ON "parent_consents"("parentId", "agreedAt");

-- CreateIndex
CREATE INDEX "notifications_parentId_readAt_idx" ON "notifications"("parentId", "readAt");

-- AddForeignKey
ALTER TABLE "comment_photos" ADD CONSTRAINT "comment_photos_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "teacher_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_consents" ADD CONSTRAINT "parent_consents_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data: new centre name
UPDATE "app_settings" SET "centreName" = 'Moons HomeTuition' WHERE "centreName" IN ('Moons Home Tutor', 'Moon''s Home Tuition');
