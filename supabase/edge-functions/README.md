# Edge Functions - Instruções de Deploy

## Pré-requisitos

1. Supabase CLI instalado: `npm install -g supabase`
2. Projeto linkado: `supabase link --project-ref YOUR_PROJECT_ID`

## Secrets Necessários

Configure os seguintes secrets no Supabase Dashboard > Edge Functions > Secrets:

```
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_producao
MERCADO_PAGO_WEBHOOK_SECRET=sua_assinatura_secreta_webhook
APP_URL=https://seu-dominio.vercel.app
```

Para ambiente de teste, use:
```
MERCADO_PAGO_ACCESS_TOKEN=TEST-seu_access_token_teste
```

## Deploy das Functions

### 1. mercadopago-webhook

Recebe notificações do Mercado Pago sobre mudanças na assinatura.

```bash
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

**IMPORTANTE:** Use `--no-verify-jwt` pois o webhook vem do Mercado Pago, não de um usuário autenticado.

### 2. onboarding

Cria tenant, user, subscription e stages após registro.

```bash
supabase functions deploy onboarding
```

### 3. create-subscription

Cria a assinatura no Mercado Pago e retorna URL de checkout.

```bash
supabase functions deploy create-subscription
```

## Configuração do Webhook no Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em: Webhooks > Configurar notificações
4. Configure a URL: `https://[PROJECT_ID].supabase.co/functions/v1/mercadopago-webhook`
5. Selecione os eventos:
   - `subscription_preapproval` - Criação/atualização de assinatura
   - `subscription_authorized_payment` - Pagamento recorrente

## Habilitando o Auth Hook

Após executar o `rls.sql`, habilite o Auth Hook:

1. Acesse: Dashboard > Authentication > Hooks
2. Localize "Custom Access Token"
3. Selecione a função: `public.custom_access_token_hook`
4. Clique em Save

## Habilitando pg_cron

Para o cron de expiração de assinaturas:

1. Acesse: Dashboard > Database > Extensions
2. Habilite a extensão `pg_cron`
3. Execute no SQL Editor:

```sql
SELECT cron.schedule(
  'update-expired-subscriptions',
  '5 0 * * *', -- 00:05 UTC todos os dias
  $$SELECT public.update_expired_subscriptions()$$
);
```

Para verificar jobs agendados:
```sql
SELECT * FROM cron.job;
```

## URLs das Functions

Após deploy, as functions estarão disponíveis em:

- `https://[PROJECT_ID].supabase.co/functions/v1/mercadopago-webhook`
- `https://[PROJECT_ID].supabase.co/functions/v1/onboarding`
- `https://[PROJECT_ID].supabase.co/functions/v1/create-subscription`

## Testando Localmente

```bash
# Iniciar Supabase local
supabase start

# Servir functions localmente
supabase functions serve

# Testar onboarding
curl -X POST http://localhost:54321/functions/v1/onboarding \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_name": "Teste", "tenant_name": "Meu Escritório"}'
```
