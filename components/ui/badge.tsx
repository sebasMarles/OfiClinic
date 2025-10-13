import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none'
  const variants: Record<Required<BadgeProps>['variant'], string> = {
    default: 'border-transparent bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900',
    secondary: 'border-transparent bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100',
    destructive: 'border-transparent bg-red-600 text-white dark:bg-red-600',
    outline: 'text-neutral-900 dark:text-neutral-100',
  }
  return <div className={cn(base, variants[variant], className)} {...props} />
}
