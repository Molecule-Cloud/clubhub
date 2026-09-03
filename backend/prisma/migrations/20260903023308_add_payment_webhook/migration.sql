/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `event_registrations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "webHookProcessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "event_registrations_paymentId_key" ON "event_registrations"("paymentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
