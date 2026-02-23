'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { registerFormSchema, type RegisterFormValues } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { ROUTES } from '@/constants'

export default function CadastroPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      tenantName: '',
    },
  })
  
  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    
    try {
      const supabase = createClient()
      
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            tenant_name: data.tenantName,
          },
        },
      })
      
      if (authError) {
        let message = authError.message
        if (authError.message.includes('already registered')) {
          message = 'Este e-mail já está cadastrado'
        }
        toast({
          variant: 'destructive',
          title: 'Erro ao criar conta',
          description: message,
        })
        return
      }
      
      if (!authData.user) {
        toast({
          variant: 'destructive',
          title: 'Erro ao criar conta',
          description: 'Não foi possível criar sua conta. Tente novamente.',
        })
        return
      }
      
      // 2. Call onboarding edge function to create tenant, user profile, subscription
      const { error: onboardingError } = await supabase.functions.invoke('onboarding', {
        body: {
          user_id: authData.user.id,
          user_name: data.name,
          user_email: data.email,
          tenant_name: data.tenantName,
        },
      })
      
      if (onboardingError) {
        console.error('Onboarding error:', onboardingError)
        toast({
          variant: 'destructive',
          title: 'Erro ao configurar conta',
          description: 'Conta criada, mas houve um erro ao configurar. Faça login para continuar.',
        })
        router.push(ROUTES.LOGIN)
        return
      }
      
      toast({
        title: 'Conta criada!',
        description: 'Bem-vindo ao ImobCRM. Seu teste grátis de 7 dias começou.',
      })
      
      router.push(ROUTES.DASHBOARD)
      router.refresh()
    } catch (error) {
      console.error('Register error:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Link href="/" className="text-2xl font-bold text-primary">
              ImobCRM
            </Link>
          </div>
          <CardTitle className="text-2xl text-center">Criar conta</CardTitle>
          <CardDescription className="text-center">
            Comece seu teste grátis de 7 dias
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome da empresa/imobiliária</Label>
              <Input
                id="tenantName"
                type="text"
                placeholder="Ex: Imobiliária Silva"
                {...form.register('tenantName')}
                disabled={isLoading}
              />
              {form.formState.errors.tenantName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.tenantName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                {...form.register('name')}
                disabled={isLoading}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...form.register('email')}
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...form.register('password')}
                disabled={isLoading}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                {...form.register('confirmPassword')}
                disabled={isLoading}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Criando conta...' : 'Criar conta grátis'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Já tem conta?{' '}
              <Link
                href={ROUTES.LOGIN}
                className="text-primary hover:underline"
              >
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
