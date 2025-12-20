import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import App from './App'
import './index.css'

// Theme definitions (matching SettingsPage.tsx)
const themeMap: Record<string, { primaryHsl: string; primaryHoverHsl: string; primaryLightHsl: string }> = {
  'refined-elegance': { primaryHsl: '0 0% 45%', primaryHoverHsl: '0 0% 40%', primaryLightHsl: '0 0% 95%' },
  'enchanted-nature': { primaryHsl: '160 84% 39%', primaryHoverHsl: '160 84% 34%', primaryLightHsl: '160 84% 95%' },
  'serene-coastline': { primaryHsl: '189 94% 43%', primaryHoverHsl: '189 94% 38%', primaryLightHsl: '189 94% 95%' },
  'sunset-glow': { primaryHsl: '25 95% 53%', primaryHoverHsl: '25 95% 48%', primaryLightHsl: '25 95% 95%' },
  'monochrome-blues': { primaryHsl: '217 91% 60%', primaryHoverHsl: '217 91% 55%', primaryLightHsl: '217 91% 95%' },
  'forest-whispers': { primaryHsl: '142 71% 45%', primaryHoverHsl: '142 71% 40%', primaryLightHsl: '142 71% 95%' },
  'classic-neutrals': { primaryHsl: '80 61% 50%', primaryHoverHsl: '80 61% 45%', primaryLightHsl: '80 61% 95%' },
  'vintage-charm': { primaryHsl: '347 77% 50%', primaryHoverHsl: '347 77% 45%', primaryLightHsl: '347 77% 95%' },
  'dreamy-pastels': { primaryHsl: '330 81% 60%', primaryHoverHsl: '330 81% 55%', primaryLightHsl: '330 81% 95%' },
  'urban-chic': { primaryHsl: '239 84% 67%', primaryHoverHsl: '239 84% 60%', primaryLightHsl: '239 100% 95%' },
}

// Apply saved theme on app startup
const savedTheme = localStorage.getItem('cleo-theme')
if (savedTheme && themeMap[savedTheme]) {
  const theme = themeMap[savedTheme]
  document.documentElement.style.setProperty('--primary', theme.primaryHsl)
  document.documentElement.style.setProperty('--primary-hover', theme.primaryHoverHsl)
  document.documentElement.style.setProperty('--primary-light', theme.primaryLightHsl)
  document.documentElement.style.setProperty('--accent', theme.primaryHsl)
  document.documentElement.style.setProperty('--ring', theme.primaryHsl)
}

// Apply saved dark mode preference on app startup
const savedDarkMode = localStorage.getItem('cleo-dark-mode')
if (savedDarkMode === 'true') {
  document.documentElement.classList.add('dark')
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
