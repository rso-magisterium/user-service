-- DropForeignKey
ALTER TABLE "UserProvider" DROP CONSTRAINT "UserProvider_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "superAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Tenant" (
    "_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "adminId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "_TenantToUser" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TenantToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_name_key" ON "Tenant"("name");

-- CreateIndex
CREATE INDEX "_TenantToUser_B_index" ON "_TenantToUser"("B");

-- AddForeignKey
ALTER TABLE "UserProvider" ADD CONSTRAINT "UserProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantToUser" ADD CONSTRAINT "_TenantToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Tenant"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TenantToUser" ADD CONSTRAINT "_TenantToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
