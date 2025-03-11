import { create } from "zustand";
import { SwaggerData } from "../types.js";

interface SwaggerState {
  current: SwaggerData | null;        // 현재 활성화된 Swagger
  loadedSwaggers: Map<string, SwaggerData>; // 로드된 모든 Swagger (이름: 데이터)
  history: string[];                  // 이전에 로드한 Swagger URL 목록

  // 액션
  setCurrent: (data: SwaggerData, name?: string) => void;
  addSwagger: (name: string, data: SwaggerData) => void;
  setCurrentByName: (name: string) => boolean;
  removeSwagger: (name: string) => void;
  clearSwaggers: () => void;
  addToHistory: (url: string) => void;
  getAllLoadedNames: () => string[];
}

export const useSwaggerStore = create<SwaggerState>((set, get) => ({
  current: null,
  loadedSwaggers: new Map(),
  history: [],

  setCurrent: (data: SwaggerData, name?: string) => {
    set({ current: data });
    if (name) {
      get().addSwagger(name, data);
    }
  },

  addSwagger: (name: string, data: SwaggerData) => {
    set((state) => {
      const newMap = new Map(state.loadedSwaggers);
      newMap.set(name, data);
      return { loadedSwaggers: newMap };
    });
  },

  setCurrentByName: (name: string) => {
    const data = get().loadedSwaggers.get(name);
    if (data) {
      set({ current: data });
      return true;
    }
    return false;
  },

  removeSwagger: (name: string) => {
    set((state) => {
      const newMap = new Map(state.loadedSwaggers);
      newMap.delete(name);

      // 현재 선택된 Swagger가 삭제되는 경우, current를 null로 설정
      const newState: Partial<SwaggerState> = { loadedSwaggers: newMap };
      if (state.current && newMap.size > 0 && !newMap.has(name)) {
        newState.current = newMap.values().next().value;
      } else if (newMap.size === 0) {
        newState.current = null;
      }

      return newState;
    });
  },

  clearSwaggers: () => {
    set({
      loadedSwaggers: new Map(),
      current: null
    });
  },

  addToHistory: (url: string) =>
    set((state) => ({
      history: state.history.includes(url)
        ? state.history
        : [url, ...state.history].slice(0, 10) // 최대 10개까지만 유지
    })),

  getAllLoadedNames: () => Array.from(get().loadedSwaggers.keys()),
}));
