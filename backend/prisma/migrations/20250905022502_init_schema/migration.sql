-- CreateEnum
CREATE TYPE "public"."ExamStorageStatus" AS ENUM ('Guardado', 'Publicado');

-- CreateTable
CREATE TABLE "public"."SavedExam" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "public"."ExamStorageStatus" NOT NULL DEFAULT 'Guardado',
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedExam_courseId_createdAt_idx" ON "public"."SavedExam"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "SavedExam_teacherId_createdAt_idx" ON "public"."SavedExam"("teacherId", "createdAt");
