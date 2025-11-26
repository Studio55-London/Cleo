import { useState, useEffect } from 'react'
import { Key, Activity, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Theme {
  id: string
  name: string
  colors: {
    light: string
    medium: string
    accent: string
    dark: string
  }
}

const themes: Theme[] = [
  {
    id: 'refined-elegance',
    name: 'Refined Elegance',
    colors: { light: '#e8e8e8', medium: '#a3a3a3', accent: '#737373', dark: '#525252' },
  },
  {
    id: 'enchanted-nature',
    name: 'Enchanted Nature',
    colors: { light: '#d1fae5', medium: '#34d399', accent: '#0d9488', dark: '#0f766e' },
  },
  {
    id: 'serene-coastline',
    name: 'Serene Coastline',
    colors: { light: '#cffafe', medium: '#22d3d8', accent: '#0891b2', dark: '#0e7490' },
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    colors: { light: '#fef3c7', medium: '#fbbf24', accent: '#f97316', dark: '#ea580c' },
  },
  {
    id: 'monochrome-blues',
    name: 'Monochrome Blues',
    colors: { light: '#dbeafe', medium: '#60a5fa', accent: '#3b82f6', dark: '#2563eb' },
  },
  {
    id: 'forest-whispers',
    name: 'Forest Whispers',
    colors: { light: '#dcfce7', medium: '#4ade80', accent: '#22c55e', dark: '#16a34a' },
  },
  {
    id: 'classic-neutrals',
    name: 'Classic Neutrals',
    colors: { light: '#ecfccb', medium: '#a3e635', accent: '#84cc16', dark: '#65a30d' },
  },
  {
    id: 'vintage-charm',
    name: 'Vintage Charm',
    colors: { light: '#ffe4e6', medium: '#fb7185', accent: '#e11d48', dark: '#be123c' },
  },
  {
    id: 'dreamy-pastels',
    name: 'Dreamy Pastels',
    colors: { light: '#fce7f3', medium: '#f472b6', accent: '#ec4899', dark: '#db2777' },
  },
  {
    id: 'urban-chic',
    name: 'Urban Chic',
    colors: { light: '#e8e8e8', medium: '#6366f1', accent: '#64748b', dark: '#475569' },
  },
]

export function SettingsPanel() {
  const [currentTheme, setCurrentTheme] = useState('urban-chic')
  const [systemStatus] = useState<'healthy' | 'degraded' | 'error'>('healthy')

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('cleo-theme')
    if (savedTheme) {
      setCurrentTheme(savedTheme)
    }
  }, [])

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId)
    localStorage.setItem('cleo-theme', themeId)

    // Apply theme to document
    const theme = themes.find(t => t.id === themeId)
    if (theme) {
      document.documentElement.style.setProperty('--theme-bg-light', theme.colors.light)
      document.documentElement.style.setProperty('--theme-bg-medium', theme.colors.medium)
      document.documentElement.style.setProperty('--theme-accent', theme.colors.accent)
      document.documentElement.style.setProperty('--theme-bg-dark', theme.colors.dark)
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* External LLM API Keys */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-3">
            External LLM API Keys
          </h3>
          <Button variant="outline" className="w-full justify-start">
            <Key className="h-4 w-4 mr-2" />
            Configure API Keys
          </Button>
        </div>

        <Separator />

        {/* Color Palette */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-3">
            Color Palette
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                className={cn(
                  'relative p-2 rounded-lg border-2 transition-all',
                  currentTheme === theme.id
                    ? 'border-primary bg-primary-light'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="text-xs font-medium mb-2 truncate">{theme.name}</div>
                <div className="flex gap-1">
                  {Object.values(theme.colors).map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {currentTheme === theme.id && (
                  <div className="absolute top-1 right-1">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* System Status */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-tertiary mb-3">
            System Status
          </h3>
          <div className="flex items-center gap-2">
            <Badge
              variant={systemStatus === 'healthy' ? 'default' : 'destructive'}
              className={cn(
                systemStatus === 'healthy' && 'bg-success hover:bg-success'
              )}
            >
              <Activity className="h-3 w-3 mr-1" />
              {systemStatus}
            </Badge>
          </div>
          <div className="mt-3 space-y-1 text-xs text-foreground-tertiary">
            <p>API: Connected</p>
            <p>Database: Connected</p>
            <p>Vector Store: Connected</p>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
