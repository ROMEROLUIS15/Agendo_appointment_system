import type { Metadata, Viewport } from 'next'
import './globals.css'

// ── Viewport separado (Next.js 14+ best practice) ────────────────────────────
export const viewport: Viewport = {
  themeColor: '#08080A',
  width: 'device-width',
  initialScale: 1,
  /*
    NOTE: viewportFit:'cover' was intentionally NOT set here.
    Setting it causes env(safe-area-inset-top) on <body> to become
    non-zero (e.g. 44px on iPhone), which pushes the 100vh dashboard
    shell below the visible screen bottom — hiding the bottom nav.
    The 80px fixed fallback in globals.css covers all Android nav bars
    without needing viewport-fit:cover.
  */
}

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: { default: 'Cronix', template: '%s – Cronix' },
  description: 'Plataforma inteligente para gestionar citas, clientes y finanzas.',
  icons: {
    icon: '/favicon.ico',
    apple: '/web-app-manifest-192x192.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
