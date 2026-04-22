
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'credit_kind' AND e.enumlabel = 'ai_reply'
  ) THEN
    ALTER TYPE public.credit_kind ADD VALUE 'ai_reply';
  END IF;
END $$;
