'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants'
import { formatCurrency, translatePropertyType } from '@/lib/utils'
import { Sparkles, Search, ExternalLink, User, Building2 } from 'lucide-react'
import type { PropertyClientMatch, Client, Property } from '@/types'

export default function MatchingPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: matches, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('property_client_matches')
        .select('*')
      
      if (error) throw error
      return data as PropertyClientMatch[]
    },
    enabled: !!user,
  })

  // Get client details for enriching matches
  const { data: clients } = useQuery({
    queryKey: ['all-clients'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('clients')
        .select('id, name, phone, city')
        .is('deleted_at', null)
      return data as Pick<Client, 'id' | 'name' | 'phone' | 'city'>[]
    },
    enabled: !!user,
  })

  // Get property details for enriching matches
  const { data: properties } = useQuery({
    queryKey: ['all-properties'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('properties')
        .select('id, title, city, neighborhood, price, bedrooms, property_type')
        .is('deleted_at', null)
        .eq('status', 'ACTIVE')
      return data as Pick<Property, 'id' | 'title' | 'city' | 'neighborhood' | 'price' | 'bedrooms' | 'property_type'>[]
    },
    enabled: !!user,
  })

  // Enrich matches with client and property data
  const enrichedMatches = matches?.map((match) => {
    const client = clients?.find((c) => c.id === match.client_id)
    const property = properties?.find((p) => p.id === match.property_id)
    return { ...match, client, property }
  })

  const filteredMatches = enrichedMatches?.filter((m) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      m.client?.name?.toLowerCase().includes(searchLower) ||
      m.property?.city?.toLowerCase().includes(searchLower) ||
      m.property?.neighborhood?.toLowerCase().includes(searchLower)
    )
  })

  // Group matches by client
  const matchesByClient = filteredMatches?.reduce((acc, match) => {
    if (!acc[match.client_id]) {
      acc[match.client_id] = {
        client: match.client,
        properties: [],
      }
    }
    if (match.property) {
      acc[match.client_id].properties.push(match.property)
    }
    return acc
  }, {} as Record<string, { client: typeof enrichedMatches[0]['client']; properties: typeof enrichedMatches[0]['property'][] }>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matching</h1>
        <p className="text-muted-foreground">
          Imóveis que combinam com as preferências de cada cliente
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente ou localização..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando matches...
        </div>
      ) : matchesByClient && Object.keys(matchesByClient).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(matchesByClient).map(([clientId, { client, properties }]) => (
            <Card key={clientId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{client?.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {properties.length} imóve{properties.length !== 1 ? 'is' : 'l'} compatíve{properties.length !== 1 ? 'is' : 'l'}
                      </p>
                    </div>
                  </div>
                  <Link href={`${ROUTES.CLIENTS}/${clientId}`}>
                    <Button variant="outline" size="sm">
                      Ver cliente
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.map((property) => (
                    <Link
                      key={property.id}
                      href={`${ROUTES.PROPERTIES}/${property.id}`}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {property.title || translatePropertyType(property.property_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">
                          {formatCurrency(property.price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum match encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search
                ? 'Tente ajustar sua busca.'
                : 'Cadastre imóveis e clientes com preferências compatíveis para ver as combinações.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
