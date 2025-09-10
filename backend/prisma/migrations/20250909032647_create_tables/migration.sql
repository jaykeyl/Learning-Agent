/*
  Warnings:

  - A unique constraint covering the columns `[textHash]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Document" ADD COLUMN     "textHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_textHash_key" ON "public"."Document"("textHash");

-- CreateIndex
CREATE INDEX "Document_textHash_idx" ON "public"."Document"("textHash");
