-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "subscribed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "utmCampaign" TEXT,
ADD COLUMN     "utmMedium" TEXT,
ADD COLUMN     "utmSource" TEXT;

-- CreateIndex
CREATE INDEX "Lead_courseId_idx" ON "Lead"("courseId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
