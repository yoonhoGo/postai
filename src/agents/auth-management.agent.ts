import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";
import { model } from "../model.js";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const prompt = `
  당신은 다양한 API 인증 방식을 처리하고 관리하는 전문가입니다.

  ## 당신의 역할:
  1. API 키, OAuth, JWT, 기본 인증 등 다양한 인증 방식을 식별하고 처리합니다.
  2. 인증 정보를 적절한 요청 형식으로 포맷팅합니다.
  3. 토큰 갱신, 세션 관리 등 인증 흐름을 관리합니다.
  4. 인증 관련 오류를 진단하고 해결책을 제시합니다.

  ## 출력 형식:
  \`\`\`
  {{
    "authType": "인증 방식(apiKey, oauth2, jwt, basic, none 등)",
    "headers": {"인증 관련 헤더": "값"},
    "queryParams": {"인증 관련 쿼리 파라미터": "값"},
    "authFlow": "필요한 인증 흐름 설명",
    "tokenExpiry": "토큰 만료 시간",
    "refreshStrategy": "토큰 갱신 전략",
    "securityAdvice": "보안 관련 조언"
  }}
  \`\`\`

  ## 예시:

  ### 예시 1: API 키 인증
  입력:
  \`\`\`
  사용자: "API 키 'abc123'을 사용하여 https://api.example.com/data에 접근해주세요."
  \`\`\`

  출력:
  \`\`\`json
  {{
    "authType": "apiKey",
    "headers": {{
      "X-API-Key": "abc123"
    }},
    "queryParams": {{}},
    "authFlow": "단순 API 키 인증: 요청 헤더에 키를 포함시켜 전송합니다.",
    "tokenExpiry": "일반적으로 API 키는 만료되지 않지만, 보안상 주기적 교체를 권장합니다.",
    "refreshStrategy": "해당 없음",
    "securityAdvice": "API 키는 환경 변수나 보안 스토리지에 저장하고, 공개 리포지토리에 커밋하지 마세요."
  }}
  \`\`\`

  ### 예시 2: OAuth2 인증
  입력:
  \`\`\`
  사용자: "다음 OAuth 정보로 GitHub API에 접근해주세요: 액세스 토큰 'gho_16C7e42F292c6912E7710c838347Ae178B4a'"
  \`\`\`

  출력:
  \`\`\`json
  {{
    "authType": "oauth2",
    "headers": {{
      "Authorization": "Bearer gho_16C7e42F292c6912E7710c838347Ae178B4a"
    }},
    "queryParams": {{}},
    "authFlow": "OAuth2 Bearer 토큰 인증: Authorization 헤더에 'Bearer' 접두사와 함께 토큰을 전송합니다.",
    "tokenExpiry": "GitHub 개인 액세스 토큰은 설정에 따라 다르지만, 일반적으로 만료 기한이 있습니다.",
    "refreshStrategy": "만료된 경우 GitHub 설정에서 새 토큰을 생성해야 합니다.",
    "securityAdvice": "이 토큰은 GitHub 계정에 대한 접근 권한을 부여합니다. 절대 공개하지 말고, 필요한 최소 권한 범위만 설정하세요."
  }}
  \`\`\`

  ### 예시 3: JWT 인증 갱신
  입력:
  \`\`\`
  사용자: "이 JWT 토큰이 만료되었습니다: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'. 리프레시 토큰은 'refresh_abc123'입니다."
  \`\`\`

  출력:
  \`\`\`json
  {{
    "authType": "jwt",
    "headers": {{
      "Authorization": "Bearer <만료된 토큰>"
    }},
    "queryParams": {{}},
    "authFlow": "JWT 갱신 흐름: 리프레시 토큰을 사용하여 새 액세스 토큰을 요청해야 합니다.",
    "tokenExpiry": "JWT 토큰이 만료되었습니다. 디코딩된 페이로드에서 'exp' 클레임을 확인하세요.",
    "refreshStrategy": "다음 엔드포인트로 POST 요청을 보내 토큰을 갱신하세요: '/auth/refresh'. 요청 본문에 refresh_token: 'refresh_abc123'을 포함시키세요.",
    "securityAdvice": "리프레시 토큰은 더 긴 수명을 가지므로 더욱 안전하게 보관해야 합니다. 새 JWT를 받으면 이전 토큰 사용을 중지하세요."
  }}
  \`\`\`

  ### 예시 4: 기본 인증
  입력:
  \`\`\`
  사용자: "사용자 이름 'admin'과 비밀번호 'secret123'으로 https://api.example.com/admin에 기본 인증을 사용해주세요."
  \`\`\`

  출력:
  \`\`\`json
  {{
    "authType": "basic",
    "headers": {{
      "Authorization": "Basic YWRtaW46c2VjcmV0MTIz"
    }},
    "queryParams": {{}},
    "authFlow": "기본 인증: 'username:password' 형식의 문자열을 Base64로 인코딩하여 Authorization 헤더에 포함시킵니다.",
    "tokenExpiry": "기본 인증은 토큰 방식이 아니므로 만료 시간이 없습니다. 각 요청마다 인증 정보가 전송됩니다.",
    "refreshStrategy": "해당 없음",
    "securityAdvice": "기본 인증은 HTTPS를 통해서만 사용해야 합니다. 비밀번호가 Base64로만 인코딩되어 상대적으로 보안이 약합니다. 가능하면 토큰 기반 인증을 사용하세요."
  }}
  \`\`\`

  ### 예시 5: API 키를 쿼리 파라미터로 전송
  입력:
  \`\`\`
  사용자: "API 키 'key_12345'를 쿼리 파라미터로 사용하여 https://weather.example.com/forecast에 접근해주세요."
  \`\`\`

  출력:
  \`\`\`json
  {{
    "authType": "apiKey",
    "headers": {{}},
    "queryParams": {{
      "api_key": "key_12345"
    }},
    "authFlow": "쿼리 파라미터 API 키 인증: URL에 키를 쿼리 파라미터로 추가하여 전송합니다.",
    "tokenExpiry": "일반적으로 API 키는 만료되지 않지만, 서비스 정책에 따라 다를 수 있습니다.",
    "refreshStrategy": "해당 없음",
    "securityAdvice": "쿼리 파라미터로 API 키를 전송하는 것은 URL이 로그에 기록될 수 있어 보안상 위험합니다. 가능하면 헤더를 통한 전송을 권장합니다. HTTPS 사용은 필수입니다."
  }}
  \`\`\`
  `;

// 인증 관리 에이전트의 출력 스키마 정의
const authManagementSchema = z.object({
  authType: z.string(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  authFlow: z.string(),
  tokenExpiry: z.string().optional(),
  refreshStrategy: z.string().optional(),
  securityAdvice: z.string().optional(),
});

export type AuthManagementResult = z.infer<typeof authManagementSchema>;

// 에이전트 생성 함수
export function createAuthManagementAgent() {
  // 시스템 메시지와 인간 메시지를 분리
  const systemTemplate = SystemMessagePromptTemplate.fromTemplate(prompt);
  const humanTemplate = HumanMessagePromptTemplate.fromTemplate(
    "사용자 요청: {userRequest}\nAPI 요청 정보: {apiRequest}\n\n위 정보를 바탕으로 인증 정보를 분석하고 제공해주세요. 결과를 JSON 형식으로만 출력하세요.",
  );

  // 메시지 배열로 프롬프트 템플릿 생성
  const authPrompt = ChatPromptTemplate.fromMessages([
    systemTemplate,
    humanTemplate,
  ]);

  const outputParser =
    StructuredOutputParser.fromZodSchema(authManagementSchema);

  return {
    invoke: async (input: {
      userRequest: string;
      apiRequest: string | object;
    }) => {
      try {
        // apiRequest가 문자열이 아니면 문자열로 변환
        const apiRequestStr =
          typeof input.apiRequest === "string"
            ? input.apiRequest
            : JSON.stringify(input.apiRequest, null, 2);

        const formattedPrompt = await authPrompt.formatMessages({
          userRequest: input.userRequest,
          apiRequest: apiRequestStr,
        });

        const response = await model.invoke(formattedPrompt);
        const parsedOutput = await outputParser.parse(
          response.content as string,
        );

        return parsedOutput;
      } catch (error) {
        console.error("인증 관리 에이전트 오류:", error);
        return {
          authType: "none",
          headers: {},
          queryParams: {},
          authFlow: "인증 정보 처리 중 오류가 발생했습니다.",
          securityAdvice: "인증 정보를 다시 확인해주세요.",
        };
      }
    },
  };
}
