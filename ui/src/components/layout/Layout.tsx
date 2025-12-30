import { useState, useEffect, useCallback } from 'react'
import { Navbar } from './Navbar'
import { CommandPalette } from '@/components/CommandPalette'
import { Toaster } from '@/components/ui/sonner'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Global keyboard shortcut for command palette
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setCommandPaletteOpen(true)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="relative min-h-screen bg-background">
      <Navbar onCommandPaletteOpen={() => setCommandPaletteOpen(true)} />

      {/* Main content area */}
      <main>
        <div className="container max-w-5xl py-6 px-4 md:px-8">
          {children}
        </div>
      </main>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
      <Toaster position="bottom-right" />
    </div>
  )
}
