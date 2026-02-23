import { z } from 'zod'

// Phone validation (Brazilian format)
const phoneRegex = /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/

export const phoneSchema = z
  .string()
  .min(1, 'Telefone é obrigatório')
  .regex(phoneRegex, 'Telefone inválido')

// Email validation
export const emailSchema = z
  .string()
  .email('E-mail inválido')
  .optional()
  .or(z.literal(''))

// Property form schema
export const propertyFormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  transaction_type: z.enum(['SALE', 'RENT'], {
    required_error: 'Selecione o tipo de transação',
  }),
  property_type: z.enum(['APARTMENT', 'HOUSE'], {
    required_error: 'Selecione o tipo de imóvel',
  }),
  bedrooms: z.coerce.number().min(0, 'Mínimo 0 quartos'),
  bathrooms: z.coerce.number().min(0).optional(),
  area_m2: z.coerce.number().min(1).optional(),
  price: z.coerce.number().min(1, 'Preço é obrigatório'),
  city: z.string().min(1, 'Cidade é obrigatória'),
  neighborhood: z.string().optional(),
})

export type PropertyFormValues = z.infer<typeof propertyFormSchema>

// Client form schema
export const clientFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: phoneSchema,
  email: emailSchema,
  notes: z.string().optional(),
  desired_transaction_type: z.enum(['SALE', 'RENT', 'BOTH']).default('BOTH'),
  desired_property_type: z.enum(['APARTMENT', 'HOUSE']).optional(),
  desired_bedrooms_min: z.coerce.number().min(0).optional(),
  desired_bedrooms_max: z.coerce.number().min(0).optional(),
  desired_price_min: z.coerce.number().min(0).optional(),
  desired_price_max: z.coerce.number().min(0).optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  stage_id: z.string().uuid('Selecione uma etapa'),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

// Login form schema
export const loginFormSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

// Register form schema
export const registerFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  tenantName: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
})

export type RegisterFormValues = z.infer<typeof registerFormSchema>
