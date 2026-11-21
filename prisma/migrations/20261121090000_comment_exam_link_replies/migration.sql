-- CreateEnum
CREATE TYPE "ReplyAuthor" AS ENUM ('ADMIN', 'PARENT');

-- AlterEnum
ALTER TYPE "CommentCategory" ADD VALUE 'EXAM_RESULT';

-- AlterTable
ALTER TABLE "teacher_comments" ADD COLUMN     "tuitionExamId" TEXT;

-- CreateTable
CREATE TABLE "comment_replies" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "authorType" "ReplyAuthor" NOT NULL,
    "adminId" TEXT,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_replies_commentId_createdAt_idx" ON "comment_replies"("commentId", "createdAt");

-- CreateIndex
CREATE INDEX "comment_replies_authorType_readAt_idx" ON "comment_replies"("authorType", "readAt");

-- CreateIndex
CREATE INDEX "teacher_comments_tuitionExamId_idx" ON "teacher_comments"("tuitionExamId");

-- AddForeignKey
ALTER TABLE "teacher_comments" ADD CONSTRAINT "teacher_comments_tuitionExamId_fkey" FOREIGN KEY ("tuitionExamId") REFERENCES "tuition_examinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "teacher_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "parents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

