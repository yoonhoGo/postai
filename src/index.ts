/**
 * 메인 애플리케이션 파일
 *
 * 이 파일은 HTTP API Client 프로그램의 진입점입니다.
 * LangChain을 사용하여 OpenAI Functions 기반 에이전트를 생성하고
 * 사용자와의 상호작용을 위한 CLI 인터페이스를 제공합니다.
 *
 * 주요 기능:
 * - 프롬프트 템플릿 정의
 * - 에이전트 생성 및 구성
 * - CLI를 통한 사용자 입력 처리
 * - 에이전트 실행 및 결과 출력
 */

// 필요한 패키지 및 모듈 임포트
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { model } from "./model.js";
import * as readline from "readline";
import { apiRequestTool } from "./request.tool.js";
import { swaggerTool } from "./swagger-parser.tool.js";

/**
 * 에이전트 프롬프트 템플릿
 *
 * 이 템플릿은 에이전트가 사용자 요청을 처리하기 위한 지시사항을 포함합니다.
 * agent_scratchpad 변수는 에이전트의 중간 작업 및 도구 실행 결과를 저장합니다.
 */
const promptTemplate = ChatPromptTemplate.fromTemplate(`
  당신은 HTTP API Client 어시스턴트입니다. 사용자가 API 문서를 탐색하고 API 요청을 수행할 수 있도록 도와줍니다.

  중요 지침:
  1. 반드시 한국어로 응답하세요.
  2. Python 코드를 작성하지 마세요. 대신 제공된 도구를 사용하세요.
  3. API 문서를 분석할 때는 반드시 swagger_parser 도구를 사용하세요.
  4. 실제 API 요청을 할 때는 반드시 api_request 도구를 사용하세요.
  5. 도구 호출 결과를 이해하기 쉽게 설명하세요.

  사용자 요청: {input}

  아래 도구들만 활용하여 사용자의 요청을 처리하세요:
  - swagger_parser: Swagger 문서 URL을 받아 API 정보를 조회합니다
  - api_request: 실제 API 요청을 수행합니다 (URL, 메서드, 헤더, 요청 데이터 필요)

  {agent_scratchpad}
`);

// 에이전트가 사용할 도구 배열 정의
const tools = [swaggerTool, apiRequestTool];

/**
 * 에이전트를 생성하는 비동기 함수
 *
 * LangChain의 createOpenAIFunctionsAgent를 사용하여 에이전트를 생성하고
 * AgentExecutor로 래핑하여 실행 가능한 형태로 만듭니다.
 *
 * @returns {Promise<AgentExecutor>} 설정된 에이전트 실행기
 */
const createAgent = async () => {
  const agent = await createOpenAIFunctionsAgent({
    llm: model,
    tools,
    prompt: promptTemplate,
  });

  return new AgentExecutor({
    agent,
    tools,
    verbose: false,                // 상세한 로그 출력
    returnIntermediateSteps: true, // 중간 단계 결과 반환
    maxIterations: 5,             // 최대 반복 횟수
    handleParsingErrors: "RETRY", // 파싱 오류 시 재시도
  });
};

/**
 * 프로그램의 메인 함수
 *
 * 사용자 입력을 받아 에이전트를 실행하고 결과를 출력하는
 * 대화형 CLI 인터페이스를 제공합니다.
 */
const main = async () => {
  console.log("HTTP API Client 프로그램을 시작합니다...");
  const agentExecutor = await createAgent();

  // 사용자 입력을 위한 readline 인터페이스 생성
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  /**
   * 사용자 입력을 재귀적으로 처리하는 함수
   *
   * 사용자로부터 명령을 받아 에이전트에 전달하고
   * 결과를 출력한 후 다음 입력을 받습니다.
   */
  const promptUser = () => {
    rl.question(
      '\n질문이나 명령을 입력하세요 (종료하려면 "exit" 입력): ',
      async (input) => {
        // 종료 명령 처리
        if (input.toLowerCase() === "exit") {
          console.log("프로그램을 종료합니다.");
          rl.close();
          return;
        }

        try {
          // 에이전트 실행 및 결과 출력
          console.log("처리 중...");
          const result = await agentExecutor.invoke({ input });
          console.log("\n결과:");
          console.log(result.output);
        } catch (error) {
          console.error("오류 발생:", error);
        }

        // 다음 입력 받기 (재귀 호출)
        promptUser();
      },
    );
  };

  // 사용 안내 메시지 출력
  console.log("=== HTTP API Client 사용 예시 ===");
  console.log(
    "- Swagger URL을 입력하여 API 문서 불러오기: https://petstore.swagger.io/v2/swagger.json",
  );
  console.log("- API 정보 조회: 사용 가능한 엔드포인트를 알려줘");
  console.log(
    "- API 요청: https://jsonplaceholder.typicode.com/posts/1에 GET 요청 보내줘",
  );
  console.log("===============================");

  // 첫 번째 사용자 입력 받기
  promptUser();
};

// 애플리케이션 시작 및 오류 처리
main().catch((error) => {
  console.error("오류 발생:", error);
});
