import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata valor em centavos para reais
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

/**
 * Converte valor em reais para centavos
 */
export function toCents(reais: number): number {
  return Math.round(reais * 100)
}

/**
 * Formata número de telefone brasileiro
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

/**
 * Formata área em m²
 */
export function formatArea(area: number): string {
  return `${area.toLocaleString('pt-BR')} m²`
}

/**
 * Traduz tipo de transação
 */
export function translateTransactionType(type: 'SALE' | 'RENT' | 'BOTH'): string {
  const map = {
    SALE: 'Venda',
    RENT: 'Aluguel',
    BOTH: 'Venda ou Aluguel',
  }
  return map[type]
}

/**
 * Traduz tipo de imóvel
 */
export function translatePropertyType(type: 'APARTMENT' | 'HOUSE'): string {
  const map = {
    APARTMENT: 'Apartamento',
    HOUSE: 'Casa',
  }
  return map[type]
}

/**
 * Traduz status do imóvel
 */
export function translatePropertyStatus(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Ativo',
    SOLD: 'Vendido',
    RENTED: 'Alugado',
    INACTIVE: 'Inativo',
  }
  return map[status] || status
}

/**
 * Traduz status da assinatura
 */
export function translateSubscriptionStatus(status: string): string {
  const map: Record<string, string> = {
    TRIAL: 'Teste grátis',
    ACTIVE: 'Ativa',
    PAST_DUE: 'Pagamento pendente',
    CANCELED: 'Cancelada',
  }
  return map[status] || status
}
