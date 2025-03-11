import { create } from "zustand";
import { SwaggerData } from "../types.js";

interface SwaggerState {
  current: SwaggerData | null;
  history: string[]; // 이전에 로드한 Swagger URL 목록
  setCurrent: (data: SwaggerData) => void;
  addToHistory: (url: string) => void;
  clear: () => void;
}

export const useSwaggerStore = create<SwaggerState>((set) => ({
  current: null,
  history: [],
  setCurrent: (data: SwaggerData) => set({ current: data }),
  addToHistory: (url: string) =>
    set((state) => ({
      history: state.history.includes(url)
        ? state.history
        : [url, ...state.history].slice(0, 10), // 최대 10개까지만 유지
    })),
  clear: () => set({ current: null }),
}));
