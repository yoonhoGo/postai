import { ChatMessage } from "../types.js";
import { swaggerHandler } from "./handlers/swagger.handler.js";
import { apiRequestHandler } from "./handlers/api-request.handler.js";
import { helpHandler } from "./handlers/help.handler.js";
import { generalQueryHandler } from "./handlers/general-query.handler.js";

// 사용자 쿼리 처리 함수
export async function handleUserQuery(
  userQuery: string,
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  try {
    // 1. 도움말 처리
    if (userQuery.toLowerCase() === "help" || userQuery.toLowerCase() === "도움말") {
      return helpHandler();
    }

    // 2. Swagger 관련 명령어 처리 (저장/불러오기 포함)
    if (isSwaggerRelatedQuery(userQuery)) {
      return await swaggerHandler(userQuery);
    }

    // 3. API 요청 처리 - 새 요청 생성 또는 기존 요청 실행/취소
    if (isApiRequestQuery(userQuery) || isRequestExecutionQuery(userQuery)) {
      return await apiRequestHandler(userQuery, conversation);
    }

    // 4. 일반 대화형 질문 처리
    return await generalQueryHandler(userQuery, conversation);
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `처리 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

// 쿼리 유형 식별 함수들
function isSwaggerRelatedQuery(query: string): boolean {
  return (
    query.includes("swagger") ||
    query.includes("openapi") ||
    query.includes("api 문서") ||
    query.includes("http")
  );
}

function isApiRequestQuery(query: string): boolean {
  return /^(GET|POST|PUT|DELETE|PATCH)/i.test(query);
}

function isRequestExecutionQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    lowerQuery === "실행" ||
    lowerQuery === "execute" ||
    lowerQuery === "취소" ||
    lowerQuery === "cancel"
  );
}
