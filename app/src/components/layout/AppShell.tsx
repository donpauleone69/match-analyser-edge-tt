import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="min-h-screen bg-bg-surface">
      {/* Sidebar - desktop only */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <main className="lg:ml-60">
        <Outlet />
      </main>

      {/* Mobile bottom nav - TODO: implement */}
    </div>
  )
}

