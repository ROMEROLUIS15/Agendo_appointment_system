import * as React from 'react'
import { cn } from '@/lib/utils'
import type { AppointmentStatus } from '@/types'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'dual'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-muted text-muted-foreground border border-border/50',
  success: 'bg-success/15 dark:bg-success/20 text-success-foreground font-bold border border-success/10',
  warning: 'bg-warning/15 dark:bg-warning/20 text-warning-foreground font-bold border border-warning/10',
  danger:  'bg-danger/15 dark:bg-danger/20 text-danger-foreground font-bold border border-danger/10',
  info:    'bg-info/15 dark:bg-info/20 text-info-foreground font-bold border border-info/10',
  brand:   'bg-brand-600 text-white shadow-brand-sm border border-brand-500',
  dual:    'bg-brand-50/80 dark:bg-brand-900/40 text-brand-700 dark:text-brand-400 ring-1 ring-brand-300/30 border border-brand-200/50',
}

export function Badge({ variant = 'default', dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn('badge', variantClasses[variant], className)}
      {...props}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-green-500':  variant === 'success',
          'bg-yellow-500': variant === 'warning',
          'bg-red-500':    variant === 'danger',
          'bg-blue-500':   variant === 'info',
          'bg-brand-600':  variant === 'brand' || variant === 'dual',
          'bg-gray-500':   variant === 'default',
        })} />
      )}
      {children}
    </span>
  )
}

// Appointment status badge with semantic colors
const statusVariant: Record<AppointmentStatus, BadgeVariant> = {
  pending:   'warning',
  confirmed: 'success',
  completed: 'default',
  cancelled: 'danger',
  no_show:   'danger',
}

const statusLabel: Record<AppointmentStatus, string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show:   'No asistió',
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge variant={statusVariant[status]} dot>
      {statusLabel[status]}
    </Badge>
  )
}

// Dual booking star badge
export function DualBookingBadge() {
  return (
    <Badge variant="dual">
      ⭐ Doble cita
    </Badge>
  )
}
