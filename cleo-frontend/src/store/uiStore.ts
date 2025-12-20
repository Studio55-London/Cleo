import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Storage version - increment to reset corrupted localStorage
const UI_STORAGE_VERSION = 2

interface UIState {
  // Theme state
  currentTheme: string

  // Actions
  setTheme: (themeName: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      currentTheme: 'urban-chic',

      // Actions
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
