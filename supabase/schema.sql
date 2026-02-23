-- ============================================================================
-- CRM IMOBILIÁRIO SAAS - SCHEMA SQL COMPLETO
-- ============================================================================
-- Data: 23/02/2026
-- Versão: MVP 1.0
-- 
-- INSTRUÇÕES:
-- 1. Execute este arquivo no SQL Editor do Supabase
-- 2. Depois execute rls.sql para as políticas de segurança
-- 3. Depois execute views.sql para as views
-- 4. Depois execute functions.sql para as funções
-- ============================================================================

-- ============================================================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================================================

-- UUID para geração de IDs únicos (já vem habilitada no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_cron para jobs agendados
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- TIPOS ENUMERADOS (ENUMS)
-- ============================================================================

-- Tipo de usuário no sistema
CREATE TYPE user_role AS ENUM ('OWNER', 'COLLABORATOR');

-- Status da assinatura
CREATE TYPE subscription_status AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- Tipo de plano
CREATE TYPE plan_type AS ENUM ('BASE');

-- Tipo de transação do imóvel
CREATE TYPE transaction_type AS ENUM ('SALE', 'RENT');

-- Tipo de transação desejada pelo cliente (inclui BOTH)
CREATE TYPE desired_transaction_type AS ENUM ('SALE', 'RENT', 'BOTH');

-- Tipo de imóvel
CREATE TYPE property_type AS ENUM ('APARTMENT', 'HOUSE');

-- Status do imóvel
CREATE TYPE property_status AS ENUM ('ACTIVE', 'SOLD', 'RENTED', 'INACTIVE');

-- Tipo de ação para audit log
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- Tipo de entidade para audit log
CREATE TYPE entity_type AS ENUM ('PROPERTY', 'CLIENT', 'SUBSCRIPTION');

-- ============================================================================
-- TABELA: tenants
-- Representa o escritório/corretor (multi-tenant)
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE tenants IS 'Tabela principal de tenants (escritórios/corretores)';
COMMENT ON COLUMN tenants.id IS 'Identificador único do tenant';
COMMENT ON COLUMN tenants.name IS 'Nome do escritório/corretor';

-- ============================================================================
-- TABELA: users
-- Usuários vinculados a um tenant
-- Referencia auth.users do Supabase
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'OWNER',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por tenant
CREATE INDEX idx_users_tenant_id ON users(tenant_id);

-- Índice para busca por email
CREATE INDEX idx_users_email ON users(email);

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema vinculados a tenants';
COMMENT ON COLUMN users.id IS 'ID do usuário (mesmo do auth.users)';
COMMENT ON COLUMN users.tenant_id IS 'Tenant ao qual o usuário pertence';
COMMENT ON COLUMN users.role IS 'Papel do usuário: OWNER ou COLLABORATOR';

-- ============================================================================
-- TABELA: subscriptions
-- Controle de assinatura e billing
-- ============================================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL DEFAULT 'BASE',
  status subscription_status NOT NULL DEFAULT 'TRIAL',
  trial_ends_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  mercado_pago_subscription_id VARCHAR(255),
  mercado_pago_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por status
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Índice para busca por mercado pago subscription id
CREATE INDEX idx_subscriptions_mp_id ON subscriptions(mercado_pago_subscription_id) 
WHERE mercado_pago_subscription_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE subscriptions IS 'Controle de assinaturas e billing';
COMMENT ON COLUMN subscriptions.tenant_id IS 'Tenant dono da assinatura (1:1)';
COMMENT ON COLUMN subscriptions.status IS 'Status atual: TRIAL, ACTIVE, PAST_DUE, CANCELED';
COMMENT ON COLUMN subscriptions.trial_ends_at IS 'Data de expiração do trial (14 dias após criação)';
COMMENT ON COLUMN subscriptions.current_period_ends_at IS 'Data de fim do período atual da assinatura';
COMMENT ON COLUMN subscriptions.canceled_at IS 'Data em que a assinatura foi cancelada';

-- ============================================================================
-- TABELA: client_stages
-- Etapas do pipeline (kanban) - Fixas no MVP
-- ============================================================================

CREATE TABLE client_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  position SMALLINT NOT NULL,
  is_final BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para ordenação por posição
CREATE INDEX idx_client_stages_tenant_position ON client_stages(tenant_id, position);

-- Constraint: posição única por tenant
ALTER TABLE client_stages 
ADD CONSTRAINT unique_stage_position UNIQUE (tenant_id, position);

-- Comentários
COMMENT ON TABLE client_stages IS 'Etapas do pipeline de clientes (kanban)';
COMMENT ON COLUMN client_stages.position IS 'Ordem de exibição da etapa';
COMMENT ON COLUMN client_stages.is_final IS 'Indica se é a etapa final (Fechado)';

-- ============================================================================
-- TABELA: properties
-- Imóveis cadastrados
-- ============================================================================

CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Dados do imóvel
  title VARCHAR(255),
  description TEXT,
  
  -- Classificação
  transaction_type transaction_type NOT NULL,
  property_type property_type NOT NULL,
  status property_status NOT NULL DEFAULT 'ACTIVE',
  
  -- Características
  bedrooms SMALLINT NOT NULL CHECK (bedrooms >= 0),
  bathrooms SMALLINT CHECK (bathrooms >= 0),
  area_m2 NUMERIC(8,2) CHECK (area_m2 > 0),
  price INTEGER NOT NULL CHECK (price > 0), -- Valor em centavos
  
  -- Localização
  city VARCHAR(100) NOT NULL,
  city_normalized VARCHAR(100) NOT NULL,
  neighborhood VARCHAR(100),
  neighborhood_normalized VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Índice principal para matching
CREATE INDEX idx_properties_matching ON properties(
  tenant_id, 
  status, 
  city_normalized, 
  transaction_type, 
  property_type,
  bedrooms,
  price
) WHERE deleted_at IS NULL;

-- Índice para listagem por tenant
CREATE INDEX idx_properties_tenant ON properties(tenant_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Comentários
COMMENT ON TABLE properties IS 'Imóveis cadastrados pelos corretores';
COMMENT ON COLUMN properties.title IS 'Título do imóvel (opcional, frontend gera se vazio)';
COMMENT ON COLUMN properties.city_normalized IS 'Cidade normalizada (lowercase, sem acentos)';
COMMENT ON COLUMN properties.neighborhood_normalized IS 'Bairro normalizado (lowercase, sem acentos)';
COMMENT ON COLUMN properties.price IS 'Preço em centavos (ex: 50000000 = R$ 500.000,00)';
COMMENT ON COLUMN properties.deleted_at IS 'Soft delete - data de exclusão';

-- ============================================================================
-- TABELA: clients
-- Clientes/leads cadastrados
-- ============================================================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  
  -- Dados do cliente
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_normalized VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  
  -- Preferências de imóvel
  desired_transaction_type desired_transaction_type NOT NULL,
  desired_property_type property_type NOT NULL,
  desired_bedrooms_min SMALLINT NOT NULL CHECK (desired_bedrooms_min >= 0),
  desired_bedrooms_max SMALLINT NOT NULL CHECK (desired_bedrooms_max >= 0),
  desired_price_min INTEGER NOT NULL CHECK (desired_price_min >= 0), -- Centavos
  desired_price_max INTEGER NOT NULL CHECK (desired_price_max > 0),  -- Centavos
  
  -- Localização desejada
  city VARCHAR(100) NOT NULL,
  city_normalized VARCHAR(100) NOT NULL,
  neighborhood VARCHAR(100),
  neighborhood_normalized VARCHAR(100),
  
  -- Pipeline
  stage_id UUID NOT NULL REFERENCES client_stages(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

-- Constraint: telefone único por tenant
ALTER TABLE clients 
ADD CONSTRAINT unique_client_phone UNIQUE (tenant_id, phone_normalized);

-- Índice para busca por stage (pipeline)
CREATE INDEX idx_clients_stage ON clients(tenant_id, stage_id) 
WHERE deleted_at IS NULL;

-- Índice para matching
CREATE INDEX idx_clients_matching ON clients(
  tenant_id,
  city_normalized,
  desired_transaction_type,
  desired_property_type
) WHERE deleted_at IS NULL;

-- Índice para busca por telefone
CREATE INDEX idx_clients_phone ON clients(tenant_id, phone_normalized);

-- Comentários
COMMENT ON TABLE clients IS 'Clientes/leads cadastrados pelo corretor';
COMMENT ON COLUMN clients.phone_normalized IS 'Telefone normalizado (apenas números)';
COMMENT ON COLUMN clients.desired_transaction_type IS 'SALE, RENT ou BOTH';
COMMENT ON COLUMN clients.desired_price_min IS 'Preço mínimo em centavos';
COMMENT ON COLUMN clients.desired_price_max IS 'Preço máximo em centavos';
COMMENT ON COLUMN clients.stage_id IS 'Etapa atual no pipeline';

-- Constraint: bedrooms_max >= bedrooms_min
ALTER TABLE clients 
ADD CONSTRAINT check_bedrooms_range 
CHECK (desired_bedrooms_max >= desired_bedrooms_min);

-- Constraint: price_max >= price_min
ALTER TABLE clients 
ADD CONSTRAINT check_price_range 
CHECK (desired_price_max >= desired_price_min);

-- ============================================================================
-- TABELA: audit_log (OPCIONAL - RECOMENDADO)
-- Log de auditoria de ações
-- ============================================================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  action audit_action NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por tenant e entidade
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);

-- Índice para busca por entidade específica
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);

-- Comentários
COMMENT ON TABLE audit_log IS 'Log de auditoria de ações no sistema';
COMMENT ON COLUMN audit_log.entity_type IS 'Tipo da entidade: PROPERTY, CLIENT, SUBSCRIPTION';
COMMENT ON COLUMN audit_log.action IS 'Ação realizada: CREATE, UPDATE, DELETE';

-- ============================================================================
-- TRIGGERS: Atualização automática de updated_at
-- ============================================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tenants
CREATE TRIGGER trigger_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para users
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para subscriptions
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para properties
CREATE TRIGGER trigger_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para clients
CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HABILITAR ROW LEVEL SECURITY EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
-- Próximos passos:
-- 1. Execute rls.sql para criar as políticas de segurança
-- 2. Execute views.sql para criar as views de matching
-- 3. Execute functions.sql para criar as funções auxiliares
-- ============================================================================
