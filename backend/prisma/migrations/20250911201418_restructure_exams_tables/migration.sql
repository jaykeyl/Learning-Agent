-- Enable UUID generator if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "content" JSONB;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='SavedExam' AND column_name='content'
  ) THEN
    UPDATE "Exam" e
    SET "content" = se."content"
    FROM "SavedExam" se
    WHERE se."examId" = e."id" AND se."content" IS NOT NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='SavedExam' AND column_name='id' AND data_type IN ('integer')
  ) THEN
    ALTER TABLE "SavedExam" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid() NOT NULL;

    ALTER TABLE "SavedExam" DROP CONSTRAINT "SavedExam_pkey";
    ALTER TABLE "SavedExam" ADD CONSTRAINT "SavedExam_pkey" PRIMARY KEY ("id_new");

    ALTER TABLE "SavedExam" DROP COLUMN "id";
    ALTER TABLE "SavedExam" RENAME COLUMN "id_new" TO "id";
  END IF;
END$$;

DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM "SavedExam" WHERE "examId" IS NULL;
  IF missing_count > 0 THEN
    RAISE NOTICE 'There are % SavedExam rows with NULL examId. Please fix before enforcing NOT NULL.', missing_count;
  END IF;
END$$;

ALTER TABLE "SavedExam" ALTER COLUMN "examId" SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='SavedExam' AND column_name='content'
  ) THEN
    ALTER TABLE "SavedExam" DROP COLUMN "content";
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='Exam' AND column_name='approvedAt'
  ) THEN
    ALTER TABLE "Exam" DROP COLUMN "approvedAt";
  END IF;
END$$;
