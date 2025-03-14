import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { model } from "../model.js";
import {
  apiRequestTool,
  swaggerTool,
  swaggerSearchTool,
  swaggerRequestSearchTool,
  swaggerResponseSearchTool
} from "../tools/index.js";
import { langfuseHandler } from "../langfuse.js";
import { ChatMessage } from "../types.js";
import { useSwaggerStore } from "../store/swagger.store.js";
import { ChainValues } from "@langchain/core/utils/types";

// 시스템 프롬프트
const systemMessage = `당신은 POSTAI라는 고급 API 탐색 및 테스트 도구입니다.

사용자의 자연어 명령을 이해하여 다음 작업을 수행합니다:
1. Swagger/OpenAPI 문서 로드, 저장, 관리
2. API 엔드포인트 검색 및 분석
3. API 요청 생성 및 실행
4. 결과 분석 및 설명

중요:
- 사용자에게 명확한 정보와 가이드를 제공하세요
- 사용자의 질문이 명확하지 않을 때는 추가 정보를 요청하세요
- 항상 현재 로드된 문서 내용에 기반하여 응답하세요

사용 가능한 도구:
- swagger_parser: Swagger 문서 로드
- swagger_search: API 엔드포인트 검색
- swagger_request_search: API 요청 정보 검색
- swagger_response_search: API 응답 정보 검색
- api_request: 실제 API 호출 실행

계획을 세우고 단계적으로 실행하세요. 각 단계에서:
1. 사용자 의도 이해
2. 필요한 도구 결정
3. 도구 실행
4. 결과 해석
5. 다음 단계 결정 또는 최종 응답 제공`;

// 프롬프트 템플릿
const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemMessage],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

// 도구 배열
const tools = [
  apiRequestTool,
  swaggerTool,
  swaggerSearchTool,
  swaggerRequestSearchTool,
  swaggerResponseSearchTool
];

// 에이전트 생성 및 초기화 함수
export const initPostAIAgent = async () => {
  try {
    // 비동기적으로 에이전트 생성
    const agent = await createOpenAIToolsAgent({
      llm: model,
      tools,
      prompt
    });

    // 에이전트 실행기 생성
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      returnIntermediateSteps: true,
      handleParsingErrors: true,  // 추가: 파싱 오류 처리
      maxIterations: 5,           // 추가: 최대 반복 횟수 설정
      earlyStoppingMethod: "force" // 추가: 강제 종료 방법 설정
    });

    return {
      runWithContext: async (userQuery: string, chatHistory: ChatMessage[]) => {
        try {
          // 현재 Swagger 컨텍스트 정보 가져오기
          const swaggerStore = useSwaggerStore.getState();
          const currentSwagger = swaggerStore.current;
          const loadedSwaggers = swaggerStore.getAllLoadedNames();

          // 컨텍스트 정보 주입
          const contextInfo = `
현재 상태:
- 로드된 API 문서: ${currentSwagger ? `${currentSwagger.title} (v${currentSwagger.version})` : "없음"}
- 저장된 다른 문서: ${loadedSwaggers.length > 0 ? loadedSwaggers.join(", ") : "없음"}
- 사용 가능한 API 엔드포인트: ${currentSwagger ? currentSwagger.paths.length : 0}개
`;

          // 에이전트 호출
          const result = await agentExecutor.invoke({
            input: contextInfo + "\n사용자 쿼리: " + userQuery,
            chat_history: chatHistory.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
          }, {
            callbacks: [langfuseHandler],
          });

          // 에이전트 응답 파싱
          return parseAgentResponse(result);
        } catch (error) {
          console.error("에이전트 실행 오류:", error);
          return [{
            role: "assistant",
            content: `에이전트 처리 중 오류가 발생했습니다: ${(error as Error).message}`,
            codeBlock: false
          }];
        }
      }
    };
  } catch (error) {
    console.error("에이전트 초기화 오류:", error);
    throw new Error(`에이전트를 초기화할 수 없습니다: ${(error as Error).message}`);
  }
};

// 에이전트 응답을 ChatMessage[] 형식으로 변환
function parseAgentResponse(result: ChainValues): ChatMessage[] {
  try {
    const steps: any[] = result.intermediateSteps || [];
    const finalOutput = result.output || "응답을 생성할 수 없습니다.";

    const messages: ChatMessage[] = [];

    // 도구 사용 과정을 단순 로그가 아닌 실제 결과로 처리
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      messages.push({
        role: "assistant",
        content: `${lastStep.action.tool} 도구 실행 결과:`,
        codeBlock: false
      });

      messages.push({
        role: "assistant",
        content: lastStep.observation,
        codeBlock: true
      });
    }

    // 최종 응답 추가
    if (finalOutput.includes("```")) {
      // 코드 블록 분리
      const codeBlockMatch = finalOutput.match(/```(\w*)\n([\s\S]*?)```/);

      if (codeBlockMatch) {
        // 코드 블록 이전 텍스트
        const beforeCode = finalOutput.substring(0, finalOutput.indexOf("```")).trim();
        if (beforeCode) {
          messages.push({
            role: "assistant",
            content: beforeCode,
            codeBlock: false
          });
        }

        // 코드 블록
        messages.push({
          role: "assistant",
          content: codeBlockMatch[2],
          codeBlock: true,
          codeLanguage: codeBlockMatch[1] || "json"
        });

        // 코드 블록 이후 텍스트
        const afterCode = finalOutput.substring(
          finalOutput.indexOf("```") + codeBlockMatch[0].length
        ).trim();

        if (afterCode) {
          messages.push({
            role: "assistant",
            content: afterCode,
            codeBlock: false
          });
        }
      } else {
        messages.push({
          role: "assistant",
          content: finalOutput,
          codeBlock: false
        });
      }
    } else {
      messages.push({
        role: "assistant",
        content: finalOutput,
        codeBlock: false
      });
    }

    return messages;
  } catch (error) {
    console.error("응답 파싱 오류:", error);
    return [{
      role: "assistant",
      content: `응답 파싱 중 오류가 발생했습니다: ${(error as Error).message}`,
      codeBlock: false
    }];
  }
}
