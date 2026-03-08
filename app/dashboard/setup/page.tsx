import { createBusiness } from './actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Store, ArrowRight, Scissors, Sparkles } from 'lucide-react'

export default function SetupPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 shadow-brand-lg mb-6 rotate-3 transition-transform hover:rotate-0 duration-500">
            <Scissors size={40} className="text-white rotate-45" />
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight mb-3">
            ¡Bienvenido a Agendo!
          </h1>
          <p className="text-muted-foreground font-medium">
            Sencillez y elegancia para gestionar tu negocio.
          </p>
        </div>

        <Card className="p-10 border-t-8 border-t-brand-600 shadow-brand-lg rounded-[2.5rem] bg-card/50 backdrop-blur-sm">
          <form action={createBusiness} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Store size={16} className="text-brand-600" />
                  Nombre de tu negocio
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Ej. Barbería El Elegante"
                  className="input-base text-lg py-6 focus:ring-brand-600"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-600" />
                  Categoría o rubro
                </label>
                <select
                  id="category"
                  name="category"
                  required
                  className="input-base text-lg py-3 focus:ring-brand-600 appearance-none bg-surface"
                >
                  <option value="">Selecciona una opción</option>
                  <option value="Barbería">Barbería</option>
                  <option value="Estética / Belleza">Estética / Belleza</option>
                  <option value="Salud / Medicina">Salud / Medicina</option>
                  <option value="Consultoría">Consultoría</option>
                  <option value="Deportes / Gimnasio">Deportes / Gimnasio</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full py-6 text-lg group">
                Crear mi cuenta de negocio
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-8 px-8">
          Al crear tu negocio, aceptas nuestros términos de servicio y políticas de privacidad.
        </p>
      </div>
    </div>
  )
}
