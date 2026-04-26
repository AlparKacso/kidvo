-- Track delivery status of confirmation/decline emails sent to parents.
-- email_status is null until we attempt a send; then 'sent' or 'failed'.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trial_requests' AND column_name = 'email_status'
  ) THEN
    ALTER TABLE public.trial_requests ADD COLUMN email_status TEXT;
    ALTER TABLE public.trial_requests ADD CONSTRAINT trial_requests_email_status_check CHECK (email_status IS NULL OR email_status IN ('sent', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trial_requests' AND column_name = 'email_error'
  ) THEN
    ALTER TABLE public.trial_requests ADD COLUMN email_error TEXT;
  END IF;
END $$;
