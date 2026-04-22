CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Store the service role key (idempotent) in vault for cron usage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'webhook_dispatcher_service_role_key') THEN
    PERFORM vault.create_secret(
      current_setting('app.settings.service_role_key', true),
      'webhook_dispatcher_service_role_key',
      'Service role key for webhook-dispatcher cron'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- ignore — secret may already exist or app setting unavailable; we still create cron
  NULL;
END $$;

-- Schedule webhook dispatcher every minute
DO $$
DECLARE
  v_url TEXT := 'https://jiabgegdbccqqflsitqj.supabase.co/functions/v1/webhook-dispatcher';
  v_anon TEXT;
BEGIN
  -- Reuse anon key for invocation (function uses service role internally; verify_jwt=false)
  v_anon := current_setting('supabase.anon_key', true);

  PERFORM cron.unschedule('webhook-dispatcher-tick')
   WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'webhook-dispatcher-tick');

  PERFORM cron.schedule(
    'webhook-dispatcher-tick',
    '* * * * *',
    format(
      $cmd$
      SELECT extensions.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json'),
        body := '{}'::jsonb
      );
      $cmd$,
      v_url
    )
  );
EXCEPTION WHEN undefined_function THEN
  -- http_post not available, try pg_net
  PERFORM cron.schedule(
    'webhook-dispatcher-tick',
    '* * * * *',
    format(
      $cmd$
      SELECT net.http_post(
        url := %L,
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body := '{}'::jsonb
      );
      $cmd$,
      v_url
    )
  );
END $$;