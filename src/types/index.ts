import type { Tables, Views, Enums } from './database'

// Entity types from database
export type Tenant = Tables<'tenants'>
export type User = Tables<'users'>
export type Subscription = Tables<'subscriptions'>
export type Property = Tables<'properties'>
export type Client = Tables<'clients'>
export type ClientStage = Tables<'client_stages'>
export type AuditLog = Tables<'audit_log'>

// View types
export type PropertyClientMatch = Views<'property_client_matches'>
export type DashboardStats = Views<'dashboard_stats'>
export type RecentMatch = Views<'recent_matches'>
export type ClientsByStage = Views<'clients_by_stage'>

// Enum types
export type UserRole = Enums<'user_role'>
export type SubscriptionStatus = Enums<'subscription_status'>
export type TransactionType = Enums<'transaction_type'>
export type ClientTransactionType = Enums<'client_transaction_type'>
export type PropertyType = Enums<'property_type'>
export type PropertyStatus = Enums<'property_status'>

// Extended types with relations
export type ClientWithStage = Client & {
  stage: ClientStage
}

export type ClientWithMatches = Client & {
  stage: ClientStage
  matches: Property[]
}

export type PropertyWithCreator = Property & {
  creator: Pick<User, 'id' | 'name'>
}

// Form types
export type PropertyFormData = {
  title?: string
  description?: string
  transaction_type: TransactionType
  property_type: PropertyType
  bedrooms: number
  bathrooms?: number
  area_m2?: number
  price: number // em reais, será convertido para centavos
  city: string
  neighborhood?: string
}

export type ClientFormData = {
  name: string
  phone: string
  email?: string
  notes?: string
  desired_transaction_type: ClientTransactionType
  desired_property_type?: PropertyType
  desired_bedrooms_min?: number
  desired_bedrooms_max?: number
  desired_price_min?: number // em reais
  desired_price_max?: number // em reais
  city?: string
  neighborhood?: string
  stage_id: string
}

// Auth types
export type AuthUser = {
  id: string
  email: string
  tenant_id: string
  user: User
}

// API response types
export type ApiResponse<T> = {
  data: T | null
  error: string | null
}

export type PaginatedResponse<T> = {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}
