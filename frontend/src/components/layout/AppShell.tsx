import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface AppShellProps {
  /** Usually <Island />. Pinned top centre. */
  top: ReactNode
  /** Usually <Composer />. Pinned to the bottom. */
  bottom?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * One column for every screen size. Phones: full width with a 16px gutter.
 * Desktop: the same compact column, centred, never stretched to the window.
 */
export function AppShell({ top, bottom, children, className }: AppShellProps) {
  return (
    <div className="relative min-h-dvh bg-graphite-25">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-wash" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-4">
        <header className="sticky top-0 z-20 -mx-4 flex justify-center bg-gradient-to-b from-graphite-25 from-75% to-transparent px-4 pb-5 pt-[max(12px,env(safe-area-inset-top))]">{top}</header>
        <main className={cn('flex flex-1 flex-col gap-6 pb-6 pt-2', className)}>{children}</main>
        {bottom && (
          <footer className="sticky bottom-0 z-20 -mx-4 bg-gradient-to-t from-graphite-25 from-60% to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-6">
            {bottom}
          </footer>
        )}
      </div>
    </div>
  )
}
