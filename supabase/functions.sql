-- ============================================================================
-- CRM IMOBILIÁRIO SAAS - FUNÇÕES SQL
-- ============================================================================
-- Data: 23/02/2026
-- Versão: MVP 1.0
-- 
-- INSTRUÇÕES:
-- 1. Execute APÓS schema.sql, rls.sql e views.sql
-- 2. Contém funções de normalização, onboarding e cron jobs
-- ============================================================================

-- ============================================================================
-- FUNÇÃO: normalize_text
-- Remove acentos e converte para lowercase
-- Usado para city_normalized, neighborhood_normalized
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN LOWER(
    TRANSLATE(
      input_text,
      'áàâãäÁÀÂÃÄéèêëÉÈÊËíìîïÍÌÎÏóòôõöÓÒÔÕÖúùûüÚÙÛÜçÇñÑ',
      'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUcCnN'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_text(TEXT) IS 
'Normaliza texto removendo acentos e convertendo para lowercase.
Usado para campos *_normalized (cidade, bairro).';

-- ============================================================================
-- FUNÇÃO: normalize_phone
-- Remove caracteres não numéricos do telefone
-- Usado para phone_normalized
-- ============================================================================

CREATE OR REPLACE FUNCTION normalize_phone(input_phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_phone IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN REGEXP_REPLACE(input_phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_phone(TEXT) IS 
'Normaliza telefone removendo todos os caracteres não numéricos.
Ex: "(11) 99999-9999" -> "11999999999"';

-- ============================================================================
-- FUNÇÃO: create_tenant_with_user
-- Cria tenant, user e subscription durante onboarding
-- Executada via service role (bypassa RLS)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_tenant_with_user(
  p_auth_user_id UUID,
  p_user_name VARCHAR(255),
  p_user_email VARCHAR(255),
  p_tenant_name VARCHAR(255)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com permissões elevadas
SET search_path = ''
AS $$
DECLARE
  v_tenant_id UUID;
  v_subscription_id UUID;
  v_stage_ids UUID[];
BEGIN
  -- 1. Criar tenant
  INSERT INTO public.tenants (name)
  VALUES (p_tenant_name)
  RETURNING id INTO v_tenant_id;
  
  -- 2. Criar user vinculado ao tenant
  INSERT INTO public.users (id, tenant_id, name, email, role)
  VALUES (p_auth_user_id, v_tenant_id, p_user_name, p_user_email, 'OWNER');
  
  -- 3. Criar subscription em modo TRIAL (14 dias)
  INSERT INTO public.subscriptions (tenant_id, plan_type, status, trial_ends_at)
  VALUES (v_tenant_id, 'BASE', 'TRIAL', NOW() + INTERVAL '14 days')
  RETURNING id INTO v_subscription_id;
  
  -- 4. Criar stages padrão do pipeline
  INSERT INTO public.client_stages (tenant_id, name, position, is_final)
  VALUES 
    (v_tenant_id, 'Novo Lead', 1, false),
    (v_tenant_id, 'Contato Realizado', 2, false),
    (v_tenant_id, 'Visitou Imóvel', 3, false),
    (v_tenant_id, 'Proposta', 4, false),
    (v_tenant_id, 'Fechado', 5, true)
  RETURNING ARRAY_AGG(id) INTO v_stage_ids;
  
  -- Retornar IDs criados
  RETURN jsonb_build_object(
    'tenant_id', v_tenant_id,
    'subscription_id', v_subscription_id,
    'stages_created', array_length(v_stage_ids, 1)
  );
END;
$$;

COMMENT ON FUNCTION create_tenant_with_user(UUID, VARCHAR, VARCHAR, VARCHAR) IS 
'Função de onboarding: cria tenant, user, subscription (TRIAL) e stages padrão.
Deve ser chamada via service role após registro do usuário.';

-- ============================================================================
-- FUNÇÃO: get_first_stage_id
-- Retorna o ID do primeiro stage (Novo Lead) do tenant
-- Usado ao criar novos clientes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_first_stage_id(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_stage_id UUID;
BEGIN
  SELECT id INTO v_stage_id
  FROM public.client_stages
  WHERE tenant_id = p_tenant_id
  ORDER BY position ASC
  LIMIT 1;
  
  RETURN v_stage_id;
END;
$$;

COMMENT ON FUNCTION get_first_stage_id(UUID) IS 
'Retorna o ID do primeiro stage (menor posição) do tenant.
Usado como valor padrão ao criar novos clientes.';

-- ============================================================================
-- FUNÇÃO: check_subscription_status
-- Verifica se tenant tem acesso ativo (TRIAL válido ou ACTIVE)
-- Retorna tipo de acesso: FULL, READ_ONLY, BLOCKED
-- ============================================================================

CREATE OR REPLACE FUNCTION check_subscription_status(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_subscription RECORD;
BEGIN
  SELECT status, trial_ends_at, current_period_ends_at, canceled_at
  INTO v_subscription
  FROM public.subscriptions
  WHERE tenant_id = p_tenant_id;
  
  IF v_subscription IS NULL THEN
    RETURN 'BLOCKED';
  END IF;
  
  -- TRIAL válido
  IF v_subscription.status = 'TRIAL' AND v_subscription.trial_ends_at > NOW() THEN
    RETURN 'FULL';
  END IF;
  
  -- ACTIVE válido
  IF v_subscription.status = 'ACTIVE' AND v_subscription.current_period_ends_at > NOW() THEN
    RETURN 'FULL';
  END IF;
  
  -- CANCELED mas ainda no período
  IF v_subscription.status = 'CANCELED' 
     AND v_subscription.current_period_ends_at IS NOT NULL 
     AND v_subscription.current_period_ends_at > NOW() THEN
    RETURN 'FULL';
  END IF;
  
  -- PAST_DUE = modo leitura
  IF v_subscription.status = 'PAST_DUE' THEN
    RETURN 'READ_ONLY';
  END IF;
  
  -- Qualquer outro caso
  RETURN 'READ_ONLY';
END;
$$;

COMMENT ON FUNCTION check_subscription_status(UUID) IS 
'Verifica status de acesso do tenant.
Retorna: FULL (acesso total), READ_ONLY (modo leitura), BLOCKED (sem acesso).';

-- ============================================================================
-- FUNÇÃO: update_expired_subscriptions
-- Atualiza status de assinaturas expiradas
-- Executada pelo pg_cron diariamente às 00:05 UTC
-- ============================================================================

CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- 1. TRIAL expirado -> PAST_DUE
  WITH updated_trials AS (
    UPDATE public.subscriptions
    SET 
      status = 'PAST_DUE',
      updated_at = NOW()
    WHERE status = 'TRIAL'
      AND trial_ends_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated_trials;
  
  -- 2. ACTIVE expirado -> PAST_DUE
  WITH updated_active AS (
    UPDATE public.subscriptions
    SET 
      status = 'PAST_DUE',
      updated_at = NOW()
    WHERE status = 'ACTIVE'
      AND current_period_ends_at < NOW()
    RETURNING id
  )
  SELECT v_updated_count + COUNT(*) INTO v_updated_count FROM updated_active;
  
  RETURN v_updated_count;
END;
$$;

COMMENT ON FUNCTION update_expired_subscriptions() IS 
'Atualiza assinaturas expiradas para PAST_DUE.
Executada pelo pg_cron diariamente às 00:05 UTC.';

-- ============================================================================
-- CONFIGURAÇÃO DO pg_cron
-- Agendar execução diária às 00:05 UTC
-- ============================================================================

-- Habilitar extensão pg_cron (se ainda não estiver)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Agendar job para rodar diariamente às 00:05 UTC
-- NOTA: Execute este comando separadamente no SQL Editor do Supabase
-- pois pg_cron pode precisar ser habilitado primeiro nas configurações

/*
SELECT cron.schedule(
  'update-expired-subscriptions', -- nome do job
  '5 0 * * *', -- cron expression: 00:05 UTC todos os dias
  $$SELECT public.update_expired_subscriptions()$$
);
*/

-- Para verificar jobs agendados:
-- SELECT * FROM cron.job;

-- Para remover um job:
-- SELECT cron.unschedule('update-expired-subscriptions');

-- ============================================================================
-- TRIGGER: Auto-normalização de campos
-- Normaliza cidade, bairro e telefone automaticamente
-- ============================================================================

-- Trigger para properties (normalizar cidade e bairro)
CREATE OR REPLACE FUNCTION normalize_property_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.city_normalized := public.normalize_text(NEW.city);
  NEW.neighborhood_normalized := public.normalize_text(NEW.neighborhood);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_properties_normalize
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION normalize_property_fields();

-- Trigger para clients (normalizar cidade, bairro e telefone)
CREATE OR REPLACE FUNCTION normalize_client_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.city_normalized := public.normalize_text(NEW.city);
  NEW.neighborhood_normalized := public.normalize_text(NEW.neighborhood);
  NEW.phone_normalized := public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clients_normalize
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_client_fields();

-- ============================================================================
-- FUNÇÃO: update_subscription_from_webhook
-- Atualiza subscription baseado em evento do Mercado Pago
-- Chamada pela Edge Function de webhook
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscription_from_webhook(
  p_mercado_pago_subscription_id VARCHAR(255),
  p_status subscription_status,
  p_current_period_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_canceled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.subscriptions
  SET 
    status = p_status,
    current_period_ends_at = COALESCE(p_current_period_ends_at, current_period_ends_at),
    canceled_at = COALESCE(p_canceled_at, canceled_at),
    updated_at = NOW()
  WHERE mercado_pago_subscription_id = p_mercado_pago_subscription_id;
  
  RETURN FOUND; -- Retorna true se atualizou algum registro
END;
$$;

COMMENT ON FUNCTION update_subscription_from_webhook(VARCHAR, subscription_status, TIMESTAMPTZ, TIMESTAMPTZ) IS 
'Atualiza subscription baseado em webhook do Mercado Pago.
Chamada pela Edge Function de webhook.';

-- ============================================================================
-- FIM DAS FUNÇÕES
-- ============================================================================
