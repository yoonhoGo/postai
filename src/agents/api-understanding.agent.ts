import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { model } from "../model.js";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { langfuseHandler } from "../langfuse.js";

const prompt = `
  당신은 사용자의 자연어 요청을 분석하여 API 요청 의도와 구조를 파악하는 전문가입니다.

  ## 당신의 역할:
  1. 사용자 요청에서 API 엔드포인트, HTTP 메서드, 파라미터 등을 식별합니다.
  2. API 문서가 제공된 경우, 문서를 분석하여 올바른 요청 형식을 파악합니다.
  3. 불명확한 부분이 있으면 필요한 추가 정보를 요청합니다.

  ## 출력 형식:
  \`\`\`json
  {{
    "endpoint": "요청할 API 엔드포인트 URL",
    "method": "HTTP 메서드(GET, POST, PUT, DELETE 등)",
    "headers": {{"헤더명": "값"}},
    "queryParams": {{"파라미터명": "값"}},
    "body": {{"키": "값"}},
    "description": "요청의 목적에 대한 간략한 설명",
    "missingInfo": ["명확하지 않은 정보 목록"]
  }}
  \`\`\`

  ## 예시:

  ### 예시 1: 기본 GET 요청
  입력: "https://api.example.com/users에서 사용자 목록을 가져와 주세요."

  출력:
  \`\`\`json
  {{
    "endpoint": "https://api.example.com/users",
    "method": "GET",
    "headers": {{}},
    "queryParams": {{}},
    "body": null,
    "description": "사용자 목록 조회 요청",
    "missingInfo": []
  }}
  \`\`\`

  ### 예시 2: 인증이 필요한 POST 요청
  입력: "API 키 'abc123'을 사용하여 https://api.example.com/users에 새 사용자를 추가해주세요. 이름은 '홍길동', 이메일은 'hong@example.com'입니다."

  출력:
  \`\`\`json
  {{
    "endpoint": "https://api.example.com/users",
    "method": "POST",
    "headers": {{
      "Authorization": "Bearer abc123"
    }},
    "queryParams": {{}},
    "body": {{
      "name": "홍길동",
      "email": "hong@example.com"
    }},
    "description": "새 사용자 추가 요청",
    "missingInfo": []
  }}
  \`\`\`

  ### 예시 3: 불명확한 요청
  입력: "users API에서 홍길동의 정보를 업데이트해주세요."

  출력:
  \`\`\`json
  {{
    "endpoint": "불명확",
    "method": "PUT 또는 PATCH",
    "headers": {{}},
    "queryParams": {{}},
    "body": {{
      "name": "홍길동"
    }},
    "description": "사용자 정보 업데이트 요청",
    "missingInfo": [
      "정확한 API 엔드포인트 URL",
      "사용자 식별자(ID)",
      "업데이트할 구체적인 필드와 값",
      "인증 정보"
    ]
  }}
  \`\`\`
`;

// API 이해 에이전트의 출력 스키마 정의
const apiUnderstandingSchema = z.object({
  endpoint: z.string(),
  method: z.string(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string().optional()).optional(),
  body: z.any().nullable(),
  description: z.string(),
  missingInfo: z.array(z.string()).optional(),
});

export type ApiUnderstandingResult = z.infer<typeof apiUnderstandingSchema>;

// 에이전트 생성 함수
export function createApiUnderstandingAgent() {
  // 시스템 메시지와 인간 메시지를 분리
  const systemTemplate = SystemMessagePromptTemplate.fromTemplate(prompt);
  const humanTemplate = HumanMessagePromptTemplate.fromTemplate(
    "사용자 요청: {userRequest}",
  );

  // 메시지 배열로 프롬프트 템플릿 생성
  const apiPrompt = ChatPromptTemplate.fromMessages([
    systemTemplate,
    humanTemplate,
  ]);

  const outputParser = StructuredOutputParser.fromZodSchema(
    apiUnderstandingSchema,
  );

  return {
    invoke: async (input: { userRequest: string }) => {
      try {
        const formattedPrompt = await apiPrompt.formatMessages({
          userRequest: input.userRequest,
        });

        const response = await model.invoke(formattedPrompt, {
          callbacks: [langfuseHandler],
        });
        const parsedOutput = await outputParser.parse(
          response.content as string,
        );

        return parsedOutput;
      } catch (error) {
        console.error("API 이해 에이전트 오류:", error);
        return {
          endpoint: "오류 발생",
          method: "UNKNOWN",
          headers: {},
          queryParams: {},
          body: null,
          description: `API 요청 분석 중 오류 발생: ${(error as Error).message}`,
          missingInfo: ["요청을 올바르게 파싱할 수 없습니다"],
        };
      }
    },
  };
}
