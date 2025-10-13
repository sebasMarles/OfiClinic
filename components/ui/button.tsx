import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // base
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        // 🎨 Default lila
        default:
          'bg-purple-300 text-purple-900 hover:bg-purple-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 disabled:opacity-50 disabled:pointer-events-none dark:bg-purple-400 dark:text-neutral-950 dark:hover:bg-purple-300 dark:focus-visible:ring-purple-300/60',

        // ❗️Peligro
        destructive:
          'bg-red-500 text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 disabled:opacity-50 disabled:pointer-events-none',

        // ⭕️ Contorno lila
        outline:
          'border border-purple-300 text-purple-900 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/60 disabled:opacity-50 disabled:pointer-events-none dark:border-purple-400 dark:text-purple-100 dark:hover:bg-purple-400/10',

        // 🫧 Secundario neutro suave
        secondary:
          'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300/60 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',

        // 👻 Ghost con hover lila muy leve
        ghost:
          'text-purple-900 hover:bg-purple-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/60 disabled:opacity-50 disabled:pointer-events-none dark:text-purple-100 dark:hover:bg-purple-400/10',

        // 🔗 Link estilo texto
        link:
          'text-purple-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/60 disabled:opacity-50 disabled:pointer-events-none dark:text-purple-300',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-xl px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
