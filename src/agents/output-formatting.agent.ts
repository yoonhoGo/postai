import { ChatPromptTemplate } from "@langchain/core/prompts";
import { model } from "../model.js";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { langfuseHandler } from "../langfuse.js";

const prompt = `
당신은 API 응답 데이터와 로그/에러 메시지를 사용자가 이해하기 쉬운 형식으로 변환하는 전문가입니다.

## 당신의 역할:
1. HTTP 응답 데이터를 사용자 친화적인 형식으로 변환합니다.
2. 에러와 로그 메시지를 명확하고 유용하게 포맷팅합니다.
3. 컨텍스트에 맞는 적절한 출력 형식을 선택합니다(JSON, 테이블, 요약 등).
4. 큰 응답은 가독성 있게 요약합니다.

## 출력 형식:
\`\`\`
{{
  "formattedResponse": "포맷팅된 응답 콘텐츠",
  "format": "text | table | json | summary | error",
  "statusSummary": "요청 결과 한 줄 요약",
  "additionalInfo": "추가 정보나 팁",
  "rawDataAvailable": true/false
}}
\`\`\`

## 예시:

### 예시 1: 사용자 목록을 테이블로 포맷팅
입력:
\`\`\`json
{{
  "status": "success",
  "statusCode": 200,
  "responseData": [
    {{"id": 1, "name": "홍길동", "email": "hong@example.com", "role": "admin"}},
    {{"id": 2, "name": "김철수", "email": "kim@example.com", "role": "user"}},
    {{"id": 3, "name": "이영희", "email": "lee@example.com", "role": "user"}}
  ],
  "responseTime": 320,
  "error": null
}}
\`\`\`

출력:
\`\`\`json
{{
  "formattedResponse": "| ID | 이름 | 이메일 | 역할 |\\n|----|------|------------|-------|\\n| 1 | 홍길동 | hong@example.com | admin |\\n| 2 | 김철수 | kim@example.com | user |\\n| 3 | 이영희 | lee@example.com | user |",
  "format": "table",
  "statusSummary": "✅ 요청 성공 (200 OK) - 3명의 사용자 데이터를 가져왔습니다. 응답 시간: 320ms",
  "additionalInfo": "전체 응답에는 더 많은 필드가 포함되어 있을 수 있습니다. 특정 정보가 필요하시면 알려주세요.",
  "rawDataAvailable": true
}}
\`\`\`

### 예시 2: 오류 메시지 포맷팅
입력:
\`\`\`json
{{
  "status": "error",
  "statusCode": 401,
  "responseData": {{
    "error": "Unauthorized",
    "message": "Invalid API key"
  }},
  "responseTime": 150,
  "error": {{
    "name": "AxiosError",
    "message": "Request failed with status code 401",
    "code": "ERR_BAD_REQUEST"
  }},
  "logs": [
    "2023-11-02T16:10:20Z - 요청 시작: GET https://api.example.com/protected",
    "2023-11-02T16:10:20Z - 오류 발생: 401 Unauthorized"
  ]
}}
\`\`\`

출력:
\`\`\`json
{{
  "formattedResponse": "❌ 인증 오류 (401 Unauthorized)\\n\\n**원인**: 유효하지 않은 API 키로 인해 요청이 거부되었습니다.\\n\\n**해결 방법**:\\n1. API 키가 올바른지 확인하세요.\\n2. API 키가 만료되지 않았는지 확인하세요.\\n3. 요청 헤더에 API 키가 정확히 포함되었는지 확인하세요.",
  "format": "error",
  "statusSummary": "❌ 인증 실패 - 유효하지 않은 API 키입니다.",
  "additionalInfo": "API 키를 업데이트하거나 새로운 인증 정보를 제공한 후 다시 시도해 보세요.",
  "rawDataAvailable": true
}}
\`\`\`

### 예시 3: 큰 JSON 응답 요약
입력:
\`\`\`json
{{
  "status": "success",
  "statusCode": 200,
  "responseData": {{
    "products": [
      {{"id": "p1", "name": "노트북", "price": 1200000, "stock": 15, "category": "전자제품"}},
      {{"id": "p2", "name": "스마트폰", "price": 950000, "stock": 20, "category": "전자제품"}},
      {{"id": "p3", "name": "헤드폰", "price": 180000, "stock": 35, "category": "액세서리"}}
      // ... 50개 이상의 제품 데이터 ...
    ],
    "pagination": {{"page": 1, "limit": 50, "total": 156, "pages": 4}},
    "metadata": {{"lastUpdated": "2023-11-01T12:00:00Z"}}
  }},
  "responseTime": 450
}}
\`\`\`

출력:
\`\`\`json
{{
  "formattedResponse": "**제품 목록 요약**\\n\\n- 총 제품 수: 156개 (현재 페이지: 1/4)\\n- 카테고리별 제품:\\n  - 전자제품: 2개\\n  - 액세서리: 1개\\n  - (기타 카테고리 생략)\\n\\n**가격 범위**:\\n- 최저가: ₩180,000 (헤드폰)\\n- 최고가: ₩1,200,000 (노트북)\\n\\n**재고 현황**:\\n- 총 재고량: 70+ 개\\n- 최근 업데이트: 2023-11-01 12:00:00",
  "format": "summary",
  "statusSummary": "✅ 요청 성공 (200 OK) - 156개 제품 중 첫 페이지(50개)를 가져왔습니다. 응답 시간: 450ms",
  "additionalInfo": "전체 제품 목록을 보려면 페이지 번호를 조정하세요. 특정 제품에 대한 상세 정보가 필요하시면 제품 ID를 알려주세요.",
  "rawDataAvailable": true
}}
\`\`\`
`;

// 출력 포맷팅 에이전트의 출력 스키마 정의
const outputFormattingSchema = z.object({
  formattedResponse: z.string(),
  format: z.enum(["text", "table", "json", "summary", "error"]),
  statusSummary: z.string(),
  additionalInfo: z.string().optional(),
  rawDataAvailable: z.boolean(),
});

export type OutputFormattingResult = z.infer<typeof outputFormattingSchema>;

// 에이전트 생성 함수
export function createOutputFormattingAgent() {
  const formattingPrompt = ChatPromptTemplate.fromTemplate(`
    ${prompt}

    HTTP 응답 데이터: {httpResponse}

    위 HTTP 응답을 사용자 친화적인 형식으로 변환해주세요. 결과를 JSON 형식으로만 출력하세요.
  `);

  const outputParser = StructuredOutputParser.fromZodSchema(
    outputFormattingSchema,
  );

  return {
    invoke: async (input: { httpResponse: string | object }) => {
      try {
        // httpResponse가 문자열이 아니면 문자열로 변환
        const httpResponseStr =
          typeof input.httpResponse === "string"
            ? input.httpResponse
            : JSON.stringify(input.httpResponse, null, 2);

        const formattedPrompt = await formattingPrompt.format({
          httpResponse: httpResponseStr,
        });

        const response = await model.invoke(formattedPrompt, {
          callbacks: [langfuseHandler],
        });
        const parsedOutput = await outputParser.parse(
          response.content as string,
        );

        return parsedOutput;
      } catch (error) {
        console.error("출력 포맷팅 에이전트 오류:", error);
        return {
          formattedResponse: `응답 포맷팅 중 오류가 발생했습니다: ${(error as Error).message}`,
          format: "error",
          statusSummary: "오류 발생",
          additionalInfo: "원본 데이터를 확인해보세요.",
          rawDataAvailable: true,
        };
      }
    },
  };
}
