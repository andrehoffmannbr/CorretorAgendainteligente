-- ============================================================================
-- CRM IMOBILIÁRIO SAAS - POLÍTICAS RLS (Row Level Security)
-- ============================================================================
-- Data: 23/02/2026
-- Versão: MVP 1.0
-- 
-- INSTRUÇÕES:
-- 1. Execute APÓS o schema.sql
-- 2. Este arquivo configura o isolamento multi-tenant
-- 
-- ESTRATÉGIA:
-- - Usar Auth Hook para adicionar tenant_id ao JWT
-- - Políticas usam (select auth.jwt() ->> 'tenant_id')::uuid
-- - Isso evita subquery em cada request (melhor performance)
-- ============================================================================

-- ============================================================================
-- FUNÇÃO AUXILIAR: Obter tenant_id do JWT
-- Seguindo best practices do Supabase para performance
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT auth.jwt() ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION get_current_tenant_id() IS 'Retorna o tenant_id do usuário atual a partir do JWT';

-- ============================================================================
-- FUNÇÃO AUXILIAR: Obter user_id do JWT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT auth.uid());
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

COMMENT ON FUNCTION get_current_user_id() IS 'Retorna o user_id do usuário atual';

-- ============================================================================
-- AUTH HOOK: Adicionar tenant_id ao JWT durante autenticação
-- Este hook é executado quando o usuário faz login/refresh do token
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  user_tenant_id UUID;
BEGIN
  -- Buscar tenant_id do usuário na tabela users
  SELECT tenant_id INTO user_tenant_id 
  FROM public.users 
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF user_tenant_id IS NOT NULL THEN
    -- Adicionar tenant_id ao JWT
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::TEXT));
  ELSE
    claims := jsonb_set(claims, '{tenant_id}', 'null');
  END IF;

  -- Atualizar claims no evento
  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Permissões para o Auth Hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.users TO supabase_auth_admin;

COMMENT ON FUNCTION public.custom_access_token_hook(JSONB) IS 
'Auth Hook que adiciona tenant_id ao JWT do usuário. 
Deve ser habilitado em: Dashboard > Authentication > Hooks';

-- ============================================================================
-- POLÍTICAS: tenants
-- ============================================================================

-- SELECT: Usuário só vê seu próprio tenant
CREATE POLICY "tenants_select_policy" ON tenants
  FOR SELECT
  TO authenticated
  USING ((SELECT get_current_tenant_id()) = id);

-- UPDATE: Usuário só atualiza seu próprio tenant (se for OWNER)
CREATE POLICY "tenants_update_policy" ON tenants
  FOR UPDATE
  TO authenticated
  USING ((SELECT get_current_tenant_id()) = id)
  WITH CHECK ((SELECT get_current_tenant_id()) = id);

-- INSERT: Permitido apenas durante onboarding (via service role)
-- Não criar policy de INSERT para authenticated - será feito via função

-- DELETE: Não permitido via API
-- Exclusão de tenant deve ser feita via admin/service role

-- ============================================================================
-- POLÍTICAS: users
-- ============================================================================

-- SELECT: Usuário vê todos os usuários do seu tenant
CREATE POLICY "users_select_policy" ON users
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()));

-- INSERT: Usuário só pode criar usuários no seu tenant (futuro: colaboradores)
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

-- UPDATE: Usuário só atualiza usuários do seu tenant
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE
  TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

-- DELETE: Não permitido via API diretamente

-- ============================================================================
-- POLÍTICAS: subscriptions
-- ============================================================================

-- SELECT: Usuário só vê a assinatura do seu tenant
CREATE POLICY "subscriptions_select_policy" ON subscriptions
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()));

-- UPDATE: Usuário só atualiza a assinatura do seu tenant
CREATE POLICY "subscriptions_update_policy" ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()))
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

-- INSERT/DELETE: Não permitido via API (gerenciado por webhooks)

-- ============================================================================
-- POLÍTICAS: client_stages
-- ============================================================================

-- SELECT: Usuário vê todos os stages do seu tenant
CREATE POLICY "client_stages_select_policy" ON client_stages
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()));

-- INSERT/UPDATE/DELETE: Não permitido no MVP (stages são fixos)
-- Será liberado em versão futura quando stages forem customizáveis

-- ============================================================================
-- POLÍTICAS: properties
-- ============================================================================

-- SELECT: Usuário vê todos os imóveis do seu tenant (não deletados)
CREATE POLICY "properties_select_policy" ON properties
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND deleted_at IS NULL
  );

-- INSERT: Usuário só cria imóveis no seu tenant
CREATE POLICY "properties_insert_policy" ON properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT get_current_tenant_id())
    AND created_by = (SELECT get_current_user_id())
  );

-- UPDATE: Usuário só atualiza imóveis do seu tenant
CREATE POLICY "properties_update_policy" ON properties
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND deleted_at IS NULL
  )
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

-- DELETE: Soft delete - atualiza deleted_at
-- Não usar DELETE real, usar UPDATE para setar deleted_at

-- ============================================================================
-- POLÍTICAS: clients
-- ============================================================================

-- SELECT: Usuário vê todos os clientes do seu tenant (não deletados)
CREATE POLICY "clients_select_policy" ON clients
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND deleted_at IS NULL
  );

-- INSERT: Usuário só cria clientes no seu tenant
CREATE POLICY "clients_insert_policy" ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT get_current_tenant_id())
    AND created_by = (SELECT get_current_user_id())
  );

-- UPDATE: Usuário só atualiza clientes do seu tenant
CREATE POLICY "clients_update_policy" ON clients
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND deleted_at IS NULL
  )
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

-- DELETE: Soft delete - atualiza deleted_at

-- ============================================================================
-- POLÍTICAS: audit_log
-- ============================================================================

-- SELECT: Usuário vê logs do seu tenant
CREATE POLICY "audit_log_select_policy" ON audit_log
  FOR SELECT
  TO authenticated
  USING (tenant_id = (SELECT get_current_tenant_id()));

-- INSERT: Sistema insere logs automaticamente
CREATE POLICY "audit_log_insert_policy" ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = (SELECT get_current_tenant_id()));

-- UPDATE/DELETE: Não permitido (logs são imutáveis)

-- ============================================================================
-- POLICY PARA PERMITIR LEITURA EM MODO LEITURA (PAST_DUE/CANCELED)
-- A verificação de modo leitura será feita no frontend/middleware
-- As policies permitem SELECT mesmo em modo leitura
-- INSERT/UPDATE serão bloqueados no middleware
-- ============================================================================

-- ============================================================================
-- INSTRUÇÃO IMPORTANTE: HABILITAR AUTH HOOK
-- ============================================================================
-- 
-- Após executar este arquivo, você DEVE habilitar o Auth Hook no Dashboard:
-- 
-- 1. Acesse: Dashboard > Authentication > Hooks
-- 2. Localize "Custom Access Token"
-- 3. Selecione a função: public.custom_access_token_hook
-- 4. Clique em Save
-- 
-- Sem isso, o tenant_id NÃO será adicionado ao JWT e as policies falharão!
-- 
-- ============================================================================

-- ============================================================================
-- FIM DAS POLÍTICAS RLS
-- ============================================================================
