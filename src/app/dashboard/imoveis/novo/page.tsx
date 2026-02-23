'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth, useToast } from '@/hooks'
import { propertyFormSchema, type PropertyFormValues } from '@/lib/validations'
import { ROUTES, PROPERTY_TYPES, TRANSACTION_TYPES } from '@/constants'
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

export default function NewPropertyPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: '',
      description: '',
      transaction_type: undefined,
      property_type: undefined,
      bedrooms: 0,
      bathrooms: undefined,
      area_m2: undefined,
      price: undefined,
      city: '',
      neighborhood: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: PropertyFormValues) => {
      if (!user) throw new Error('Usuário não autenticado')
      
      const supabase = createClient()
      
      const { error } = await supabase.from('properties').insert({
        tenant_id: user.tenant_id,
        created_by: user.id,
        title: data.title || null,
        description: data.description || null,
        transaction_type: data.transaction_type,
        property_type: data.property_type,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms || null,
        area_m2: data.area_m2 || null,
        price: toCents(data.price),
        city: data.city,
        neighborhood: data.neighborhood || null,
      })
      
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Imóvel cadastrado com sucesso!' })
      router.push(ROUTES.PROPERTIES)
    },
    onError: (error) => {
      console.error('Error creating property:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar imóvel',
        description: 'Tente novamente.',
      })
    },
  })

  const onSubmit = (data: PropertyFormValues) => {
    createMutation.mutate(data)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={ROUTES.PROPERTIES}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Imóvel</h1>
          <p className="text-muted-foreground">Cadastre um novo imóvel</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction_type">Tipo de Transação *</Label>
                <Select
                  value={form.watch('transaction_type')}
                  onValueChange={(value) => form.setValue('transaction_type', value as 'SALE' | 'RENT')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.transaction_type && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.transaction_type.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_type">Tipo de Imóvel *</Label>
                <Select
                  value={form.watch('property_type')}
                  onValueChange={(value) => form.setValue('property_type', value as 'APARTMENT' | 'HOUSE')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.property_type && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.property_type.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título (opcional)</Label>
              <Input
                id="title"
                placeholder="Ex: Apartamento com vista para o mar"
                {...form.register('title')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o imóvel..."
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Quartos *</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min={0}
                  {...form.register('bedrooms')}
                />
                {form.formState.errors.bedrooms && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.bedrooms.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bathrooms">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min={0}
                  {...form.register('bathrooms')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area_m2">Área (m²)</Label>
                <Input
                  id="area_m2"
                  type="number"
                  min={1}
                  {...form.register('area_m2')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                min={1}
                step="0.01"
                placeholder="Ex: 350000"
                {...form.register('price')}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Ex: São Paulo"
                  {...form.register('city')}
                />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.city.message}
                  </p>
                )}
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
          <Link href={ROUTES.PROPERTIES}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando...' : 'Salvar Imóvel'}
          </Button>
        </div>
      </form>
    </div>
  )
}
