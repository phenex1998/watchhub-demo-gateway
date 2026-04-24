-- ============================================================================
-- watchhub-demo-gateway — Supabase setup para Play Store review
-- ============================================================================
-- IMPORTANTE: substitua `<RENDER_URL>` pela URL publica do seu deploy Render
-- antes de executar (ex: https://watchhub-demo-gateway-xxxx.onrender.com).
--
-- Apos rodar, credenciais do app TV ficam:
--   code:     PLAYSTORE
--   user:     demo
--   pass:     demo
--
-- Aplicar via MCP Supabase:
--   mcp__supabase__execute_sql  (cole esse SQL substituindo <RENDER_URL>)
-- ============================================================================

-- 0. IDs determinísticos — permite rodar mais de uma vez sem duplicar
DO $$
DECLARE
  v_reseller_id UUID := '99999999-9999-9999-9999-999999999999';
  v_server_id   UUID;
  v_code_id     UUID;
BEGIN
  -- 1. Profile "Playstore Review" (reseller) --------------------------------
  INSERT INTO public.profiles (id, email, name, role, is_active, max_clients, max_sub_resellers)
  VALUES (v_reseller_id, 'playstore-review@watchhub.me', 'Playstore Review', 'reseller', true, 50, 0)
  ON CONFLICT (id) DO UPDATE
    SET is_active = true, max_clients = 50, role = 'reseller';

  -- 2. Subscription ELITE (30 dias) para esse profile -----------------------
  INSERT INTO public.subscriptions (reseller_id, plan_id, status, current_period_start, current_period_end, trial_ends_at)
  VALUES (v_reseller_id, 'elite', 'active', now(), now() + interval '30 days', NULL)
  ON CONFLICT (reseller_id) DO UPDATE
    SET plan_id = 'elite',
        status = 'active',
        current_period_start = now(),
        current_period_end = now() + interval '30 days',
        trial_ends_at = NULL,
        updated_at = now();

  -- 3. Servidor apontando para o gateway Render ------------------------------
  INSERT INTO public.servers (reseller_id, name, dns, xtream_username, xtream_password, is_active)
  VALUES (
    v_reseller_id,
    'Playstore Demo',
    '<RENDER_URL>',  -- <<< SUBSTITUA AQUI
    'demo',
    'demo',
    true
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_server_id;

  IF v_server_id IS NULL THEN
    SELECT id INTO v_server_id
      FROM public.servers
     WHERE reseller_id = v_reseller_id AND name = 'Playstore Demo'
     LIMIT 1;
    UPDATE public.servers
       SET dns = '<RENDER_URL>',
           is_active = true
     WHERE id = v_server_id;
  END IF;

  -- 4. Codigo de acesso PLAYSTORE -------------------------------------------
  INSERT INTO public.access_codes (reseller_id, server_id, code, max_clients, is_active, notes)
  VALUES (
    v_reseller_id,
    v_server_id,
    'PLAYSTORE',
    5,
    true,
    'Demo para Google Play Store review. NAO desativar. Expira quando app for publicado.'
  )
  ON CONFLICT (code) DO UPDATE
    SET server_id = v_server_id,
        reseller_id = v_reseller_id,
        max_clients = 5,
        is_active = true;
END $$;

-- Confirma o resultado
SELECT
  p.email                    AS reseller_email,
  s.plan_id                  AS plan,
  s.current_period_end       AS expires,
  srv.name                   AS server_name,
  srv.dns                    AS server_dns,
  srv.xtream_username        AS xtream_user,
  ac.code                    AS access_code,
  ac.max_clients             AS max_clients,
  ac.is_active               AS code_active
FROM public.profiles p
JOIN public.subscriptions s ON s.reseller_id = p.id
JOIN public.servers srv     ON srv.reseller_id = p.id AND srv.name = 'Playstore Demo'
JOIN public.access_codes ac ON ac.server_id = srv.id AND ac.code = 'PLAYSTORE'
WHERE p.id = '99999999-9999-9999-9999-999999999999';
