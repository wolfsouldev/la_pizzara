import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WorkspaceUi = { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void };

// Only a layout preference. Sessions, roles and remote data stay in TanStack Query.
export const useWorkspaceUi = create<WorkspaceUi>()(persist(
  set => ({ sidebarOpen: true, setSidebarOpen: sidebarOpen => set({ sidebarOpen }) }),
  { name: 'campus-workspace-ui', version: 1, partialize: state => ({ sidebarOpen: state.sidebarOpen }) },
));
