'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ROUTES, PROPERTY_TYPES, TRANSACTION_TYPES, PROPERTY_STATUSES } from '@/constants'
import { formatCurrency, translatePropertyType, translateTransactionType, translatePropertyStatus } from '@/lib/utils'
import type { Property } from '@/types'
import { Plus, Search, Building2, Pencil, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function PropertiesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTransaction, setFilterTransaction] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('ACTIVE')
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null)

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties', filterType, filterTransaction, filterStatus],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('properties')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (filterType !== 'all') {
        query = query.eq('property_type', filterType)
      }
      if (filterTransaction !== 'all') {
        query = query.eq('transaction_type', filterTransaction)
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as Property[]
    },
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('properties')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', propertyId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast({ title: 'Imóvel excluído com sucesso' })
      setDeleteProperty(null)
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir imóvel',
      })
    },
  })

  const filteredProperties = properties?.filter((p) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      p.city?.toLowerCase().includes(searchLower) ||
      p.neighborhood?.toLowerCase().includes(searchLower) ||
      p.title?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-muted-foreground">
            Gerencie seus imóveis cadastrados
          </p>
        </div>
        <Link href={ROUTES.PROPERTY_NEW}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Imóvel
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cidade, bairro ou título..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos tipos</SelectItem>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTransaction} onValueChange={setFilterTransaction}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Transação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PROPERTY_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Properties list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando imóveis...
        </div>
      ) : filteredProperties && filteredProperties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {translateTransactionType(property.transaction_type)}
                      </span>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600 ml-1">
                        {translatePropertyType(property.property_type)}
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      property.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      property.status === 'SOLD' ? 'bg-blue-100 text-blue-700' :
                      property.status === 'RENTED' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {translatePropertyStatus(property.status)}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-1">
                    {property.title || `${translatePropertyType(property.property_type)} em ${property.city}`}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {property.neighborhood ? `${property.neighborhood}, ` : ''}{property.city}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span>{property.bedrooms} quarto{property.bedrooms !== 1 ? 's' : ''}</span>
                    {property.bathrooms && <span>{property.bathrooms} banheiro{property.bathrooms !== 1 ? 's' : ''}</span>}
                    {property.area_m2 && <span>{property.area_m2} m²</span>}
                  </div>
                  
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(property.price)}
                  </p>
                </div>
                
                <div className="flex border-t">
                  <Link
                    href={`${ROUTES.PROPERTIES}/${property.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => setDeleteProperty(property)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-destructive hover:bg-red-50 transition-colors border-l"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum imóvel encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search || filterType !== 'all' || filterTransaction !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece cadastrando seu primeiro imóvel.'}
            </p>
            {!search && filterType === 'all' && filterTransaction === 'all' && (
              <Link href={ROUTES.PROPERTY_NEW}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Imóvel
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteProperty} onOpenChange={() => setDeleteProperty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir imóvel</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este imóvel? Esta ação pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProperty(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProperty && deleteMutation.mutate(deleteProperty.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
