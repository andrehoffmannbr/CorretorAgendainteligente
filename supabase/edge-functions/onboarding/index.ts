// ============================================================================
// CRM IMOBILIÁRIO SAAS - Edge Function: Onboarding
// ============================================================================
// Data: 23/02/2026
// Versão: MVP 1.0
// 
// INSTRUÇÕES DE DEPLOY:
// 1. No Supabase CLI: supabase functions deploy onboarding
// 2. Chamar após registro do usuário no auth
// 
// FUNÇÃO:
// Cria tenant, user, subscription (TRIAL) e stages padrão do pipeline
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface OnboardingRequest {
  user_name: string
  user_email: string
  tenant_name: string
}

interface OnboardingResponse {
  success: boolean
  tenant_id?: string
  subscription_id?: string
  stages_created?: number
  error?: string
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Criar cliente Supabase com token do usuário
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente com token do usuário para verificar autenticação
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

    // Obter dados do request
    const body: OnboardingRequest = await req.json()

    // Validar campos obrigatórios
    if (!body.user_name || !body.tenant_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: user_name, tenant_name' }), 
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Usar cliente com service role para criar registros
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar se usuário já tem tenant
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', user.id)
      .single()

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User already has a tenant',
          tenant_id: existingUser.tenant_id 
        }), 
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Chamar função de onboarding que cria tudo em uma transação
    const { data, error } = await supabaseAdmin.rpc('create_tenant_with_user', {
      p_auth_user_id: user.id,
      p_user_name: body.user_name,
      p_user_email: body.user_email || user.email,
      p_tenant_name: body.tenant_name,
    })

    if (error) {
      console.error('Erro no onboarding:', error)
      return new Response(
        JSON.stringify({ success: false, error: error.message }), 
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const response: OnboardingResponse = {
      success: true,
      tenant_id: data.tenant_id,
      subscription_id: data.subscription_id,
      stages_created: data.stages_created,
    }

    console.log('Onboarding concluído:', response)

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro no onboarding:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
