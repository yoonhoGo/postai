import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { model } from "../model.js";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { langfuseHandler } from "../langfuse.js";

const prompt = `
당신은 API 요청 정보를 axios 라이브러리에서 사용할 수 있는 JSON 파라미터로 변환하는 전문가입니다.

## 당신의 역할:
1. API 이해 에이전트가 식별한 요청 정보를 axios 호출 형식으로 변환합니다.
2. 적절한 헤더, 쿼리 파라미터, 요청 본문을 구성합니다.
3. 필요한 인코딩과 데이터 형식 변환을 처리합니다.

## 출력 형식:
\`\`\`
{{
  "url": "요청 URL(쿼리 파라미터 포함)",
  "method": "HTTP 메서드",
  "headers": {{"헤더명": "값"}},
  "data": {{"본문 데이터"}},
  "params": {{"URL 쿼리 파라미터"}},
  "timeout": 타임아웃 값(밀리초),
  "validateStatus": null,
  "comments": "구현 관련 특이사항 설명"
}}
\`\`\`

## 예시:

### 예시 1: 기본 GET 요청
입력:
\`\`\`json
{{
  "endpoint": "https://api.example.com/users",
  "method": "GET",
  "headers": {{}},
  "queryParams": {{"page": "1", "limit": "10"}},
  "body": null
}}
\`\`\`

출력:
\`\`\`json
{{
  "url": "https://api.example.com/users",
  "method": "get",
  "headers": {{}},
  "data": null,
  "params": {{
    "page": "1",
    "limit": "10"
  }},
  "timeout": 5000,
  "validateStatus": null,
  "comments": "페이지네이션 파라미터를 포함한 기본 GET 요청입니다."
}}
\`\`\`

### 예시 2: JSON 데이터와 인증이 포함된 POST 요청
입력:
\`\`\`json
{{
  "endpoint": "https://api.example.com/users",
  "method": "POST",
  "headers": {{
    "Authorization": "Bearer abc123",
    "Content-Type": "application/json"
  }},
  "queryParams": {{}},
  "body": {{
    "name": "홍길동",
    "email": "hong@example.com",
    "role": "user"
  }}
}}
\`\`\`

출력:
\`\`\`json
{{
  "url": "https://api.example.com/users",
  "method": "post",
  "headers": {{
    "Authorization": "Bearer abc123",
    "Content-Type": "application/json"
  }},
  "data": {{
    "name": "홍길동",
    "email": "hong@example.com",
    "role": "user"
  }},
  "params": {{}},
  "timeout": 5000,
  "validateStatus": null,
  "comments": "인증 토큰과 JSON 본문이 포함된 POST 요청입니다."
}}
\`\`\`

### 예시 3: 폼 데이터 전송
입력:
\`\`\`json
{{
  "endpoint": "https://api.example.com/upload",
  "method": "POST",
  "headers": {{
    "Content-Type": "multipart/form-data"
  }},
  "queryParams": {{}},
  "body": {{
    "file": "파일 경로",
    "description": "프로필 이미지"
  }}
}}
\`\`\`

출력:
\`\`\`json
{{
  "url": "https://api.example.com/upload",
  "method": "post",
  "headers": {{
    "Content-Type": "multipart/form-data"
  }},
  "data": "FormData 객체가 필요합니다. JavaScript에서 다음과 같이 구현하세요:\\nconst formData = new FormData();\\nformData.append('file', fileObject);\\nformData.append('description', '프로필 이미지');",
  "params": {{}},
  "timeout": 15000,
  "validateStatus": null,
  "comments": "파일 업로드를 위한 multipart/form-data 요청입니다. 타임아웃을 15초로 늘렸습니다."
}}
\`\`\`
`;

// 요청 변환 에이전트의 출력 스키마 정의
const requestConversionSchema = z.object({
  url: z.string(),
  method: z.string(),
  headers: z.record(z.string()).optional(),
  data: z.any().nullable(),
  params: z.record(z.any()).optional(),
  timeout: z.number().optional(),
  validateStatus: z.any().nullable(),
  comments: z.string().optional(),
});

export type RequestConversionResult = z.infer<typeof requestConversionSchema>;

// 에이전트 생성 함수
export function createRequestConversionAgent() {
  // 시스템 메시지와 인간 메시지를 분리
  const systemTemplate = SystemMessagePromptTemplate.fromTemplate(prompt);
  const humanTemplate = HumanMessagePromptTemplate.fromTemplate(
    "API 요청 정보: {apiRequest}\n\n위 API 요청 정보를 axios에서 사용할 수 있는 형식으로 변환해주세요. 결과를 JSON 형식으로만 출력하세요.",
  );

  // 메시지 배열로 프롬프트 템플릿 생성
  const requestPrompt = ChatPromptTemplate.fromMessages([
    systemTemplate,
    humanTemplate,
  ]);

  const outputParser = StructuredOutputParser.fromZodSchema(
    requestConversionSchema,
  );

  return {
    invoke: async (input: { apiRequest: string | object }) => {
      try {
        // apiRequest가 문자열이 아니면 문자열로 변환
        const apiRequestStr =
          typeof input.apiRequest === "string"
            ? input.apiRequest
            : JSON.stringify(input.apiRequest, null, 2);

        const formattedPrompt = await requestPrompt.formatMessages({
          apiRequest: apiRequestStr,
        });

        const response = await model.invoke(formattedPrompt, {
          callbacks: [langfuseHandler],
        });
        const parsedOutput = await outputParser.parse(
          response.content as string,
        );

        return parsedOutput;
      } catch (error) {
        console.error("요청 변환 에이전트 오류:", error);
        return {
          url: "",
          method: "get",
          headers: {},
          data: null,
          params: {},
          timeout: 5000,
          validateStatus: null,
          comments: `요청 변환 중 오류 발생: ${(error as Error).message}`,
        };
      }
    },
  };
}
