# CRM Imobiliário SaaS - Documentação do Projeto

## 📋 Informações Gerais

- **Nome:** CRM Imobiliário SaaS Inteligente
- **Versão:** MVP 1.0
- **Data Início:** 23/02/2026
- **Stack:** Next.js 14 (App Router) + Supabase + Mercado Pago

---

## 🎯 Pilares do Produto

1. Multi-tenant (cada corretor = 1 tenant)
2. Billing recorrente via Mercado Pago
3. Matching determinístico entre imóveis e clientes
4. Pipeline visual com drag-bar (kanban)
5. Modo leitura após vencimento
6. Preparado para colaboradores (futuro)
7. Preparado para IA (futuro)

---

## 🛠 Stack Tecnológica

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod (validação)
- TanStack Query (data fetching)
- Zustand (estado global)

### Backend
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS (Row Level Security)
- Supabase Edge Functions
- pg_cron (jobs agendados)

### Pagamentos
- Mercado Pago (assinatura recorrente)

---

## 📊 Modelagem de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `tenants` | Escritório/corretor (multi-tenant) |
| `users` | Usuários vinculados a tenant |
| `subscriptions` | Controle de assinatura/billing |
| `properties` | Imóveis cadastrados |
| `clients` | Clientes/leads |
| `client_stages` | Etapas do pipeline (kanban) |
| `audit_log` | Log de auditoria (opcional) |

### VIEW
| View | Descrição |
|------|-----------|
| `property_client_matches` | Matching entre imóveis e clientes |

---

## 💰 Modelo de Negócio

- **Plano Base:** R$ 49/mês
- **Trial:** 14 dias gratuitos
- **Colaborador Extra:** R$ 29/mês (futuro)
- **Modo Leitura:** Após vencimento (não bloqueia acesso)

---

## 🔐 Segurança

- RLS em todas as tabelas principais
- JWT claim customizado com `tenant_id`
- Isolamento total entre tenants

---

## 📁 Estrutura de Arquivos

```
projeto/
├── docs/                    # Documentação
│   ├── PROJETO.md          # Este arquivo
│   └── PROGRESSO.md        # Relatório de progresso
├── supabase/
│   ├── schema.sql          # Schema do banco
│   ├── rls.sql             # Políticas RLS
│   ├── views.sql           # Views (matching)
│   ├── functions.sql       # Functions SQL
│   └── edge-functions/     # Edge Functions
├── src/                    # Código Next.js
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   └── constants/
└── public/
```

---

## 📌 Decisões Arquiteturais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Stages do pipeline | Fixos no MVP | Simplicidade |
| Title do imóvel | Opcional | Reduz fricção |
| Banheiros no matching | Não | Menos edge cases |
| Transaction type cliente | SALE/RENT/BOTH | Flexibilidade |
| Slug do tenant | Removido MVP | Não necessário |
| Telefone duplicado | Constraint UNIQUE | Evita duplicatas |
| RLS strategy | JWT claim | Performance |
| Matching | VIEW (sob demanda) | Sempre atualizado |

---

## 🔗 Referências

- [Supabase Docs](https://supabase.com/docs)
- [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
