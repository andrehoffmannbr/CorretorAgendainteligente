-- ============================================================================
-- CRM IMOBILIÁRIO SAAS - VIEWS SQL
-- ============================================================================
-- Data: 23/02/2026
-- Versão: MVP 1.0
-- 
-- INSTRUÇÕES:
-- 1. Execute APÓS schema.sql e rls.sql
-- 2. A VIEW de matching usa security_invoker para respeitar RLS
-- ============================================================================

-- ============================================================================
-- VIEW: property_client_matches
-- Matching entre imóveis e clientes
-- 
-- Lógica de matching:
-- - Imóvel deve estar ACTIVE e não deletado
-- - Cliente não deve estar deletado
-- - Cidade normalizada deve ser igual
-- - Tipo de transação compatível (SALE, RENT ou BOTH)
-- - Tipo de imóvel compatível
-- - Quartos dentro do range desejado
-- - Preço dentro do range desejado
-- - Bairro: se cliente não especificou, considera qualquer bairro
-- ============================================================================

CREATE OR REPLACE VIEW property_client_matches
WITH (security_invoker = true) -- Respeita RLS do usuário que consulta
AS
SELECT 
  -- Dados do cliente
  c.id AS client_id,
  c.name AS client_name,
  c.phone AS client_phone,
  c.created_at AS client_created_at,
  c.stage_id AS client_stage_id,
  
  -- Dados do imóvel
  p.id AS property_id,
  p.title AS property_title,
  p.transaction_type AS property_transaction_type,
  p.property_type AS property_type,
  p.bedrooms AS property_bedrooms,
  p.price AS property_price,
  p.city AS property_city,
  p.neighborhood AS property_neighborhood,
  
  -- Tenant (para RLS)
  c.tenant_id

FROM clients c
INNER JOIN properties p ON p.tenant_id = c.tenant_id
WHERE 
  -- Imóvel ativo e não deletado
  p.status = 'ACTIVE'
  AND p.deleted_at IS NULL
  
  -- Cliente não deletado
  AND c.deleted_at IS NULL
  
  -- Cidade igual (normalizada)
  AND p.city_normalized = c.city_normalized
  
  -- Tipo de transação compatível
  AND (
    c.desired_transaction_type = 'BOTH'
    OR p.transaction_type::TEXT = c.desired_transaction_type::TEXT
  )
  
  -- Tipo de imóvel igual
  AND p.property_type = c.desired_property_type
  
  -- Quartos dentro do range
  AND p.bedrooms >= c.desired_bedrooms_min
  AND p.bedrooms <= c.desired_bedrooms_max
  
  -- Preço dentro do range
  AND p.price >= c.desired_price_min
  AND p.price <= c.desired_price_max
  
  -- Bairro: se cliente especificou, deve ser igual
  AND (
    c.neighborhood_normalized IS NULL
    OR p.neighborhood_normalized = c.neighborhood_normalized
  );

COMMENT ON VIEW property_client_matches IS 
'View de matching entre imóveis e clientes. 
Retorna todos os pares client-property que satisfazem os critérios de busca do cliente.
Usa security_invoker=true para respeitar RLS.';

-- ============================================================================
-- VIEW: dashboard_stats
-- Estatísticas para o dashboard
-- ============================================================================

CREATE OR REPLACE VIEW dashboard_stats
WITH (security_invoker = true)
AS
SELECT 
  u.tenant_id,
  
  -- Total de imóveis ativos
  (
    SELECT COUNT(*) 
    FROM properties p 
    WHERE p.tenant_id = u.tenant_id 
      AND p.status = 'ACTIVE' 
      AND p.deleted_at IS NULL
  ) AS total_properties_active,
  
  -- Total de clientes ativos (não deletados)
  (
    SELECT COUNT(*) 
    FROM clients c 
    WHERE c.tenant_id = u.tenant_id 
      AND c.deleted_at IS NULL
  ) AS total_clients_active,
  
  -- Total de matches disponíveis
  (
    SELECT COUNT(*) 
    FROM property_client_matches m 
    WHERE m.tenant_id = u.tenant_id
  ) AS total_matches
  
FROM users u
WHERE u.id = auth.uid();

COMMENT ON VIEW dashboard_stats IS 
'Estatísticas resumidas para o dashboard do tenant.';

-- ============================================================================
-- VIEW: recent_matches
-- Top 10 matches mais recentes (clientes criados recentemente com matches)
-- Conforme definido no projeto: ordenado por client_created_at DESC, limit 10
-- ============================================================================

CREATE OR REPLACE VIEW recent_matches
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (m.client_id)
  m.client_id,
  m.client_name,
  m.client_phone,
  m.client_created_at,
  m.property_id,
  m.property_title,
  m.property_price,
  m.property_city,
  m.property_neighborhood,
  m.tenant_id,
  
  -- Contagem de matches para este cliente
  (
    SELECT COUNT(*) 
    FROM property_client_matches pm 
    WHERE pm.client_id = m.client_id
  ) AS match_count
  
FROM property_client_matches m
ORDER BY m.client_id, m.client_created_at DESC;

COMMENT ON VIEW recent_matches IS 
'Clientes com matches, ordenados por data de criação (mais recentes primeiro).
Usado no dashboard para mostrar oportunidades recentes.
NOTA: Para pegar top 10, usar LIMIT 10 na query que consulta esta view.';

-- ============================================================================
-- VIEW: clients_by_stage
-- Clientes agrupados por stage (para o kanban)
-- ============================================================================

CREATE OR REPLACE VIEW clients_by_stage
WITH (security_invoker = true)
AS
SELECT 
  c.id AS client_id,
  c.name AS client_name,
  c.phone AS client_phone,
  c.email AS client_email,
  c.notes AS client_notes,
  c.desired_transaction_type,
  c.desired_property_type,
  c.city,
  c.created_at AS client_created_at,
  c.updated_at AS client_updated_at,
  
  -- Dados do stage
  cs.id AS stage_id,
  cs.name AS stage_name,
  cs.position AS stage_position,
  cs.is_final AS stage_is_final,
  
  -- Contagem de matches
  (
    SELECT COUNT(*) 
    FROM property_client_matches m 
    WHERE m.client_id = c.id
  ) AS match_count,
  
  c.tenant_id

FROM clients c
INNER JOIN client_stages cs ON cs.id = c.stage_id
WHERE c.deleted_at IS NULL
ORDER BY cs.position, c.created_at DESC;

COMMENT ON VIEW clients_by_stage IS 
'Clientes com informações do stage para exibição no pipeline kanban.
Inclui contagem de matches por cliente.';

-- ============================================================================
-- FIM DAS VIEWS
-- ============================================================================
