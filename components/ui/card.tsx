import * as React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined'
  interactive?: boolean
}

export function Card({ variant = 'default', interactive = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card-base',
        variant === 'elevated' && 'shadow-brand-md',
        variant === 'outlined' && 'shadow-none',
        interactive && 'cursor-pointer hover:shadow-brand-sm hover:-translate-y-0.5 transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-foreground', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

// Stat card for dashboard KPIs
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  accent?: boolean
}

export function StatCard({ title, value, subtitle, icon, trend, accent = false }: StatCardProps) {
  return (
    <Card
      className={cn(
        'p-6 relative overflow-hidden group transition-all duration-300',
        accent && 'bg-brand-600 text-white border-brand-700 shadow-brand-md hover:shadow-brand-lg',
      )}
    >
      {accent && (
        <div className="absolute -right-4 -top-4 h-24 w-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
      )}
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className={cn('text-[11px] font-extrabold uppercase tracking-widest', accent ? 'text-brand-100' : 'text-muted-foreground')}>
            {title}
          </p>
          <p className={cn('text-3xl font-black tracking-tight', accent ? 'text-white' : 'text-foreground')}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('text-xs font-medium', accent ? 'text-brand-200' : 'text-muted-foreground')}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn('inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-lg text-xs font-bold leading-none',
              trend.value >= 0 ? 
                (accent ? 'bg-white/20 text-white' : 'bg-success/10 text-success') : 
                (accent ? 'bg-white/20 text-white' : 'bg-danger/10 text-danger')
            )}>
              <span>{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 duration-300',
            accent ? 'bg-white/20 text-white' : 'bg-brand-200/50 dark:bg-brand-900/30 text-brand-700'
          )}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
