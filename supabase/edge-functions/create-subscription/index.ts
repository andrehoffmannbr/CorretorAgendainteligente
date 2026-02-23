// ============================================================================
// CRM IMOBILIÁRIO SAAS - Edge Function: Criar Assinatura Mercado Pago
// ============================================================================
// Data: 23/02/2026
// Versão: MVP 1.0
// 
// INSTRUÇÕES DE DEPLOY:
// 1. No Supabase CLI: supabase functions deploy create-subscription
// 2. Configurar secrets: MERCADO_PAGO_ACCESS_TOKEN
// 
// FUNÇÃO:
// Cria uma preapproval (assinatura) no Mercado Pago e retorna URL de checkout
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateSubscriptionRequest {
  plan_id?: string // Opcional: ID do plano no MP (se usar planos pré-definidos)
}

interface CreateSubscriptionResponse {
  success: boolean
  checkout_url?: string
  subscription_id?: string
  error?: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configurações do plano
const PLAN_CONFIG = {
  reason: 'CRM Imobiliário - Plano Base',
  auto_recurring: {
    frequency: 1,
    frequency_type: 'months',
    transaction_amount: 49, // R$ 49,00
    currency_id: 'BRL',
  },
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Apenas aceitar POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }), 
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Obter token de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Criar clientes Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const mercadoPagoAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN')!
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:3000'

    // Cliente com token do usuário
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    })

    // Verificar se usuário está autenticado
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }), 
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Usar cliente admin para buscar dados
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar dados do usuário e subscription
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, email, name')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Buscar subscription atual
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', userData.tenant_id)
      .single()

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Subscription not found' }), 
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Se já tem assinatura ativa no MP, retornar erro
    if (subscription.mercado_pago_subscription_id && subscription.status === 'ACTIVE') {
      return new Response(
        JSON.stringify({ success: false, error: 'Subscription already active' }), 
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Criar preapproval no Mercado Pago
    const preapprovalPayload = {
      reason: PLAN_CONFIG.reason,
      auto_recurring: PLAN_CONFIG.auto_recurring,
      payer_email: userData.email,
      back_url: `${appUrl}/settings?subscription=success`,
      external_reference: userData.tenant_id, // Usar tenant_id como referência
    }

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mercadoPagoAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preapprovalPayload),
    })

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json()
      console.error('Erro ao criar preapproval:', errorData)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create subscription in Mercado Pago' }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const preapprovalData = await mpResponse.json()

    // Atualizar subscription com ID do Mercado Pago
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        mercado_pago_subscription_id: preapprovalData.id,
        mercado_pago_customer_id: preapprovalData.payer_id?.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Erro ao atualizar subscription:', updateError)
      // Não falhar - a assinatura foi criada no MP
    }

    const response: CreateSubscriptionResponse = {
      success: true,
      checkout_url: preapprovalData.init_point,
      subscription_id: preapprovalData.id,
    }

    console.log('Assinatura criada:', response)

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro ao criar assinatura:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
