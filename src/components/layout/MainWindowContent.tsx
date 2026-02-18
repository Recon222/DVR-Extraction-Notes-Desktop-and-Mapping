import { Suspense, lazy } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/ui-store'

// Lazy load the MapTimelineView to avoid bundling map code when not needed
const MapTimelineView = lazy(() =>
  import('@/features/mapTimeline').then(mod => ({
    default: mod.MapTimelineView,
  }))
)

interface MainWindowContentProps {
  children?: React.ReactNode
  className?: string
}

/**
 * Fallback shown while the MapTimelineView chunk loads.
 */
function MapLoadingFallback() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  )
}

export function MainWindowContent({
  children,
  className,
}: MainWindowContentProps) {
  const currentView = useUIStore(state => state.currentView)
  const lastQuickPaneEntry = useUIStore(state => state.lastQuickPaneEntry)

  return (
    <div className={cn('relative flex h-full flex-col bg-background', className)}>
      {currentView === 'mapping' ? (
        <Suspense fallback={<MapLoadingFallback />}>
          {/* MemoryRouter provides the router context that MapTimelineView's
              useNavigate() hook requires. The navigate call is only used in
              viewer mode, so this is effectively a no-op wrapper. */}
          <MemoryRouter>
            <MapTimelineView />
          </MemoryRouter>
        </Suspense>
      ) : (
        children || (
          <div className="flex flex-1 flex-col items-center justify-center">
            <h1 className="text-4xl font-bold text-foreground">
              {lastQuickPaneEntry
                ? `Last entry: ${lastQuickPaneEntry}`
                : 'Hello World'}
            </h1>
          </div>
        )
      )}
    </div>
  )
}
