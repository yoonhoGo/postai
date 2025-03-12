import { useState, useCallback } from "react";
import { ChatMessage } from "../types.js";
import { handleUserQuery } from "../services/chatService.js";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `
# POSTAI - HTTP API 클라이언트

Swagger 문서 관리와 API 요청에 특화된 인터페이스입니다.

시작하기:
1. Swagger 문서 로드: "https://petstore.swagger.io/v2/swagger.json 로드해줘"
2. API 요청: "GET /pet/findByStatus?status=available"

도움말: \`help\` 또는 \`도움말\`을 입력하세요.`,
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
