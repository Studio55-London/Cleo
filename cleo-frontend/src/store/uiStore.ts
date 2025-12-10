import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PanelType } from '@/components/layout/IconRail'

// Storage version - increment to reset corrupted localStorage
const UI_STORAGE_VERSION = 1

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
      version: UI_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentTheme: state.currentTheme,
      }),
      // Migration function to handle old storage format
      migrate: (persistedState: unknown, version: number) => {
        if (version < UI_STORAGE_VERSION) {
          return { currentTheme: 'urban-chic' }
        }
        return persistedState as { currentTheme: string }
      },
      // Handle rehydration errors
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('UI storage rehydration failed, clearing storage', error)
          localStorage.removeItem('cleo-ui-storage')
        }
      },
    }
  )
)
