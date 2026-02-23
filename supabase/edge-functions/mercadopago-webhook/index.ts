// ============================================================================
// CRM IMOBILIÁRIO SAAS - Edge Function: Webhook Mercado Pago
// ============================================================================
// Data: 23/02/2026
// Versão: MVP 1.0
// 
// INSTRUÇÕES DE DEPLOY:
// 1. No Supabase CLI: supabase functions deploy mercadopago-webhook --no-verify-jwt
// 2. Configurar URL no painel do Mercado Pago: https://[PROJECT_ID].supabase.co/functions/v1/mercadopago-webhook
// 3. Configurar secret MERCADO_PAGO_WEBHOOK_SECRET no Supabase
// 
// EVENTOS TRATADOS:
// - subscription_preapproval: Criação/atualização de assinatura
// - subscription_authorized_payment: Pagamento recorrente
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

// Tipos
interface WebhookPayload {
  id: number
  live_mode: boolean
  type: string
  date_created: string
  user_id: number
  api_version: string
  action: string
  data: {
    id: string
  }
}

interface PreapprovalData {
  id: string
  status: string
  auto_recurring: {
    frequency: number
    frequency_type: string
    transaction_amount: number
    currency_id: string
  }
  next_payment_date: string
  date_created: string
  last_modified: string
  payer_id: number
  reason: string
}

// Mapeamento de status do Mercado Pago para nosso sistema
const STATUS_MAP: Record<string, string> = {
  'authorized': 'ACTIVE',
  'pending': 'TRIAL', // Mantém trial enquanto pendente
  'paused': 'PAST_DUE',
  'cancelled': 'CANCELED',
}

// Função principal do webhook
Deno.serve(async (req: Request) => {
  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Obter headers necessários
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')
    
    // Obter query params
    const url = new URL(req.url)
    const dataId = url.searchParams.get('data.id')

    // Obter body
    const payload: WebhookPayload = await req.json()
    
    console.log('Webhook recebido:', JSON.stringify(payload))

    // Validar assinatura (se configurada)
    const webhookSecret = Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET')
    if (webhookSecret && xSignature) {
      const isValid = validateSignature(xSignature, xRequestId, dataId, webhookSecret)
      if (!isValid) {
        console.error('Assinatura inválida')
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    // Processar baseado no tipo de evento
    const result = await processWebhookEvent(payload)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// Validar assinatura do Mercado Pago
function validateSignature(
  xSignature: string,
  xRequestId: string | null,
  dataId: string | null,
  secret: string
): boolean {
  try {
    // Extrair ts e v1 do header
    const parts = xSignature.split(',')
    let ts: string | null = null
    let hash: string | null = null

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (key.trim() === 'ts') ts = value.trim()
      if (key.trim() === 'v1') hash = value.trim()
    }

    if (!ts || !hash) return false

    // Construir manifest
    let manifest = ''
    if (dataId) manifest += `id:${dataId};`
    if (xRequestId) manifest += `request-id:${xRequestId};`
    manifest += `ts:${ts};`

    // Calcular HMAC
    const hmac = createHmac('sha256', secret)
    hmac.update(manifest)
    const calculatedHash = hmac.digest('hex')

    return calculatedHash === hash
  } catch {
    return false
  }
}

// Processar evento do webhook
async function processWebhookEvent(payload: WebhookPayload): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  switch (payload.type) {
    case 'subscription_preapproval': {
      // Buscar dados completos da assinatura na API do Mercado Pago
      const preapproval = await fetchPreapprovalData(payload.data.id, mercadoPagoAccessToken)
      
      if (!preapproval) {
        return { success: false, message: 'Could not fetch preapproval data' }
      }

      // Mapear status
      const newStatus = STATUS_MAP[preapproval.status] || 'PAST_DUE'
      
      // Calcular next_payment_date
      const currentPeriodEndsAt = preapproval.next_payment_date 
        ? new Date(preapproval.next_payment_date).toISOString()
        : null

      // Verificar se é cancelamento
      const canceledAt = preapproval.status === 'cancelled' 
        ? new Date().toISOString() 
        : null

      // Atualizar no banco
      const { error } = await supabase.rpc('update_subscription_from_webhook', {
        p_mercado_pago_subscription_id: preapproval.id,
        p_status: newStatus,
        p_current_period_ends_at: currentPeriodEndsAt,
        p_canceled_at: canceledAt,
      })

      if (error) {
        console.error('Erro ao atualizar subscription:', error)
        return { success: false, message: error.message }
      }

      return { 
        success: true, 
        message: 'Subscription updated',
        status: newStatus,
        subscription_id: preapproval.id
      }
    }

    case 'subscription_authorized_payment': {
      // Pagamento autorizado - buscar dados do pagamento
      const paymentId = payload.data.id
      
      // Buscar pagamento para obter preapproval_id
      const paymentData = await fetchPaymentData(paymentId, mercadoPagoAccessToken)
      
      if (!paymentData || !paymentData.preapproval_id) {
        return { success: false, message: 'Could not fetch payment data' }
      }

      // Buscar dados da preapproval para obter next_payment_date
      const preapproval = await fetchPreapprovalData(paymentData.preapproval_id, mercadoPagoAccessToken)
      
      if (!preapproval) {
        return { success: false, message: 'Could not fetch preapproval data' }
      }

      // Se pagamento aprovado, atualizar status para ACTIVE
      if (paymentData.status === 'approved') {
        const currentPeriodEndsAt = preapproval.next_payment_date 
          ? new Date(preapproval.next_payment_date).toISOString()
          : null

        const { error } = await supabase.rpc('update_subscription_from_webhook', {
          p_mercado_pago_subscription_id: preapproval.id,
          p_status: 'ACTIVE',
          p_current_period_ends_at: currentPeriodEndsAt,
          p_canceled_at: null,
        })

        if (error) {
          console.error('Erro ao atualizar subscription:', error)
          return { success: false, message: error.message }
        }

        return { 
          success: true, 
          message: 'Payment approved, subscription activated',
          subscription_id: preapproval.id
        }
      }

      // Se pagamento rejeitado, marcar como PAST_DUE
      if (paymentData.status === 'rejected') {
        const { error } = await supabase.rpc('update_subscription_from_webhook', {
          p_mercado_pago_subscription_id: preapproval.id,
          p_status: 'PAST_DUE',
          p_current_period_ends_at: null,
          p_canceled_at: null,
        })

        if (error) {
          console.error('Erro ao atualizar subscription:', error)
          return { success: false, message: error.message }
        }

        return { 
          success: true, 
          message: 'Payment rejected, subscription marked as past due',
          subscription_id: preapproval.id
        }
      }

      return { success: true, message: 'Payment status not actionable', status: paymentData.status }
    }

    default:
      console.log('Evento não tratado:', payload.type)
      return { success: true, message: 'Event type not handled', type: payload.type }
  }
}

// Buscar dados da preapproval na API do Mercado Pago
async function fetchPreapprovalData(
  preapprovalId: string, 
  accessToken: string
): Promise<PreapprovalData | null> {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Erro ao buscar preapproval:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Erro ao buscar preapproval:', error)
    return null
  }
}

// Buscar dados do pagamento na API do Mercado Pago
async function fetchPaymentData(
  paymentId: string, 
  accessToken: string
): Promise<{ status: string; preapproval_id: string } | null> {
  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Erro ao buscar payment:', response.status)
      return null
    }

    const data = await response.json()
    return {
      status: data.status,
      preapproval_id: data.metadata?.preapproval_id || data.point_of_interaction?.sub_type,
    }
  } catch (error) {
    console.error('Erro ao buscar payment:', error)
    return null
  }
}
