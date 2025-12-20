import { useState, useEffect } from 'react'
import { Key, Activity, Check, User, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import { apiClient } from '@/api'
import { useQuery } from '@tanstack/react-query'

interface Theme {
  id: string
  name: string
  colors: {
    light: string
    medium: string
    accent: string
    dark: string
  }
  // HSL values for CSS variables (without hsl() wrapper)
  primaryHsl: string
  primaryHoverHsl: string
  primaryLightHsl: string
}

// Helper to convert hex to HSL string for CSS variables
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function lightenHsl(hsl: string, amount: number): string {
  const parts = hsl.split(' ')
  const h = parts[0]
  const s = parts[1]
  const l = parseInt(parts[2])
  return `${h} ${s} ${Math.min(95, l + amount)}%`
}

function darkenHsl(hsl: string, amount: number): string {
  const parts = hsl.split(' ')
  const h = parts[0]
  const s = parts[1]
  const l = parseInt(parts[2])
  return `${h} ${s} ${Math.max(5, l - amount)}%`
}

const themes: Theme[] = [
  {
    id: 'refined-elegance',
    name: 'Refined Elegance',
    colors: { light: '#e8e8e8', medium: '#a3a3a3', accent: '#737373', dark: '#525252' },
    primaryHsl: '0 0% 45%',
    primaryHoverHsl: '0 0% 40%',
    primaryLightHsl: '0 0% 95%',
  },
  {
    id: 'enchanted-nature',
    name: 'Enchanted Nature',
    colors: { light: '#d1fae5', medium: '#34d399', accent: '#0d9488', dark: '#0f766e' },
    primaryHsl: '160 84% 39%',
    primaryHoverHsl: '160 84% 34%',
    primaryLightHsl: '160 84% 95%',
  },
  {
    id: 'serene-coastline',
    name: 'Serene Coastline',
    colors: { light: '#cffafe', medium: '#22d3d8', accent: '#0891b2', dark: '#0e7490' },
    primaryHsl: '189 94% 43%',
    primaryHoverHsl: '189 94% 38%',
    primaryLightHsl: '189 94% 95%',
  },
  {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    colors: { light: '#fef3c7', medium: '#fbbf24', accent: '#f97316', dark: '#ea580c' },
    primaryHsl: '25 95% 53%',
    primaryHoverHsl: '25 95% 48%',
    primaryLightHsl: '25 95% 95%',
  },
  {
    id: 'monochrome-blues',
    name: 'Monochrome Blues',
    colors: { light: '#dbeafe', medium: '#60a5fa', accent: '#3b82f6', dark: '#2563eb' },
    primaryHsl: '217 91% 60%',
    primaryHoverHsl: '217 91% 55%',
    primaryLightHsl: '217 91% 95%',
  },
  {
    id: 'forest-whispers',
    name: 'Forest Whispers',
    colors: { light: '#dcfce7', medium: '#4ade80', accent: '#22c55e', dark: '#16a34a' },
    primaryHsl: '142 71% 45%',
    primaryHoverHsl: '142 71% 40%',
    primaryLightHsl: '142 71% 95%',
  },
  {
    id: 'classic-neutrals',
    name: 'Classic Neutrals',
    colors: { light: '#ecfccb', medium: '#a3e635', accent: '#84cc16', dark: '#65a30d' },
    primaryHsl: '80 61% 50%',
    primaryHoverHsl: '80 61% 45%',
    primaryLightHsl: '80 61% 95%',
  },
  {
    id: 'vintage-charm',
    name: 'Vintage Charm',
    colors: { light: '#ffe4e6', medium: '#fb7185', accent: '#e11d48', dark: '#be123c' },
    primaryHsl: '347 77% 50%',
    primaryHoverHsl: '347 77% 45%',
    primaryLightHsl: '347 77% 95%',
  },
  {
    id: 'dreamy-pastels',
    name: 'Dreamy Pastels',
    colors: { light: '#fce7f3', medium: '#f472b6', accent: '#ec4899', dark: '#db2777' },
    primaryHsl: '330 81% 60%',
    primaryHoverHsl: '330 81% 55%',
    primaryLightHsl: '330 81% 95%',
  },
  {
    id: 'urban-chic',
    name: 'Urban Chic',
    colors: { light: '#e8e8e8', medium: '#6366f1', accent: '#64748b', dark: '#475569' },
    primaryHsl: '239 84% 67%',
    primaryHoverHsl: '239 84% 60%',
    primaryLightHsl: '239 100% 95%',
  },
]

export function SettingsPage() {
  const { user } = useAuthStore()
  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: () => apiClient.get('/api/status').then(res => res.data),
  })
  const [currentTheme, setCurrentTheme] = useState('urban-chic')

  useEffect(() => {
    const savedTheme = localStorage.getItem('cleo-theme')
    if (savedTheme) {
      setCurrentTheme(savedTheme)
      const theme = themes.find(t => t.id === savedTheme)
      if (theme) {
        applyTheme(theme)
      }
    }
  }, [])

  const applyTheme = (theme: Theme) => {
    // Set the primary colors (HSL values without hsl() wrapper)
    document.documentElement.style.setProperty('--primary', theme.primaryHsl)
    document.documentElement.style.setProperty('--primary-hover', theme.primaryHoverHsl)
    document.documentElement.style.setProperty('--primary-light', theme.primaryLightHsl)
    // Also update shadcn/ui accent and ring to match
    document.documentElement.style.setProperty('--accent', theme.primaryHsl)
    document.documentElement.style.setProperty('--ring', theme.primaryHsl)
    // Set the theme colors for other uses
    document.documentElement.style.setProperty('--theme-bg-light', theme.colors.light)
    document.documentElement.style.setProperty('--theme-bg-medium', theme.colors.medium)
    document.documentElement.style.setProperty('--theme-accent', theme.colors.accent)
    document.documentElement.style.setProperty('--theme-bg-dark', theme.colors.dark)
  }

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId)
    localStorage.setItem('cleo-theme', themeId)

    const theme = themes.find(t => t.id === themeId)
    if (theme) {
      applyTheme(theme)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background px-6 py-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-foreground-secondary">
          Manage your account and application preferences
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-2">
                <Key className="h-4 w-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2">
                <Activity className="h-4 w-4" />
                System
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground-secondary">Username</label>
                      <p className="text-sm mt-1">{user?.username || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground-secondary">Email</label>
                      <p className="text-sm mt-1">{user?.email || 'Not set'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground-secondary">Role</label>
                      <p className="text-sm mt-1">
                        <Badge variant={user?.is_admin ? 'default' : 'secondary'}>
                          {user?.is_admin ? 'Admin' : 'User'}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground-secondary">Email Verified</label>
                      <p className="text-sm mt-1">
                        <Badge variant={user?.email_verified ? 'default' : 'destructive'}>
                          {user?.email_verified ? 'Verified' : 'Not Verified'}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Color Theme</CardTitle>
                  <CardDescription>Choose your preferred color palette</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {themes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={cn(
                          'relative p-3 rounded-lg border-2 transition-all text-left',
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
                              className="w-5 h-5 rounded"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {currentTheme === theme.id && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* API Keys Tab */}
            <TabsContent value="api" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>External LLM API Keys</CardTitle>
                  <CardDescription>Configure API keys for external language models</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline">
                    <Key className="h-4 w-4 mr-2" />
                    Configure API Keys
                  </Button>
                  <p className="text-sm text-foreground-tertiary mt-2">
                    API keys are stored securely and encrypted at rest.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Tab */}
            <TabsContent value="system" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                  <CardDescription>Current system health and connectivity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={status?.status === 'online' ? 'default' : 'destructive'}
                      className={cn(
                        status?.status === 'online' && 'bg-success hover:bg-success'
                      )}
                    >
                      <Activity className="h-3 w-3 mr-1" />
                      {status?.status || 'Unknown'}
                    </Badge>
                    <span className="text-sm text-foreground-secondary">
                      Version {status?.version || '2.0'}
                    </span>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-foreground-secondary">Database</label>
                      <p className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'h-2 w-2 rounded-full',
                          status?.environment?.database_status === 'connected' ? 'bg-success' : 'bg-destructive'
                        )} />
                        {status?.environment?.database || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="text-foreground-secondary">Vector Store</label>
                      <p className="flex items-center gap-2 mt-1">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        {status?.environment?.vector_store || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="text-foreground-secondary">Blob Storage</label>
                      <p className="flex items-center gap-2 mt-1">
                        <span className="h-2 w-2 rounded-full bg-success" />
                        {status?.environment?.blob_storage || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <label className="text-foreground-secondary">Agents Loaded</label>
                      <p className="mt-1">{status?.agents_count || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
