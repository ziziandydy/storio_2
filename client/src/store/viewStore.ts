import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'list' | 'calendar' | 'gallery';

interface ViewState {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
  cycleView: () => void;
}

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      currentView: 'list',
      setView: (view) => set({ currentView: view }),
      cycleView: () => set((state) => {
        const order: ViewMode[] = ['list', 'calendar', 'gallery'];
        const currentIndex = order.indexOf(state.currentView);
        const nextIndex = (currentIndex + 1) % order.length;
        return { currentView: order[nextIndex] };
      }),
    }),
    {
      name: 'storio-view-storage',
    }
  )
);
