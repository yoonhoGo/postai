import { ChatPromptTemplate } from "@langchain/core/prompts";
import { model } from "../model.js";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const prompt = `
당신은 HTTP API 요청 처리 시스템의 수퍼바이저입니다. 사용자의 요청을 이해하고 다른 전문 에이전트들에게 작업을 할당하여 전체 흐름을 조정합니다.

## 당신의 역할:
1. 사용자의 API 요청 의도를 파악합니다.
2. 작업을 적절한 하위 에이전트에게 순차적으로 위임합니다.
3. 에이전트들의 출력을 검토하고 필요시 수정을 요청합니다.
4. 최종 결과를 사용자에게 명확하게 전달합니다.

## 작업 흐름:
1. 사용자 요청 접수 → API 이해 에이전트에 전달
2. API 이해 결과 검토 → 요청 변환 에이전트에 전달
3. 변환된 요청 검토 → HTTP 요청 에이전트에 전달
4. 요청 결과 검토 → 출력 포맷팅 에이전트에 전달
5. 최종 포맷팅 결과를 사용자에게 전달

## 예시:

### 예시 1: GET 요청
사용자: "https://api.example.com/users에서 사용자 목록을 가져와 주세요."

슈퍼바이저: "API 이해 에이전트, 사용자가 'api.example.com'에서 GET 요청으로 사용자 목록을 가져오려고 합니다. 요청 구조를 분석해주세요."

(API 이해 에이전트 응답 후)

슈퍼바이저: "요청 변환 에이전트, 다음 GET 요청을 위한 axios 파라미터를 생성해주세요: URL: https://api.example.com/users, 메서드: GET"

(요청 변환 에이전트 응답 후)

슈퍼바이저: "HTTP 요청 에이전트, 생성된 파라미터로 요청을 실행해주세요."

(HTTP 요청 에이전트 응답 후)

슈퍼바이저: "출력 포맷팅 에이전트, 받은 사용자 목록 데이터를 테이블 형식으로 포맷팅해주세요."

(출력 포맷팅 에이전트 응답 후)

슈퍼바이저: "사용자님, 요청하신 api.example.com의 사용자 목록입니다: [포맷팅된 결과]"

### 예시 2: POST 요청
사용자: "https://api.example.com/users에 새 사용자를 추가해주세요. 이름은 '홍길동', 이메일은 'hong@example.com'입니다."

슈퍼바이저: "API 이해 에이전트, 사용자가 'api.example.com'에 POST 요청으로 새 사용자를 추가하려고 합니다. 요청 구조를 분석해주세요."
`;

// 슈퍼바이저 에이전트의 출력 스키마 정의
const supervisorSchema = z.object({
  action: z.enum([
    "process_api_request", // API 요청 처리
    "request_more_info", // 추가 정보 요청
    "provide_help", // 도움말 제공
    "swagger_operation", // Swagger 문서 작업
    "other_operation", // 기타 작업
  ]),
  userRequest: z.string(),
  nextStep: z.string(),
  missingInfo: z.array(z.string()).optional(),
  helpMessage: z.string().optional(),
  swaggerCommand: z.string().optional(),
});

export type SupervisorResult = z.infer<typeof supervisorSchema>;

// 에이전트 생성 함수
export function createSupervisorAgent() {
  const supervisorPrompt = ChatPromptTemplate.fromTemplate(`
    ${prompt}

    대화 기록: {conversation_history}
    사용자 요청: {userRequest}

    위 정보를 바탕으로 사용자의 의도를 파악하고 다음 작업을 결정해주세요. 결과를 JSON 형식으로만 출력하세요.
  `);

  const outputParser = StructuredOutputParser.fromZodSchema(supervisorSchema);

  return {
    invoke: async (input: {
      userRequest: string;
      conversation_history?: string;
    }) => {
      try {
        const formattedPrompt = await supervisorPrompt.format({
          userRequest: input.userRequest,
          conversation_history: input.conversation_history || "이전 대화 없음",
        });

        const response = await model.invoke(formattedPrompt);
        const parsedOutput = await outputParser.parse(response.content as string);

        return parsedOutput;
      } catch (error) {
        console.error("슈퍼바이저 에이전트 오류:", error);
        return {
          action: "other_operation",
          userRequest: input.userRequest,
          nextStep: "오류 복구",
          missingInfo: [`오류가 발생했습니다: ${(error as Error).message}`],
        };
      }
    },
  };
}
