'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth, useToast } from '@/hooks'
import { propertyFormSchema, type PropertyFormValues } from '@/lib/validations'
import { ROUTES, PROPERTY_TYPES, TRANSACTION_TYPES, PROPERTY_STATUSES } from '@/constants'
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
import type { Property, PropertyStatus } from '@/types'

export default function EditPropertyPage() {
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single()
      
      if (error) throw error
      return data as Property
    },
    enabled: !!propertyId && !!user,
  })
  
  const form = useForm<PropertyFormValues & { status: PropertyStatus }>({
    resolver: zodResolver(propertyFormSchema),
  })

  useEffect(() => {
    if (property) {
      form.reset({
        title: property.title || '',
        description: property.description || '',
        transaction_type: property.transaction_type,
        property_type: property.property_type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms || undefined,
        area_m2: property.area_m2 || undefined,
        price: property.price / 100, // Convert from cents
        city: property.city,
        neighborhood: property.neighborhood || '',
        status: property.status,
      })
    }
  }, [property, form])

  const updateMutation = useMutation({
    mutationFn: async (data: PropertyFormValues & { status: PropertyStatus }) => {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('properties')
        .update({
          title: data.title || null,
          description: data.description || null,
          transaction_type: data.transaction_type,
          property_type: data.property_type,
          status: data.status,
          bedrooms: data.bedrooms,
          bathrooms: data.bathrooms || null,
          area_m2: data.area_m2 || null,
          price: toCents(data.price),
          city: data.city,
          neighborhood: data.neighborhood || null,
        })
        .eq('id', propertyId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
      toast({ title: 'Imóvel atualizado com sucesso!' })
      router.push(ROUTES.PROPERTIES)
    },
    onError: (error) => {
      console.error('Error updating property:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar imóvel',
        description: 'Tente novamente.',
      })
    },
  })

  const onSubmit = (data: PropertyFormValues & { status: PropertyStatus }) => {
    updateMutation.mutate(data)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Imóvel não encontrado</p>
        <Link href={ROUTES.PROPERTIES}>
          <Button variant="link">Voltar para imóveis</Button>
        </Link>
      </div>
    )
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
          <h1 className="text-2xl font-bold">Editar Imóvel</h1>
          <p className="text-muted-foreground">Atualize as informações do imóvel</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction_type">Transação *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_type">Tipo *</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value) => form.setValue('status', value as PropertyStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                placeholder="Ex: Apartamento com vista para o mar"
                {...form.register('title')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
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
                {...form.register('price')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
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
          <Link href={ROUTES.PROPERTIES}>
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
