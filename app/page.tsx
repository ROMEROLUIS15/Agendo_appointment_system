import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function RootPage() { // Puedes llamarlo RootPage o WelcomePage
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-surface">
      <div className="h-20 w-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
        <span className="text-3xl font-bold">A</span>
      </div>
      
      <h1 className="text-4xl font-bold text-foreground mb-4">Bienvenido a Agendo</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        La plataforma inteligente para gestionar tus citas, clientes y finanzas de forma profesional.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/login">
          <Button className="w-full sm:w-auto px-8">Iniciar Sesión</Button>
        </Link>
        <Link href="/register">
          <Button variant="secondary" className="w-full sm:w-auto px-8 border border-border">
            Crear Cuenta
          </Button>
        </Link>
      </div>
    </div>
  )
}
