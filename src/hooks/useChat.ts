import { useCallback, useEffect, useState } from "react";
import { initPostAIAgent } from "../agents/postai-agent.js";
import { langfuseHandler } from "../langfuse.js";
import { model } from "../model.js";
import {
  apiRequestHandler,
  executeApiRequest,
} from "../services/handlers/api-request.handler.js";
import { helpHandler } from "../services/handlers/help.handler.js";
import { swaggerStorageHandler } from "../services/handlers/swagger-storage.handler.js";
import { swaggerHandler } from "../services/handlers/swagger.handler.js";
import { translateUserInput } from "../services/utils/language.util.js";
import { enhanceAgentResponse } from "../services/utils/response-enhancer.util.js";
import { translateToKorean } from "../services/utils/translation.util.js";
import { useSwaggerStore } from "../store/swagger.store.js";
import { ChatMessage } from "../types.js";

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
  const [agent, setAgent] = useState<any>(null);
  const [isAgentReady, setIsAgentReady] = useState<boolean>(false);

  // 에이전트 초기화
  useEffect(() => {
    const loadAgent = async () => {
      try {
        const postAIAgent = await initPostAIAgent();
        setAgent(postAIAgent);
        setIsAgentReady(true);
      } catch (error) {
        console.error("에이전트 초기화 실패:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `AI 에이전트를 초기화하지 못했습니다. 다음을 확인해주세요:
  1. 인터넷 연결 상태
  2. AWS 자격 증명 설정
  3. 충분한 권한이 있는지 여부

  자세한 오류: ${(error as Error).message}`,
            codeBlock: false,
          },
        ]);
      }
    };

    loadAgent();
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      // 사용자 메시지 추가
      setMessages((prev) => [
        ...prev,
        { role: "user", content, codeBlock: false },
      ]);
      setIsProcessing(true);

      try {
        // baseUrl 설정 명령어 처리
        const baseUrlMatch = content.match(
          /^(?:set-base-url|set-baseurl|baseurl)\s+(.+)/i,
        );
        if (baseUrlMatch) {
          const baseUrl = baseUrlMatch[1].trim();
          // 전역 상태에 baseUrl 저장
          useSwaggerStore.getState().setBaseUrl(baseUrl);

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `기본 URL이 '${baseUrl}'로 설정되었습니다. 이제 상대 경로로 API 요청이 가능합니다.`,
              codeBlock: false,
            },
          ]);
          setIsProcessing(false);
          return;
        }

        // 이전 API 요청 확인 처리 (실행/취소)
        const previousMessage =
          messages.length > 0 ? messages[messages.length - 1] : null;
        if (previousMessage?.content?.includes("요청을 실행하려면")) {
          if (
            content.toLowerCase() === "실행" ||
            content.toLowerCase() === "execute"
          ) {
            const apiResponse = await executeApiRequest(messages);
            setMessages((prev) => [...prev, ...apiResponse]);
            setIsProcessing(false);
            return;
          } else if (
            content.toLowerCase() === "취소" ||
            content.toLowerCase() === "cancel"
          ) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "API 요청이 취소되었습니다.",
                codeBlock: false,
              },
            ]);
            setIsProcessing(false);
            return;
          }
        }

        // API 요청 패턴 직접 감지 (HTTP 메서드 + 경로)
        const apiRequestMatch = content.match(
          /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+(\S+)(?:\s+(.+))?$/i,
        );

        if (apiRequestMatch) {
          const apiResponse = await apiRequestHandler(content, messages);
          setMessages((prev) => [...prev, ...apiResponse]);
          setIsProcessing(false);
          return;
        }

        // 자연어 API 요청 패턴 감지
        const naturalApiMatch = content.match(
          /(?:요청|호출|실행)해\s*(?:주세요|줘|봐)/i,
        );
        if (
          naturalApiMatch &&
          (content.includes("GET") ||
            content.includes("POST") ||
            content.includes("PUT") ||
            content.includes("DELETE") ||
            content.includes("/"))
        ) {
          // API 요청 명령어 추출을 위한 프롬프트
          const extractPrompt = `
  사용자가 API 요청을 하려고 합니다. 다음 메시지에서 HTTP 메서드, 경로, 파라미터를 추출하여
  'HTTP메서드 경로 {파라미터}' 형식으로 반환해주세요. 예를 들어 'GET /users/123'과 같은 형식입니다.
  파라미터가 있으면 JSON 형식으로 포함해주세요.

  사용자 메시지: ${content}

  오직 추출된 API 요청 형식만 반환하고 다른 설명은 하지 마세요.`;

          const extractResponse = await model.invoke(
            [{ role: "system", content: extractPrompt }],
            {
              callbacks: [langfuseHandler],
            },
          );

          const extractedCommand = (extractResponse.content as string).trim();
          const apiResponse = await apiRequestHandler(
            extractedCommand,
            messages,
          );
          setMessages((prev) => [...prev, ...apiResponse]);
          setIsProcessing(false);
          return;
        }

        // Swagger 명령어 직접 처리 (정규식으로 식별)
        const swaggerCommandMatch = content.match(
          /^swagger\s+(\S+)(?:\s+(.+))?$/i,
        );

        if (swaggerCommandMatch) {
          const command = swaggerCommandMatch[1].toLowerCase();
          const args = swaggerCommandMatch[2] || "";

          const swaggerResponse = await swaggerStorageHandler(command, args);
          setMessages((prev) => [...prev, ...swaggerResponse]);
          setIsProcessing(false);
          return;
        }

        // URL을 포함한 Swagger 로드 명령어 처리
        const swaggerUrlMatch =
          content.match(/swagger\s+(https?:\/\/[^\s]+)/i) ||
          content.match(/(https?:\/\/[^\s]+)\s+(?:swagger|로드|불러와)/i);

        if (swaggerUrlMatch) {
          const url = swaggerUrlMatch[1];
          const swaggerResponse = await swaggerHandler(url);
          setMessages((prev) => [...prev, ...swaggerResponse]);
          setIsProcessing(false);
          return;
        }

        // 도움말 명령어 처리
        const lowercaseContent = content.toLowerCase().trim();
        if (lowercaseContent === "help" || lowercaseContent === "도움말") {
          const helpMessages = helpHandler();
          setMessages((prev) => [...prev, ...helpMessages]);
          setIsProcessing(false);
          return;
        }

        const processedContent = await translateUserInput(content);

        // 에이전트 호출
        const agentResponses = await agent.runWithContext(
          processedContent,
          messages,
        );

        // 응답 개선 및 한국어 번역 (둘 다 수행)
        const enhancedResponses = await enhanceAgentResponse(
          agentResponses,
          `사용자 쿼리: ${content}`,
        );

        // 한국어 번역 추가
        const translatedResponses = await translateToKorean(
          enhancedResponses,
          `사용자 쿼리: ${content}`,
        );

        // 번역된 응답 메시지 추가
        setMessages((prev) => [...prev, ...translatedResponses]);
      } catch (error) {
        // 오류 메시지도 번역
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `오류가 발생했습니다: ${(error as Error).message}`,
          codeBlock: false,
        };

        const translatedError = await translateToKorean([errorMessage]);
        setMessages((prev) => [...prev, ...translatedError]);
      } finally {
        setIsProcessing(false);
      }
    },
    [messages, agent, isAgentReady],
  );

  return {
    messages,
    sendMessage,
    isProcessing,
    isAgentReady,
  };
};
