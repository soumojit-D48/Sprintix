import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const cardVariants = cva(
  'group/card relative flex flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-colors hover:border-border/80 hover:shadow-md',
  {
    variants: {
      variant: {
        default: '',
        interactive: 'cursor-pointer hover:border-primary/50 hover:shadow-primary/10',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> &
  VariantProps<typeof cardVariants> & {
    asChild?: boolean
  }) {
  const Comp = props.asChild ? Slot.Root : 'div'

  return (
    <Comp
      data-slot="card"
      data-variant={variant}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-lg leading-none font-semibold tracking-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-6 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
