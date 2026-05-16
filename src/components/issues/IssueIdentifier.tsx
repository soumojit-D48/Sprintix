import { cn } from '@/lib/utils'

interface IssueIdentifierProps {
  identifier: string
  className?: string
}

export function IssueIdentifier({ identifier, className }: IssueIdentifierProps) {
  return (
    <span className={cn('text-muted-foreground font-mono text-xs tracking-tight', className)}>
      {identifier}
    </span>
  )
}
