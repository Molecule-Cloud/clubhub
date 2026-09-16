/*
  Warnings:

  - You are about to drop the column `phoneNumber` on the `join-requests` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "join-requests" DROP COLUMN "phoneNumber",
ADD COLUMN     "phone" TEXT;
