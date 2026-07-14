/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `DocumentVersion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[objectKey]` on the table `DocumentVersion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mimeType` to the `DocumentVersion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectKey` to the `DocumentVersion` table without a default value. This is not possible if the table is not empty.
  - Made the column `fileSize` on table `DocumentVersion` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "DocumentVersion" DROP CONSTRAINT "DocumentVersion_createdById_fkey";

-- AlterTable
ALTER TABLE "DocumentVersion" DROP COLUMN "fileUrl",
ADD COLUMN     "checksum" TEXT,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "objectKey" TEXT NOT NULL,
ALTER COLUMN "fileSize" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_objectKey_key" ON "DocumentVersion"("objectKey");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_createdAt_idx" ON "DocumentVersion"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
