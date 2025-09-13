ALTER TABLE "public"."Exam"
  ADD COLUMN IF NOT EXISTS "classId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "public"."ExamStorageStatus" NOT NULL DEFAULT 'Guardado',
  ADD COLUMN IF NOT EXISTS "title"  TEXT NOT NULL DEFAULT 'Examen';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SavedExam'
  ) THEN
    WITH chosen AS (
      SELECT
        se."examId",
        ch.id AS "class_id"
      FROM "public"."SavedExam" se
      JOIN LATERAL (
        SELECT c.id
        FROM "public"."Classes" c
        WHERE c."courseId" = se."courseId"
        ORDER BY
          (c."dateBegin" <= now() AND c."dateEnd" >= now()) DESC,  
          c."dateBegin" DESC                                       
        LIMIT 1
      ) ch ON TRUE
    )
    UPDATE "public"."Exam" e
    SET "classId" = ch."class_id"
    FROM chosen ch
    WHERE ch."examId" = e."id" AND e."classId" IS NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Exam' AND column_name = 'courseId'
  ) THEN
    WITH chosen AS (
      SELECT
        e."id" AS "examId",
        ch.id  AS "class_id"
      FROM "public"."Exam" e
      JOIN LATERAL (
        SELECT c.id
        FROM "public"."Classes" c
        WHERE c."courseId" = e."courseId"
        ORDER BY
          (c."dateBegin" <= now() AND c."dateEnd" >= now()) DESC,
          c."dateBegin" DESC
        LIMIT 1
      ) ch ON TRUE
      WHERE e."classId" IS NULL
    )
    UPDATE "public"."Exam" e
    SET "classId" = ch."class_id"
    FROM chosen ch
    WHERE ch."examId" = e."id" AND e."classId" IS NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "public"."Exam" WHERE "classId" IS NULL) THEN
    RAISE NOTICE 'Some Exam rows still have NULL classId. Leaving nullable; fix data then enforce NOT NULL later.';
  ELSE
    ALTER TABLE "public"."Exam" ALTER COLUMN "classId" SET NOT NULL;
  END IF;
END
$$;

ALTER TABLE "public"."Exam"
  ADD CONSTRAINT IF NOT EXISTS "Exam_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "public"."Classes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Exam_classId_createdAt_idx"
  ON "public"."Exam"("classId", "createdAt");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SavedExam'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'SavedExam'
        AND constraint_name = 'SavedExam_examId_fkey'
    ) THEN
      ALTER TABLE "public"."SavedExam" DROP CONSTRAINT "SavedExam_examId_fkey";
    END IF;
    DROP TABLE "public"."SavedExam";
  END IF;
END
$$;

ALTER TABLE "public"."Exam" DROP COLUMN IF EXISTS "content";

