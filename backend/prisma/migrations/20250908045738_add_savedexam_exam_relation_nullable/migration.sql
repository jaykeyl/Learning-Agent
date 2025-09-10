/*
  Warnings:

  - A unique constraint covering the columns `[examId]` on the table `SavedExam` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."SavedExam" ADD COLUMN     "examId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SavedExam_examId_key" ON "public"."SavedExam"("examId");

-- AddForeignKey
ALTER TABLE "public"."SavedExam" ADD CONSTRAINT "SavedExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "public"."Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
