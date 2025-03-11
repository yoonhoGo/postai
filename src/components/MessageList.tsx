import React from "react";
import { Box, Text } from "ink";
import { ChatMessage } from "../types.js";
import SyntaxHighlight from "ink-syntax-highlight";
import Markdown from "./Markdown.js";

interface MessageListProps {
  messages: ChatMessage[];
  scrollPosition: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  scrollPosition,
}) => {
  // 보여줄 메시지 계산 (스크롤 위치 기반)
  const visibleMessages = messages.slice(scrollPosition, scrollPosition + 10);

  return (
    <Box flexDirection="column">
      {messages.length === 0 ? (
        <Text dimColor italic>
          API 질문을 해보세요. 예: "PetStore API의 엔드포인트 목록을 보여줘"
        </Text>
      ) : (
        visibleMessages.map((message, index) => (
          <Box
            key={index}
            flexDirection="column"
            marginBottom={1}
            paddingX={1}
            borderStyle={message.role === "user" ? "round" : undefined}
            borderColor={message.role === "user" ? "blue" : undefined}
          >
            <Box marginBottom={message.role === "assistant" ? 1 : 0}>
              <Text bold color={message.role === "user" ? "blue" : "green"}>
                {message.role === "user" ? "사용자" : "POSTAI"}
                {": "}
              </Text>
            </Box>

            {message.codeBlock ? (
              <Box marginLeft={2}>
                <SyntaxHighlight
                  language={message.codeLanguage || "json"}
                  code={message.content}
                />
              </Box>
            ) : (
              <Markdown>{message.content}</Markdown>
            )}
          </Box>
        ))
      )}

      {messages.length > 10 && (
        <Text dimColor italic>
          {`${scrollPosition + 1}-${Math.min(scrollPosition + 10, messages.length)} / ${messages.length} (PgUp/PgDn으로 스크롤)`}
        </Text>
      )}
    </Box>
  );
};
