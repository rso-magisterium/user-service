/*
  Warnings:

  - Added the required column `adminId` to the `Tenant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "adminId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
