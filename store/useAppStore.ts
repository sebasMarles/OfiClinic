import { create } from "zustand";

type State = {
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  filterText: string;
  setFilterText: (v: string) => void;
};

export const useAppStore = create<State>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  filterText: "",
  setFilterText: (v) => set({ filterText: v }),
}));
