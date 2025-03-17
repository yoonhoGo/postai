import { useCallback, useEffect, useState } from "react";
import { initApiAgentChain, executeApiRequestChain } from "../agents/index.js";
import { langfuseHandler } from "../langfuse.js";
import { model } from "../model.js";
// import { translateUserInput } from "../services/utils/language.util.js";
import { enhanceAgentResponse } from "../services/utils/response-enhancer.util.js";
// import { translateToKorean } from "../services/utils/translation.util.js";
import { useSwaggerStore } from "../store/swagger.store.js";
import { ChatMessage } from "../types.js";
import { findPreviousApiConfig } from "../services/utils/api-request.util.js";
import { apiRequestHandler } from "../services/handlers/api-request.handler.js";
import { helpHandler } from "../services/handlers/help.handler.js";
import { swaggerStorageHandler } from "../services/handlers/swagger-storage.handler.js";
import { swaggerHandler } from "../services/handlers/swagger.handler.js";
import {
  createHttpRequestAgent,
  createOutputFormattingAgent,
} from "../agents/index.js";

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `
# POSTAI - HTTP API 클라이언트

Swagger 문서 관리와 API 요청에 특화된 인터페이스입니다.

도움말: \`help\` 또는 \`도움말\`을 입력하세요.`,
      codeBlock: false,
    },
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [agentChain, setAgentChain] = useState<any>(null);
  const [isAgentReady, setIsAgentReady] = useState<boolean>(false);

  // HTTP 요청과 출력 포맷팅을 위한 개별 에이전트
  const [httpAgent, setHttpAgent] = useState<any>(null);
  const [outputAgent, setOutputAgent] = useState<any>(null);

  // 에이전트 체인 초기화
  useEffect(() => {
    const initAgents = async () => {
      try {
        // 에이전트 체인 초기화
        const chain = await initApiAgentChain();
        setAgentChain(chain);

        // 개별 에이전트 초기화 (실행 단계에서 필요)
        const httpRequestAgent = createHttpRequestAgent();
        const outputFormattingAgent = createOutputFormattingAgent();

        setHttpAgent(httpRequestAgent);
        setOutputAgent(outputFormattingAgent);
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

    initAgents();
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
            // 이전 API 요청 설정 찾기
            const requestConfig = findPreviousApiConfig(messages);
            if (!requestConfig) {
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: "실행할 API 요청을 찾을 수 없습니다.",
                  codeBlock: false,
                },
              ]);
              setIsProcessing(false);
              return;
            }

            // 새로운 에이전트 체인으로 API 요청 실행
            if (httpAgent && outputAgent) {
              const apiResponses = await executeApiRequestChain(
                requestConfig,
                httpAgent,
                outputAgent,
              );

              // 응답 개선 및 한국어 번역
              const enhancedResponses = await enhanceAgentResponse(
                apiResponses,
                `API 요청 실행: ${requestConfig.method} ${requestConfig.url}`,
              );

              setMessages((prev) => [...prev, ...enhancedResponses]);

              // 한국어 번역 추가
              // const translatedResponses = await translateToKorean(
              //   enhancedResponses,
              //   `API 요청 실행: ${requestConfig.method} ${requestConfig.url}`,
              // );

              // setMessages((prev) => [...prev, ...translatedResponses]);
            } else {
              // 기존 방식으로 실행 (호환성 유지)
              const apiResponse = await apiRequestHandler(content, messages);
              setMessages((prev) => [...prev, ...apiResponse]);
            }

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
          if (agentChain && isAgentReady) {
            // 새로운 에이전트 체인으로 처리
            const agentResponses = await agentChain.runWithContext(
              content,
              messages,
            );

            // 응답 개선 및 한국어 번역
            const enhancedResponses = await enhanceAgentResponse(
              agentResponses,
              `사용자 쿼리: ${content}`,
            );

            setMessages((prev) => [...prev, ...enhancedResponses]);

            // 한국어 번역 추가
            // const translatedResponses = await translateToKorean(
            //   enhancedResponses,
            //   `사용자 쿼리: ${content}`,
            // );

            // setMessages((prev) => [...prev, ...translatedResponses]);
          } else {
            // 기존 방식으로 처리 (호환성 유지)
            const apiResponse = await apiRequestHandler(content, messages);
            setMessages((prev) => [...prev, ...apiResponse]);
          }

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
          if (agentChain && isAgentReady) {
            // 새로운 에이전트 체인으로 처리
            const agentResponses = await agentChain.runWithContext(
              content,
              messages,
            );

            // 응답 개선 및 한국어 번역
            const enhancedResponses = await enhanceAgentResponse(
              agentResponses,
              `사용자 쿼리: ${content}`,
            );

            setMessages((prev) => [...prev, ...enhancedResponses]);

            // 한국어 번역 추가
            // const translatedResponses = await translateToKorean(
            //   enhancedResponses,
            //   `사용자 쿼리: ${content}`,
            // );

            // setMessages((prev) => [...prev, ...translatedResponses]);
          } else {
            // 기존 코드 유지 (호환성 측면)
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
          }

          setIsProcessing(false);
          return;
        }

        // Swagger 명령어 직접 처리
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

        // 에이전트 체인 사용 (일반 메시지 처리)
        if (agentChain && isAgentReady) {
          // const processedContent = await translateUserInput(content);
          // const agentResponses = await agentChain.runWithContext(
          //   processedContent,
          //   messages,
          // );
          const agentResponses = await agentChain.runWithContext(
            content,
            messages,
          );

          // 응답 개선 및 한국어 번역
          const enhancedResponses = await enhanceAgentResponse(
            agentResponses,
            `사용자 쿼리: ${content}`,
          );

          setMessages((prev) => [...prev, ...enhancedResponses]);

          // 한국어 번역 추가
          // const translatedResponses = await translateToKorean(
          //   enhancedResponses,
          //   `사용자 쿼리: ${content}`,
          // );

          // setMessages((prev) => [...prev, ...translatedResponses]);
        } else {
          // 에이전트 체인이 준비되지 않은 경우
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "에이전트가 준비 중입니다. 잠시 후 다시 시도해주세요.",
              codeBlock: false,
            },
          ]);
        }
      } catch (error) {
        // 오류 메시지도 번역
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `오류가 발생했습니다: ${(error as Error).message}`,
          codeBlock: false,
        };

        setMessages((prev) => [...prev, errorMessage]);
        // const translatedError = await translateToKorean([errorMessage]);
        // setMessages((prev) => [...prev, ...translatedError]);
      } finally {
        setIsProcessing(false);
      }
    },
    [messages, agentChain, isAgentReady, httpAgent, outputAgent],
  );

  return {
    messages,
    sendMessage,
    isProcessing,
    isAgentReady,
  };
};
