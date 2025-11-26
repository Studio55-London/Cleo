import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PanelType } from '@/components/layout/IconRail'

interface UIState {
  // Panel state
  activePanel: PanelType | null
  isPanelOpen: boolean

  // Theme state
  currentTheme: string

  // Actions
  setActivePanel: (panel: PanelType | null) => void
  togglePanel: (panel: PanelType) => void
  closePanel: () => void
  setTheme: (themeName: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      activePanel: null,
      isPanelOpen: false,
      currentTheme: 'urban-chic',

      // Actions
      setActivePanel: (panel) => {
        set({
          activePanel: panel,
          isPanelOpen: panel !== null,
        })
      },

      togglePanel: (panel) => {
        const current = get().activePanel
        if (current === panel) {
          set({ activePanel: null, isPanelOpen: false })
        } else {
          set({ activePanel: panel, isPanelOpen: true })
        }
      },

      closePanel: () => {
        set({ activePanel: null, isPanelOpen: false })
      },

      setTheme: (themeName) => {
        set({ currentTheme: themeName })
      },
    }),
    {
      name: 'cleo-ui-storage',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
      }),
    }
  )
)
