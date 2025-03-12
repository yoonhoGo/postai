import { Box } from "ink";
import React from "react";
import { ChatInterface } from "./components/ChatInterface.js";
import { Header } from "./components/Header.js";
import { StatusBar } from "./components/StatusBar.js";
import { useChat } from "./hooks/useChat.js";
import { ConsolePanel } from "./components/ConsolePanel.js";

const App = () => {
  const { messages, sendMessage, isProcessing } = useChat();

  return (
    <Box flexDirection="column" padding={1}>
      <Header />
      <Box flexGrow={1} flexDirection="column" minHeight={20}>
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          isProcessing={isProcessing}
        />
      </Box>
      <StatusBar isProcessing={isProcessing} />
      <ConsolePanel />
    </Box>
  );
};

export default App;
