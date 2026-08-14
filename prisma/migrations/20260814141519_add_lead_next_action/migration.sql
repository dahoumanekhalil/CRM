-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextActionDue" TIMESTAMP(3),
ADD COLUMN     "nextActionOwnerId" TEXT;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_nextActionOwnerId_fkey" FOREIGN KEY ("nextActionOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
