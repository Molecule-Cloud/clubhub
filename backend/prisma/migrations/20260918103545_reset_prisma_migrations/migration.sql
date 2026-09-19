/*
  Warnings:

  - You are about to drop the `join_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "join_requests" DROP CONSTRAINT "join_requests_eventId_fkey";

-- DropForeignKey
ALTER TABLE "join_requests" DROP CONSTRAINT "join_requests_organizationId_fkey";

-- DropTable
DROP TABLE "join_requests";

-- CreateTable
CREATE TABLE "join-requests" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT,
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "message" TEXT,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join-requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "join-requests_organizationId_status_idx" ON "join-requests"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "join-requests" ADD CONSTRAINT "join-requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join-requests" ADD CONSTRAINT "join-requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
