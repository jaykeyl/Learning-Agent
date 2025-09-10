-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "courseId" TEXT;

-- CreateIndex
CREATE INDEX "Document_courseId_idx" ON "public"."Document"("courseId");

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
