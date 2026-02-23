import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">ImobCRM</div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link href="/cadastro">
              <Button>Começar grátis</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900">
            Gerencie seus clientes e imóveis em um só lugar
          </h1>
          <p className="mb-10 text-xl text-gray-600">
            O CRM feito para corretores de imóveis. Pipeline visual, matching 
            inteligente entre clientes e imóveis, e agenda integrada.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/cadastro">
              <Button size="lg" className="px-8">
                Teste grátis por 7 dias
              </Button>
            </Link>
            <Link href="#recursos">
              <Button size="lg" variant="outline" className="px-8">
                Ver recursos
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <section id="recursos" className="mt-32">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Tudo que você precisa para vender mais
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="Pipeline Visual"
              description="Arraste e solte clientes entre etapas. Visualize todo seu funil de vendas de forma intuitiva."
            />
            <FeatureCard
              title="Matching Inteligente"
              description="O sistema encontra automaticamente os imóveis que combinam com o perfil de cada cliente."
            />
            <FeatureCard
              title="Gestão de Imóveis"
              description="Cadastre e organize seus imóveis com fotos, características e valores."
            />
          </div>
        </section>

        {/* Pricing */}
        <section className="mt-32">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Preço simples e transparente
          </h2>
          <div className="mx-auto max-w-md">
            <div className="rounded-2xl border bg-white p-8 shadow-lg">
              <div className="text-center">
                <p className="text-gray-600">Plano único</p>
                <div className="my-4">
                  <span className="text-5xl font-bold">R$49</span>
                  <span className="text-gray-600">/mês</span>
                </div>
                <p className="text-sm text-gray-500">
                  Após 7 dias de teste grátis
                </p>
              </div>
              <ul className="my-8 space-y-3">
                <PricingItem>Clientes ilimitados</PricingItem>
                <PricingItem>Imóveis ilimitados</PricingItem>
                <PricingItem>Pipeline visual (kanban)</PricingItem>
                <PricingItem>Matching inteligente</PricingItem>
                <PricingItem>Suporte por e-mail</PricingItem>
              </ul>
              <Link href="/cadastro" className="block">
                <Button className="w-full" size="lg">
                  Começar teste grátis
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t bg-white py-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; {new Date().getFullYear()} ImobCRM. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-xl font-semibold">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function PricingItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <svg
        className="h-5 w-5 text-green-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      {children}
    </li>
  )
}
