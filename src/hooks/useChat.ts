import { useState, useCallback } from "react";
import { ChatMessage } from "../types.js";
import { handleUserQuery } from "../services/chatService.js";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `
안녕하세요! API 탐색과 요청에 도움이 필요하신가요? 어떤 API를 사용하고 싶으신지 알려주세요.
활용 예시는 \`help\` 혹은 \`도움말\`이라고 입력해 주세요.`,
      codeBlock: false,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const sendMessage = useCallback(
    async (content: string) => {
      // 사용자 메시지 추가
      setMessages((prev) => [
        ...prev,
        { role: "user", content, codeBlock: false },
      ]);
      setIsProcessing(true);

      try {
        // API 처리 서비스 호출
        const response = await handleUserQuery(content, messages);

        // 응답 메시지 추가
        setMessages((prev) => [...prev, ...response]);
      } catch (error) {
        // 오류 메시지 추가
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `오류가 발생했습니다: ${(error as Error).message}`,
            codeBlock: false,
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [messages],
  );

  return {
    messages,
    sendMessage,
    isProcessing,
  };
};
