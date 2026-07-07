-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('OPEN', 'RESOLVED', 'RETURNED');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "status" "CommentStatus" NOT NULL DEFAULT 'OPEN';
