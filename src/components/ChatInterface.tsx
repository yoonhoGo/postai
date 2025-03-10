import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { ChatMessage } from "../types.js";
import { MessageList } from "./MessageList.js";
import { useInput } from "ink";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isProcessing,
}) => {
  const [inputValue, setInputValue] = useState<string>("");
  const [cursorPosition, setCursorPosition] = useState<number>(0);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const scrollRef = useRef<number>(0);

  // 스크롤 관리
  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current = Math.max(0, messages.length - 10);
    }
  }, [messages]);

  // 메시지 제출 처리
  const handleSubmit = (value: string) => {
    if (value.trim() && !isProcessing) {
      onSendMessage(value);
      setInputHistory((prev) => [...prev, value]);
      setInputValue("");
      setHistoryIndex(-1);
    }
  };

  // 키보드 입력 처리
  useInput((input, key) => {
    // 위쪽 화살표 - 히스토리 탐색
    if (key.upArrow && inputHistory.length > 0 && !isProcessing) {
      const newIndex =
        historyIndex < inputHistory.length - 1
          ? historyIndex + 1
          : historyIndex;
      setHistoryIndex(newIndex);
      setInputValue(inputHistory[inputHistory.length - 1 - newIndex] || "");
    }

    // 아래쪽 화살표 - 히스토리 탐색
    if (key.downArrow && historyIndex > -1 && !isProcessing) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setInputValue(
        newIndex >= 0 ? inputHistory[inputHistory.length - 1 - newIndex] : "",
      );
    }

    // 스크롤 조작
    if (key.pageUp) {
      scrollRef.current = Math.max(0, scrollRef.current - 5);
    }

    if (key.pageDown) {
      scrollRef.current = Math.min(
        Math.max(0, messages.length - 10),
        scrollRef.current + 5,
      );
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        <MessageList messages={messages} scrollPosition={scrollRef.current} />
      </Box>

      <Box>
        <Text>{"> "}</Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder={isProcessing ? "처리 중..." : "명령을 입력하세요..."}
          showCursor={!isProcessing}
        />
        {isProcessing && (
          <Box marginLeft={1}>
            <Text>
              <Spinner type="dots" />
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
