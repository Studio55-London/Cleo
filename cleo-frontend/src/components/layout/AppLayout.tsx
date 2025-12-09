import { Outlet } from 'react-router-dom'
import { IconRail, type PanelType } from './IconRail'
import { ContextPanel } from './ContextPanel'
import { useUIStore } from '@/store/uiStore'

export function AppLayout() {
  const { activePanel, isPanelOpen, setActivePanel, closePanel } = useUIStore()

  const handlePanelChange = (panel: PanelType | null) => {
    setActivePanel(panel)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background-secondary">
      {/* Icon Rail - Fixed 64px width */}
      <IconRail
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
      />

      {/* Context Panel - Slides out from the left */}
      <ContextPanel
        isOpen={isPanelOpen}
        panelType={activePanel}
        onClose={closePanel}
      />

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <Outlet />
      </main>
    </div>
  )
}
