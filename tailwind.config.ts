import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Sandstone Premium (marca principal) ───────────────────
        brand: {
          50:  '#FAF9F6',
          100: '#F4F1EA',
          200: '#E6DAC8',
          300: '#DCD2C8',
          400: '#CBB9A4',
          500: '#B8A692',
          600: '#A48D78', // ← primary: botones, links, iconos activos
          700: '#8C7765',
          800: '#756253',
          900: '#5D4F42',
        },
        // ── Neutros y Semánticos ─────────────────
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface:    'hsl(var(--surface))',
        border:     'hsl(var(--border))',
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Semánticos adaptados al tema Beige
        success:   '#728C6E',
        warning:   '#C5A059',
        danger:    '#A65D57',
        info:      '#6E87A6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'brand-sm': '0 1px 3px rgba(164, 141, 120, 0.12)',
        'brand-md': '0 4px 12px rgba(164, 141, 120, 0.18)',
        'brand-lg': '0 8px 30px rgba(164, 141, 120, 0.22)',
        'card':     '0 4px 20px rgba(164, 141, 120, 0.05)',
        'card-dark':'0 4px 20px rgba(0, 0, 0, 0.35)',
      },
      animation: {
        'fade-in':      'fadeIn 0.25s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'spin-slow':    'spin 2s linear infinite',
        'pulse-brand':  'pulseBrand 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBrand: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(164,141,120,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(164,141,120,0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
