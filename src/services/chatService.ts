import { ChatMessage } from "../types.js";
import { swaggerHandler } from "./handlers/swagger.handler.js";
import { apiRequestHandler } from "./handlers/api-request.handler.js";
import { helpHandler } from "./handlers/help.handler.js";
import { commandInterpretHandler } from "./handlers/command-interpret.handler.js";
import { apiSearchHandler } from "./handlers/api-search.handler.js";

// 사용자 쿼리 처리 함수
export async function handleUserQuery(
  userQuery: string,
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  try {
    // 1. 도움말 처리
    if (
      userQuery.toLowerCase() === "help" ||
      userQuery.toLowerCase() === "도움말"
    ) {
      return helpHandler();
    }

    // 2. 명시적인 Swagger 관련 명령어 처리
    if (isExplicitSwaggerCommand(userQuery)) {
      return await swaggerHandler(userQuery);
    }

    // 3. 명시적인 API 요청 처리 (HTTP 메서드로 시작하는 경우)
    if (isExplicitApiRequestCommand(userQuery)) {
      return await apiRequestHandler(userQuery, conversation);
    }

    // 4. API 검색 명령어 처리
    if (isApiSearchCommand(userQuery)) {
      return await apiSearchHandler(userQuery);
    }

    // 5. 기타 명령어 해석 및 처리 (AI가 명령어를 해석하여 적절한 핸들러 호출)
    return await commandInterpretHandler(userQuery, conversation);
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

// 명시적인 Swagger 명령어 확인
function isExplicitSwaggerCommand(query: string): boolean {
  // swagger로 시작하는 경우
  return /^swagger\s+/i.test(query);
}

// 명시적인 API 요청 확인
function isExplicitApiRequestCommand(query: string): boolean {
  // HTTP 메서드로 시작하는 경우
  return (
    /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/i.test(query) ||
    query.toLowerCase() === "실행" ||
    query.toLowerCase() === "execute" ||
    query.toLowerCase() === "취소" ||
    query.toLowerCase() === "cancel"
  );
}

// API 검색 명령어 확인
function isApiSearchCommand(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  // 'search', 'find', '검색', '찾기' 등의 키워드를 포함하는 경우
  return (
    lowerQuery.includes("search") ||
    lowerQuery.includes("find") ||
    lowerQuery.includes("검색") ||
    lowerQuery.includes("찾아") ||
    lowerQuery.includes("찾기") ||
    lowerQuery.includes("api") ||
    (lowerQuery.includes("뭐") && lowerQuery.includes("있"))
  );
}
