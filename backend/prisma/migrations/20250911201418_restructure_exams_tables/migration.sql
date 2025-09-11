-- Enable UUID generator if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Add new column on Exam for content (nullable for now)
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "content" JSONB;

-- 2) Backfill Exam.content from SavedExam.content where we have a link
--    (some rows may have examId = NULL in your current data; handle both cases)
DO $$
BEGIN
  -- If SavedExam.content exists (older schema), copy it over to Exam
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

-- 3) If SavedExam.id is INT, move to UUID
--    We can't alter type directly because it's a PK. We'll create a new column, fill it,
--    swap constraints, then drop the old column.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='SavedExam' AND column_name='id' AND data_type IN ('integer')
  ) THEN
    ALTER TABLE "SavedExam" ADD COLUMN "id_new" UUID DEFAULT gen_random_uuid() NOT NULL;

    -- Promote id_new to PK
    ALTER TABLE "SavedExam" DROP CONSTRAINT "SavedExam_pkey";
    ALTER TABLE "SavedExam" ADD CONSTRAINT "SavedExam_pkey" PRIMARY KEY ("id_new");

    -- Drop old id and rename
    ALTER TABLE "SavedExam" DROP COLUMN "id";
    ALTER TABLE "SavedExam" RENAME COLUMN "id_new" TO "id";
  END IF;
END$$;

-- 4) Ensure examId is NOT NULL and unique + rel points to required
--    First set a provisional exam for those (rare) rows missing examId
--    (Optional) If you know all SavedExam rows already have examId, you can skip this guard.
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO missing_count FROM "SavedExam" WHERE "examId" IS NULL;
  IF missing_count > 0 THEN
    RAISE NOTICE 'There are % SavedExam rows with NULL examId. Please fix before enforcing NOT NULL.', missing_count;
    -- If you want to hard-fail instead:
    -- RAISE EXCEPTION 'SavedExam rows with NULL examId prevent NOT NULL migration.';
  END IF;
END$$;

-- Enforce NOT NULL (this will fail if some rows remain NULL)
ALTER TABLE "SavedExam" ALTER COLUMN "examId" SET NOT NULL;

-- 5) Drop SavedExam.content column
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

-- 6) Drop Exam.approvedAt column (if present)
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
