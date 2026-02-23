'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
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
import type { Database } from '@/types/database'

type ClientInsert = Database['public']['Tables']['clients']['Insert']

export default function NewClientPage() {
  const router = useRouter()
  const { user, stages } = useAuth()
  const { toast } = useToast()
  
  // Get first stage as default
  const firstStage = stages.find(s => s.position === 1) || stages[0]
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      notes: '',
      desired_transaction_type: 'BOTH',
      desired_property_type: undefined,
      desired_bedrooms_min: undefined,
      desired_bedrooms_max: undefined,
      desired_price_min: undefined,
      desired_price_max: undefined,
      city: '',
      neighborhood: '',
      stage_id: firstStage?.id || '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: ClientFormValues) => {
      if (!user) throw new Error('Usuário não autenticado')
      
      const supabase = createClient()
      
      const insertData: ClientInsert = {
        tenant_id: user.tenant_id,
        created_by: user.id,
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
      
      const { error } = await supabase.from('clients').insert(insertData)
      
      if (error) {
        if (error.message.includes('duplicate key') && error.message.includes('phone_normalized')) {
          throw new Error('Este telefone já está cadastrado para outro cliente.')
        }
        throw error
      }
    },
    onSuccess: () => {
      toast({ title: 'Cliente cadastrado com sucesso!' })
      router.push(ROUTES.CLIENTS)
    },
    onError: (error: Error) => {
      console.error('Error creating client:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar cliente',
        description: error.message || 'Tente novamente.',
      })
    },
  })

  const onSubmit = (data: ClientFormValues) => {
    createMutation.mutate(data)
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
          <h1 className="text-2xl font-bold">Novo Cliente</h1>
          <p className="text-muted-foreground">Cadastre um novo cliente</p>
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
                placeholder="Nome completo do cliente"
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
                  placeholder="(11) 99999-9999"
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
                  placeholder="cliente@email.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
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
              {form.formState.errors.stage_id && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.stage_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre o cliente..."
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
                <Label htmlFor="desired_transaction_type">Interesse</Label>
                <Select
                  value={form.watch('desired_transaction_type')}
                  onValueChange={(value) => form.setValue('desired_transaction_type', value as 'SALE' | 'RENT' | 'BOTH')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label htmlFor="desired_property_type">Tipo de Imóvel</Label>
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
                <Label htmlFor="desired_bedrooms_min">Quartos (mín)</Label>
                <Input
                  id="desired_bedrooms_min"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...form.register('desired_bedrooms_min')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desired_bedrooms_max">Quartos (máx)</Label>
                <Input
                  id="desired_bedrooms_max"
                  type="number"
                  min={0}
                  placeholder="Sem limite"
                  {...form.register('desired_bedrooms_max')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="desired_price_min">Preço mínimo (R$)</Label>
                <Input
                  id="desired_price_min"
                  type="number"
                  min={0}
                  placeholder="0"
                  {...form.register('desired_price_min')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desired_price_max">Preço máximo (R$)</Label>
                <Input
                  id="desired_price_max"
                  type="number"
                  min={0}
                  placeholder="Sem limite"
                  {...form.register('desired_price_max')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  placeholder="Ex: São Paulo"
                  {...form.register('city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  placeholder="Ex: Moema"
                  {...form.register('neighborhood')}
                />
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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
