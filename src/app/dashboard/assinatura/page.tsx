'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { translateSubscriptionStatus, formatCurrency } from '@/lib/utils'
import { SUBSCRIPTION_PRICE_CENTS } from '@/constants'
import { CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react'

export default function BillingPage() {
  const { user, subscription, refresh } = useAuth()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const isTrialActive = subscription?.status === 'TRIAL' && subscription.trial_ends_at
    ? new Date(subscription.trial_ends_at) > new Date()
    : false

  const isActive = subscription?.status === 'ACTIVE'
  const isPastDue = subscription?.status === 'PAST_DUE'
  const isCanceled = subscription?.status === 'CANCELED'

  const daysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  const handleSubscribe = async () => {
    if (!user) return
    setIsLoading(true)

    try {
      const supabase = createClient()
      
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          tenant_id: user.tenant_id,
          user_email: user.email,
        },
      })

      if (error) {
        throw error
      }

      if (data?.checkout_url) {
        // Redirect to Mercado Pago checkout
        window.location.href = data.checkout_url
      } else {
        throw new Error('URL de checkout não recebida')
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao criar assinatura',
        description: 'Tente novamente mais tarde.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura do ImobCRM
        </p>
      </div>

      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${
              isActive ? 'bg-green-500' :
              isTrialActive ? 'bg-blue-500' :
              isPastDue ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <div>
              <p className="font-medium">
                {subscription ? translateSubscriptionStatus(subscription.status) : 'Sem assinatura'}
              </p>
              {isTrialActive && (
                <p className="text-sm text-muted-foreground">
                  {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                </p>
              )}
              {isActive && subscription?.current_period_ends_at && (
                <p className="text-sm text-muted-foreground">
                  Próxima cobrança: {new Date(subscription.current_period_ends_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plano Pro</CardTitle>
          <CardDescription>
            Acesso completo a todas as funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{formatCurrency(SUBSCRIPTION_PRICE_CENTS)}</span>
            <span className="text-muted-foreground">/mês</span>
          </div>

          <ul className="space-y-2">
            <PlanFeature>Clientes ilimitados</PlanFeature>
            <PlanFeature>Imóveis ilimitados</PlanFeature>
            <PlanFeature>Pipeline visual (Kanban)</PlanFeature>
            <PlanFeature>Matching inteligente</PlanFeature>
            <PlanFeature>Dashboard de estatísticas</PlanFeature>
            <PlanFeature>Suporte por e-mail</PlanFeature>
          </ul>

          {/* Action based on status */}
          {(isTrialActive || isPastDue || (!isActive && !isTrialActive)) && (
            <div className="pt-4">
              {isPastDue && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Seu pagamento está pendente. Atualize sua forma de pagamento para continuar usando o serviço.
                  </p>
                </div>
              )}
              
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {isTrialActive ? 'Assinar agora' : isPastDue ? 'Atualizar pagamento' : 'Assinar agora'}
                  </>
                )}
              </Button>
              
              {isTrialActive && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Você pode continuar usando durante o período de teste
                </p>
              )}
            </div>
          )}

          {isActive && (
            <div className="pt-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-800">
                  Sua assinatura está ativa
                </p>
              </div>
            </div>
          )}

          {isCanceled && (
            <div className="pt-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  Sua assinatura foi cancelada. Assine novamente para continuar usando o serviço.
                </p>
              </div>
              
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubscribe}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Reativar assinatura
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment info */}
      {isActive && subscription?.mercado_pago_subscription_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações de pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pagamento processado via Mercado Pago
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ID: {subscription.mercado_pago_subscription_id}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PlanFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <Check className="h-4 w-4 text-green-500" />
      {children}
    </li>
  )
}
