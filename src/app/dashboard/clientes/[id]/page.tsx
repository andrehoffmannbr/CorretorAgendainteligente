'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth, useToast } from '@/hooks'
import { clientFormSchema, type ClientFormValues } from '@/lib/validations'
import { ROUTES, PROPERTY_TYPES, CLIENT_TRANSACTION_TYPES } from '@/constants'
import { toCents } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Client } from '@/types'
import type { Database } from '@/types/database'

type ClientUpdate = Database['public']['Tables']['clients']['Update']

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const { user, stages } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
      
      if (error) throw error
      return data as Client
    },
    enabled: !!clientId && !!user,
  })
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
  })

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        notes: client.notes || '',
        desired_transaction_type: client.desired_transaction_type,
        desired_property_type: client.desired_property_type || undefined,
        desired_bedrooms_min: client.desired_bedrooms_min || undefined,
        desired_bedrooms_max: client.desired_bedrooms_max || undefined,
        desired_price_min: client.desired_price_min ? client.desired_price_min / 100 : undefined,
        desired_price_max: client.desired_price_max ? client.desired_price_max / 100 : undefined,
        city: client.city || '',
        neighborhood: client.neighborhood || '',
        stage_id: client.stage_id,
      })
    }
  }, [client, form])

  const updateMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      const supabase = createClient()
      
      const updateData: ClientUpdate = {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        notes: data.notes || null,
        desired_transaction_type: data.desired_transaction_type,
        desired_property_type: data.desired_property_type || null,
        desired_bedrooms_min: data.desired_bedrooms_min ?? null,
        desired_bedrooms_max: data.desired_bedrooms_max ?? null,
        desired_price_min: data.desired_price_min ? toCents(data.desired_price_min) : null,
        desired_price_max: data.desired_price_max ? toCents(data.desired_price_max) : null,
        city: data.city || null,
        neighborhood: data.neighborhood || null,
        stage_id: data.stage_id,
      }
      
      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId)
      
      if (error) {
        if (error.message.includes('duplicate key') && error.message.includes('phone_normalized')) {
          throw new Error('Este telefone já está cadastrado para outro cliente.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      toast({ title: 'Cliente atualizado com sucesso!' })
      router.push(ROUTES.CLIENTS)
    },
    onError: (error: Error) => {
      console.error('Error updating client:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar cliente',
        description: error.message || 'Tente novamente.',
      })
    },
  })

  const onSubmit = (data: ClientFormValues) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cliente não encontrado</p>
        <Link href={ROUTES.CLIENTS}>
          <Button variant="link">Voltar para clientes</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.CLIENTS}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar Cliente</h1>
          <p className="text-muted-foreground">Atualize as informações do cliente</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage_id">Etapa do Pipeline *</Label>
              <Select
                value={form.watch('stage_id')}
                onValueChange={(value) => form.setValue('stage_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                rows={3}
                {...form.register('notes')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências de Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interesse</Label>
                <Select
                  value={form.watch('desired_transaction_type')}
                  onValueChange={(value) => form.setValue('desired_transaction_type', value as 'SALE' | 'RENT' | 'BOTH')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TRANSACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Imóvel</Label>
                <Select
                  value={form.watch('desired_property_type') || ''}
                  onValueChange={(value) => form.setValue('desired_property_type', value as 'APARTMENT' | 'HOUSE' | undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Qualquer</SelectItem>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quartos (mín)</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('desired_bedrooms_min')}
                />
              </div>

              <div className="space-y-2">
                <Label>Quartos (máx)</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('desired_bedrooms_max')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço mínimo (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('desired_price_min')}
                />
              </div>

              <div className="space-y-2">
                <Label>Preço máximo (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  {...form.register('desired_price_max')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input {...form.register('city')} />
              </div>

              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input {...form.register('neighborhood')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={ROUTES.CLIENTS}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
