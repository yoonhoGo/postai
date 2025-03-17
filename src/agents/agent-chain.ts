import { ChatMessage } from "../types.js";
import { langfuseHandler } from "../langfuse.js";
import {
  createSupervisorAgent,
  createApiUnderstandingAgent,
  createRequestConversionAgent,
  createHttpRequestAgent,
  createOutputFormattingAgent,
  createAuthManagementAgent,
} from "./index.js";

/**
 * HTTP API 요청을 처리하기 위한 에이전트 체인을 생성합니다.
 * 여러 특화된 에이전트가 협력하여 사용자 요청을 처리합니다.
 */
export async function createApiAgentChain() {
  // 각 에이전트 생성
  const supervisorAgent = createSupervisorAgent();
  const apiUnderstandingAgent = createApiUnderstandingAgent();
  const requestConversionAgent = createRequestConversionAgent();
  const httpRequestAgent = createHttpRequestAgent();
  const outputFormattingAgent = createOutputFormattingAgent();
  const authManagementAgent = createAuthManagementAgent();

  // 메인 함수: 전체 체인 흐름 처리
  return {
    runWithContext: async (
      userQuery: string,
      chatHistory: ChatMessage[] = [],
    ): Promise<ChatMessage[]> => {
      try {
        // 1. 슈퍼바이저 에이전트로 사용자 의도 파악
        const historyText = chatHistory
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join("\n");

        const supervisorResult = await supervisorAgent.invoke({
          userRequest: userQuery,
          conversation_history: historyText,
        });

        // 2. 슈퍼바이저 결정에 따른 처리
        switch (supervisorResult.action) {
          case "process_api_request":
            return await processApiRequest(
              userQuery,
              apiUnderstandingAgent,
              requestConversionAgent,
              httpRequestAgent,
              outputFormattingAgent,
              authManagementAgent,
            );

          case "request_more_info":
            return [
              {
                role: "assistant",
                content: `더 많은 정보가 필요합니다: ${supervisorResult.missingInfo?.join(", ") || "요청을 구체적으로 설명해주세요."}`,
                codeBlock: false,
              },
            ];

          case "provide_help":
            return [
              {
                role: "assistant",
                // 이 부분 수정
                content:
                  "helpMessage" in supervisorResult &&
                  supervisorResult.helpMessage
                    ? supervisorResult.helpMessage
                    : "무엇을 도와드릴까요?",
                codeBlock: false,
              },
            ];

          case "swagger_operation":
            return [
              {
                role: "assistant",
                // 이 부분 수정
                content:
                  "swaggerCommand" in supervisorResult &&
                  supervisorResult.swaggerCommand
                    ? `Swagger 작업이 필요합니다: ${supervisorResult.swaggerCommand}`
                    : "Swagger 작업을 처리해야 합니다.",
                codeBlock: false,
              },
            ];

          default:
            return [
              {
                role: "assistant",
                content:
                  supervisorResult.nextStep ||
                  "죄송합니다, 요청을 처리하는 방법을 결정할 수 없습니다.",
                codeBlock: false,
              },
            ];
        }
      } catch (error) {
        console.error("에이전트 체인 오류:", error);
        return [
          {
            role: "assistant",
            content: `에이전트 체인 처리 중 오류가 발생했습니다: ${(error as Error).message}`,
            codeBlock: false,
          },
        ];
      }
    },
  };
}

/**
 * API 요청을 처리하는 함수
 * 각 에이전트를 순차적으로 호출하여 API 요청을 처리합니다
 */
async function processApiRequest(
  userQuery: string,
  apiUnderstandingAgent: any,
  requestConversionAgent: any,
  httpRequestAgent: any,
  outputFormattingAgent: any,
  authManagementAgent: any,
): Promise<ChatMessage[]> {
  // 1. API 이해: 사용자 요청 분석
  const apiUnderstanding = await apiUnderstandingAgent.invoke({
    userRequest: userQuery,
  });

  let apiRequest = apiUnderstanding;

  // 2. 인증 정보 필요 시 처리
  if (apiUnderstanding.missingInfo?.includes("인증 정보")) {
    const authInfo = await authManagementAgent.invoke({
      userRequest: userQuery,
      apiRequest: apiUnderstanding,
    });

    // 인증 정보 병합
    apiRequest = {
      ...apiUnderstanding,
      headers: {
        ...apiUnderstanding.headers,
        ...authInfo.headers,
      },
      queryParams: {
        ...apiUnderstanding.queryParams,
        ...authInfo.queryParams,
      },
    };
  }

  // 3. 요청 변환: axios 형식으로 변환
  const requestConfig = await requestConversionAgent.invoke({
    apiRequest: apiRequest,
  });

  // 필수 정보 누락 시 처리
  if (!requestConfig.url) {
    return [
      {
        role: "assistant",
        content:
          "API 요청을 변환하는 중 오류가 발생했습니다: URL 정보가 누락되었습니다.",
        codeBlock: false,
      },
    ];
  }

  // 4. 요청 확인 메시지
  const messages: ChatMessage[] = [
    {
      role: "assistant",
      content: `다음 API 요청을 실행할 준비가 되었습니다:`,
      codeBlock: false,
    },
    {
      role: "assistant",
      content: JSON.stringify(requestConfig, null, 2),
      codeBlock: true,
      codeLanguage: "json",
    },
    {
      role: "assistant",
      content: "요청을 실행하려면 '실행' 또는 'execute'를 입력하세요.",
      codeBlock: false,
    },
  ];

  return messages;
}

/**
 * 실제 API 요청을 실행하고 결과를 처리하는 함수
 */
export async function executeApiRequestChain(
  requestConfig: any,
  httpRequestAgent: any,
  outputFormattingAgent: any,
): Promise<ChatMessage[]> {
  try {
    // 5. HTTP 요청 실행
    const httpResponse = await httpRequestAgent.invoke({
      axiosConfig: requestConfig,
    });

    // 6. 응답 포맷팅
    const formattedOutput = await outputFormattingAgent.invoke({
      httpResponse: httpResponse,
    });

    // 7. 결과 변환
    const messages: ChatMessage[] = [];

    // 상태 요약 추가
    messages.push({
      role: "assistant",
      content: formattedOutput.statusSummary,
      codeBlock: false,
    });

    // 포맷에 따른 응답 추가
    if (
      formattedOutput.format === "table" ||
      formattedOutput.format === "json"
    ) {
      messages.push({
        role: "assistant",
        content: formattedOutput.formattedResponse,
        codeBlock: true,
        codeLanguage: formattedOutput.format === "json" ? "json" : "markdown",
      });
    } else {
      messages.push({
        role: "assistant",
        content: formattedOutput.formattedResponse,
        codeBlock: false,
      });
    }

    // 추가 정보가 있으면 추가
    if (formattedOutput.additionalInfo) {
      messages.push({
        role: "assistant",
        content: formattedOutput.additionalInfo,
        codeBlock: false,
      });
    }

    return messages;
  } catch (error) {
    console.error("API 요청 실행 오류:", error);
    return [
      {
        role: "assistant",
        content: `API 요청 실행 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

/**
 * API 에이전트 체인 초기화 함수
 */
export async function initApiAgentChain() {
  try {
    const chain = await createApiAgentChain();
    return chain;
  } catch (error) {
    console.error("API 에이전트 체인 초기화 오류:", error);
    throw new Error(
      `에이전트 체인을 초기화할 수 없습니다: ${(error as Error).message}`,
    );
  }
}
