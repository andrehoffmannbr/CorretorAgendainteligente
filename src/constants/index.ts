// Subscription
export const SUBSCRIPTION_PRICE_CENTS = 4900 // R$49,00
export const TRIAL_DAYS = 7

// Pagination
export const DEFAULT_PAGE_SIZE = 20

// Property
export const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartamento' },
  { value: 'HOUSE', label: 'Casa' },
] as const

export const TRANSACTION_TYPES = [
  { value: 'SALE', label: 'Venda' },
  { value: 'RENT', label: 'Aluguel' },
] as const

export const CLIENT_TRANSACTION_TYPES = [
  { value: 'SALE', label: 'Venda' },
  { value: 'RENT', label: 'Aluguel' },
  { value: 'BOTH', label: 'Venda ou Aluguel' },
] as const

export const PROPERTY_STATUSES = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'SOLD', label: 'Vendido' },
  { value: 'RENTED', label: 'Alugado' },
  { value: 'INACTIVE', label: 'Inativo' },
] as const

// Default stages (created on onboarding)
export const DEFAULT_STAGES = [
  { name: 'Novo Lead', position: 1, is_final: false },
  { name: 'Em Contato', position: 2, is_final: false },
  { name: 'Visita Agendada', position: 3, is_final: false },
  { name: 'Negociação', position: 4, is_final: false },
  { name: 'Fechado', position: 5, is_final: true },
] as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CADASTRO: '/cadastro',
  DASHBOARD: '/dashboard',
  PROPERTIES: '/dashboard/imoveis',
  PROPERTY_NEW: '/dashboard/imoveis/novo',
  CLIENTS: '/dashboard/clientes',
  CLIENT_NEW: '/dashboard/clientes/novo',
  PIPELINE: '/dashboard/pipeline',
  MATCHING: '/dashboard/matching',
  BILLING: '/dashboard/assinatura',
  SETTINGS: '/dashboard/configuracoes',
} as const

// API
export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/callback',
    LOGOUT: '/auth/logout',
  },
  PROPERTIES: '/api/properties',
  CLIENTS: '/api/clients',
  STAGES: '/api/stages',
  SUBSCRIPTION: '/api/subscription',
} as const
