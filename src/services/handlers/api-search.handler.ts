import { ChatMessage } from "../../types.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import { model } from "../../model.js";
import { swaggerSearchTool } from "../../tools/swagger-search.tool.js";

/**
 * API 검색 처리 핸들러
 *
 * 사용자의 검색 쿼리를 처리하여 현재 로드된 Swagger 문서에서
 * 관련 API를 검색합니다.
 */
export async function apiSearchHandler(
  userQuery: string,
): Promise<ChatMessage[]> {
  // 현재 활성화된 Swagger 가져오기
  const swaggerStore = useSwaggerStore.getState();
  const currentSwagger = swaggerStore.current;

  // 로드된 Swagger가 없는 경우
  if (!currentSwagger) {
    return [
      {
        role: "assistant",
        content:
          "API를 검색하기 전에 Swagger 문서를 먼저 로드해주세요. 예: swagger load <이름> 또는 URL을 통해 로드",
        codeBlock: false,
      },
    ];
  }

  try {
    // 1. AI를 사용하여 사용자 쿼리에서 검색어 추출
    const extractPrompt = `
사용자가 API를 검색하고자 합니다. 사용자의 쿼리에서 키워드를 추출하여 JSON 형식으로 반환하세요.
쿼리: "${userQuery}"

다음 형식으로 반환하세요:
{
  "searchTerms": "추출된 검색어",
  "fields": ["검색할 필드 - path, method, operationId, description, tags 중에서 선택"]
}

필드는 쿼리의 내용에 따라 적절하게 선택하세요. 기본값은 ["all"]입니다.
쿼리에 complete 혹은 full이 있다면 필드는 ["all"]입니다.
`;

    const extractResponse = await model.invoke([
      { role: "user", content: extractPrompt },
    ]);

    // JSON 응답 파싱
    const jsonMatch = (extractResponse.content as string).match(/{[\s\S]*}/);

    if (!jsonMatch) {
      throw new Error("검색어 추출 실패");
    }

    const searchParams = JSON.parse(jsonMatch[0]);

    // 2. 추출된 검색어로 Swagger 문서 검색
    const searchInput = JSON.stringify({
      swaggerData: currentSwagger,
      query: searchParams.searchTerms,
      fields: searchParams.fields || ["all"],
    });

    const searchResults = await swaggerSearchTool.func(searchInput);
    const parsedResults = JSON.parse(searchResults);

    // 3. 검색 결과 응답 생성
    if (parsedResults.error) {
      return [
        {
          role: "assistant",
          content: `검색 중 오류가 발생했습니다: ${parsedResults.message}`,
          codeBlock: false,
        },
      ];
    }

    if (parsedResults.resultsCount === 0) {
      return [
        {
          role: "assistant",
          content: `"${searchParams.searchTerms}" 검색어와 일치하는 API를 찾을 수 없습니다.`,
          codeBlock: false,
        },
        {
          role: "assistant",
          content:
            "다른 검색어로 시도하거나, 'swagger list' 명령으로 다른 API 문서를 로드해보세요.",
          codeBlock: false,
        },
      ];
    }

    // 검색 결과 요약 응답
    const messages: ChatMessage[] = [
      {
        role: "assistant",
        content: `"${searchParams.searchTerms}" 검색어에 대해 ${parsedResults.resultsCount}개의 API를 찾았습니다:`,
        codeBlock: false,
      },
    ];

    // 검색 결과 형식화
    const formattedResults = parsedResults.results.map((api: any) => {
      return {
        method: api.method,
        path: api.path,
        summary: api.summary || "(설명 없음)",
        operationId: api.operationId || "(ID 없음)",
        tags: api.tags?.join(", ") || "(태그 없음)",
      };
    });

    // API 사용 예시 생성을 위해 AI에 요청
    const suggestPrompt = `
다음은 사용자 쿼리 "${userQuery}"에 대해 찾은 API 목록입니다:
${JSON.stringify(formattedResults, null, 2)}

이 API들 중에서 사용자의 요구에 가장 적합한 API를 선택하고, 사용 예시를 제공하세요.
`;

    const suggestionResponse = await model.invoke([
      {
        role: "system",
        content: suggestPrompt,
      },
    ]);

    // 검색 결과 테이블 추가
    messages.push({
      role: "assistant",
      content: formatApiResultsTable(formattedResults),
      codeBlock: true,
    });

    // AI 제안 추가
    messages.push({
      role: "assistant",
      content: suggestionResponse.content as string,
      codeBlock: false,
    });

    return messages;
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `API 검색 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

/**
 * API 검색 결과를 테이블 형식으로 포맷팅
 */
function formatApiResultsTable(apis: any[]): string {
  if (apis.length === 0) return "결과 없음";

  // 테이블 헤더
  let table = "| 메서드 | 경로 | 설명 | 작업 ID |\n";
  table += "|--------|------|------|--------|\n";

  // 테이블 내용
  apis.forEach((api) => {
    // 긴 경로는 잘라서 표시
    const truncPath =
      api.path.length > 30 ? api.path.substring(0, 27) + "..." : api.path;
    const truncSummary =
      api.summary.length > 30
        ? api.summary.substring(0, 27) + "..."
        : api.summary;

    table += `| ${api.method} | ${truncPath} | ${truncSummary} | ${api.operationId} |\n`;
  });

  return table;
}
