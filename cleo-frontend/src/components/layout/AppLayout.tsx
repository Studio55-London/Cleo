import { Outlet } from 'react-router-dom'
import { IconRail } from './IconRail'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background-secondary">
      {/* Icon Rail - Fixed 64px width */}
      <IconRail />

      {/* Main Content - Takes remaining space */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <Outlet />
      </main>
    </div>
  )
}
