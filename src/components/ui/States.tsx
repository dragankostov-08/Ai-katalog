import { AlertTriangle, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden border border-dashed border-ink/40 bg-white/60 px-6 py-10 text-center md:py-14">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-ink bg-paper">
        {icon ?? <SearchX className="h-5 w-5" aria-hidden />}
      </div>
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {children ? <div className="mx-auto mt-2 max-w-md text-graphite">{children}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title = 'Нешто тргна наопаку', children, action }: { title?: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="border-l-4 border-tomato bg-white px-5 py-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-tomato-ink" aria-hidden />
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {children ? <div className="mt-1 text-graphite">{children}</div> : null}
          {action ? <div className="mt-4 flex flex-wrap gap-3">{action}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xs bg-light/60 ${className}`} />
}

export function ToolCardSkeleton() {
  return (
    <div aria-hidden className="flex h-full flex-col border border-ink/10 bg-white p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
      <Skeleton className="mt-6 h-5 w-24" />
    </div>
  )
}
