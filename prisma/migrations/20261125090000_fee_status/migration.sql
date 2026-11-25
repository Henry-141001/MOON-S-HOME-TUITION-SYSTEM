-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'OVERDUE');

-- AlterEnum
ALTER TYPE "SessionStatus" ADD VALUE 'EXTRA';

-- CreateTable
CREATE TABLE "fee_rates" (
    "effectiveMonth" TEXT NOT NULL,
    "ratePerClass" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_rates_pkey" PRIMARY KEY ("effectiveMonth")
);

-- CreateTable
CREATE TABLE "fee_payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAmount" DOUBLE PRECISION,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_payments_month_idx" ON "fee_payments"("month");

-- CreateIndex
CREATE UNIQUE INDEX "fee_payments_studentId_month_key" ON "fee_payments"("studentId", "month");

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_payments" ADD CONSTRAINT "fee_payments_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

