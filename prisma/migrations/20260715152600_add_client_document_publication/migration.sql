-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "isPublishedToClient" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedById" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
