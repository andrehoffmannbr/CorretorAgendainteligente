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
import { ROUTES, CLIENT_TRANSACTION_TYPES } from '@/constants'
import { formatPhone, translateTransactionType, translatePropertyType } from '@/lib/utils'
import type { Client, ClientStage } from '@/types'
import { Plus, Search, Users, Pencil, Trash2, Phone, Mail } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ClientsPage() {
  const { user, stages } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<string>('all')
  const [filterTransaction, setFilterTransaction] = useState<string>('all')
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', filterStage, filterTransaction],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('clients')
        .select('*, stage:client_stages(*)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (filterStage !== 'all') {
        query = query.eq('stage_id', filterStage)
      }
      if (filterTransaction !== 'all') {
        query = query.eq('desired_transaction_type', filterTransaction)
      }
      
      const { data, error } = await query
      if (error) throw error
      return data as (Client & { stage: ClientStage })[]
    },
    enabled: !!user,
  })

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('clients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', clientId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast({ title: 'Cliente excluído com sucesso' })
      setDeleteClient(null)
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cliente',
      })
    },
  })

  const filteredClients = clients?.filter((c) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.city?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes cadastrados
          </p>
        </div>
        <Link href={ROUTES.CLIENT_NEW}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
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
                placeholder="Buscar por nome, telefone, e-mail..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStage} onValueChange={setFilterStage}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas etapas</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTransaction} onValueChange={setFilterTransaction}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Interesse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {CLIENT_TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients list */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando clientes...
        </div>
      ) : filteredClients && filteredClients.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients.map((client) => (
            <Card key={client.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {client.stage?.name || 'Sem etapa'}
                    </span>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {translateTransactionType(client.desired_transaction_type)}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{client.name}</h3>
                  
                  <div className="space-y-1 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {formatPhone(client.phone)}
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {client.email}
                      </div>
                    )}
                  </div>

                  {/* Preferences */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {client.desired_property_type && (
                      <p>Tipo: {translatePropertyType(client.desired_property_type)}</p>
                    )}
                    {(client.desired_bedrooms_min || client.desired_bedrooms_max) && (
                      <p>
                        Quartos: {client.desired_bedrooms_min || 0}
                        {client.desired_bedrooms_max ? ` - ${client.desired_bedrooms_max}` : '+'}
                      </p>
                    )}
                    {client.city && (
                      <p>Local: {client.neighborhood ? `${client.neighborhood}, ` : ''}{client.city}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex border-t">
                  <Link
                    href={`${ROUTES.CLIENTS}/${client.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Link>
                  <button
                    onClick={() => setDeleteClient(client)}
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
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search || filterStage !== 'all' || filterTransaction !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece cadastrando seu primeiro cliente.'}
            </p>
            {!search && filterStage === 'all' && filterTransaction === 'all' && (
              <Link href={ROUTES.CLIENT_NEW}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Cadastrar Cliente
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir {deleteClient?.name}? Esta ação pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteClient(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteClient && deleteMutation.mutate(deleteClient.id)}
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
