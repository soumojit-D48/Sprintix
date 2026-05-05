import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  activeModal: string | null
  activeSlideOver: string | null
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleSidebarCollapsed: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setActiveModal: (modal: string | null) => void
  setActiveSlideOver: (slideOver: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      activeModal: null,
      activeSlideOver: null,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      setActiveSlideOver: (slideOver) => set({ activeSlideOver: slideOver }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)
