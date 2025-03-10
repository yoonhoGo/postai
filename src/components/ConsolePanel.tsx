import { Box, Text } from "ink";
import React from "react";
import { create } from "zustand";

interface ConsoleState {
  message: string;
  log: (message: string) => void;
  clear: () => void;
}

export const useConsole = create<ConsoleState>((set) => ({
  message: "",
  log: (message: string) =>
    set((state) => ({
      message: state.message + "\n" + message,
    })),
  clear: () => set({ message: "" }),
}));

export const ConsolePanel = () => {
  const message = useConsole((state) => state.message);

  return (
    <Box margin={1}>
      <Text>{message}</Text>
    </Box>
  );
};
