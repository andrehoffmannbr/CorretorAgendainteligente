'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Building2, Users, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { ROUTES } from '@/constants'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  const { data: recentMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ['recent-matches'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recent_matches')
        .select('*')
        .limit(5)
      
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  const { data: clientsByStage } = useQuery({
    queryKey: ['clients-by-stage'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients_by_stage')
        .select('*')
        .order('stage_position')
      
      if (error) throw error
      return data
    },
    enabled: !!user,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.name?.split(' ')[0]}!
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Imóveis Ativos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.active_properties || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              de {stats?.total_properties || 0} cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_clients || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Matches</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_matches || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              combinações encontradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientsByStage?.find(s => s.is_final)?.client_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              clientes fechados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline overview */}
      {clientsByStage && clientsByStage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {clientsByStage.map((stage) => (
                <Link
                  key={stage.stage_id}
                  href={ROUTES.PIPELINE}
                  className="flex-shrink-0 rounded-lg border p-4 min-w-[150px] hover:bg-gray-50 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{stage.stage_name}</p>
                  <p className="text-2xl font-bold mt-1">{stage.client_count}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent matches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Matches Recentes</CardTitle>
          <Link
            href={ROUTES.MATCHING}
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </Link>
        </CardHeader>
        <CardContent>
          {matchesLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : recentMatches && recentMatches.length > 0 ? (
            <div className="space-y-3">
              {recentMatches.map((match, index) => (
                <div
                  key={`${match.client_id}-${match.property_id}-${index}`}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{match.client_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {match.property_title || 'Imóvel'} em {match.property_city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">
                      {formatCurrency(match.property_price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum match encontrado ainda.</p>
              <p className="text-sm">
                Cadastre imóveis e clientes para ver as combinações.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
