import { useTranslation } from 'react-i18next'
import { MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useUIStore } from '@/store/ui-store'
import type { AppView } from '@/store/ui-store'

interface LeftSideBarProps {
  children?: React.ReactNode
  className?: string
}

export function LeftSideBar({ children, className }: LeftSideBarProps) {
  const { t } = useTranslation()
  const currentView = useUIStore(state => state.currentView)

  const handleViewChange = (view: AppView) => {
    const { currentView: current, setCurrentView } = useUIStore.getState()
    // Toggle: if already on this view, go back to default
    setCurrentView(current === view ? 'default' : view)
  }

  return (
    <div
      className={cn('flex h-full flex-col border-r bg-background', className)}
    >
      {/* Navigation buttons */}
      <nav className="flex flex-col gap-1 p-2" aria-label="Main navigation">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={currentView === 'mapping' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => handleViewChange('mapping')}
              aria-pressed={currentView === 'mapping'}
            >
              <MapIcon className="size-4" />
              <span>{t('sidebar.mapping')}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {t('sidebar.mapping.tooltip')}
          </TooltipContent>
        </Tooltip>
      </nav>

      {/* Extensible area for additional content */}
      {children}
    </div>
  )
}
