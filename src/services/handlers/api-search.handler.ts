import { ChatMessage } from "../../types.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import { model } from "../../model.js";
import { swaggerSearchTool } from "../../tools/swagger-search.tool.js";
import { langfuseHandler } from "../../langfuse.js";
import {
  swaggerRequestSearchTool,
  swaggerResponseSearchTool,
} from "../../tools/index.js";

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
    // 1. AI를 사용하여 사용자 쿼리에서 검색어와 검색 유형 추출
    const extractPrompt = `
사용자가 API를 검색하고자 합니다. 사용자의 쿼리에서 키워드와 검색 유형을 추출하여 JSON 형식으로 반환하세요.
쿼리: "${userQuery}"

다음 형식으로 반환하세요:
{
  "searchTerms": "추출된 검색어",
  "searchType": "general", "request", "response" 중 하나
}

searchType 결정 기준:
- "request": 요청 매개변수, 요청 본문, 입력값 등에 관한 검색
- "response": 응답 데이터, 응답 형식, 출력값 등에 관한 검색
- "general": 특정한 언급이 없으면 일반 검색

예시:
- "사용자 생성 API의 요청 본문 찾기" => { "searchTerms": "사용자 생성", "searchType": "request" }
- "펫 API의 응답 데이터 검색" => { "searchTerms": "펫", "searchType": "response" }
- "사용자 관련 API 검색" => { "searchTerms": "사용자", "searchType": "general" }
`;

    const extractResponse = await model.invoke(
      [{ role: "system", content: extractPrompt }],
      {
        callbacks: [langfuseHandler],
      },
    );

    // JSON 응답 파싱
    const jsonMatch = (extractResponse.content as string).match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error("검색어 추출 실패");
    }

    const searchParams = JSON.parse(jsonMatch[0]);

    // 2. 검색 유형에 따라 적절한 도구 선택 및 검색 수행
    let searchResults;
    const searchInput = JSON.stringify({
      swaggerData: currentSwagger,
      query: searchParams.searchTerms,
    });

    switch (searchParams.searchType) {
      case "request":
        searchResults = await swaggerRequestSearchTool.func(searchInput);
        break;
      case "response":
        searchResults = await swaggerResponseSearchTool.func(searchInput);
        break;
      default: // general
        const generalInput = JSON.stringify({
          swaggerData: currentSwagger,
          query: searchParams.searchTerms,
          fields: ["all"],
        });
        searchResults = await swaggerSearchTool.func(generalInput);
    }

    const parsedResults = JSON.parse(searchResults);

    // 엄격한 검증 단계 추가
    if (parsedResults.results) {
      // 검증된 결과만 필터링
      parsedResults.results = parsedResults.results.filter(
        (result: any) =>
          // 검증 플래그가 있거나, 현재 Swagger에 실제로 존재하는지 확인
          result._verified ||
          currentSwagger.paths.some(
            (p) => p.path === result.path && p.method === result.method,
          ),
      );

      // 결과 수 업데이트
      parsedResults.resultsCount = parsedResults.results.length;
    }

    // 결과가 없는 경우 명확한 메시지 제공
    if (!parsedResults.results || parsedResults.resultsCount === 0) {
      return [
        {
          role: "assistant",
          content: `"${searchParams.searchTerms}" 검색어와 일치하는 API를 현재 로드된 Swagger 문서에서 찾을 수 없습니다.`,
          codeBlock: false,
        },
        {
          role: "assistant",
          content:
            "다른 검색어를 사용하거나 다른 Swagger 문서를 로드해 보세요.",
          codeBlock: false,
        },
      ];
    }

    // 검색 결과 요약 응답 생성
    const searchTypeText = {
      request: "요청 정보",
      response: "응답 정보",
      general: "API",
    }[searchParams.searchType as "request" | "response" | "general"];

    const messages: ChatMessage[] = [
      {
        role: "assistant",
        content: `"${searchParams.searchTerms}" 검색어에 대해 ${parsedResults.resultsCount}개의 ${searchTypeText}를 찾았습니다:`,
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

중요:
1. 오직 제공된 목록에 있는 API만 참조하세요.
2. 목록에 없는 API는 언급하지 마세요.
3. API가 없다면 "적합한 API를 찾을 수 없습니다"라고 응답하세요.
4. 정확한 경로와 매개변수만 사용하세요.
`;

    const suggestionResponse = await model.invoke(
      [
        {
          role: "system",
          content: suggestPrompt,
        },
      ],
      {
        callbacks: [langfuseHandler],
      },
    );

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

    // 검색 결과에 메타데이터 추가
    const searchMetaInfo = {
      query: searchParams.searchTerms,
      type: searchParams.searchType,
      sourceDocTitle: currentSwagger.title,
      sourceDocVersion: currentSwagger.version,
      totalPaths: currentSwagger.paths.length,
      timestamp: new Date().toISOString(),
    };

    // 검색 결과가 있는 경우에만 메타데이터 포함
    if (parsedResults.resultsCount > 0) {
      messages.push({
        role: "assistant",
        content: JSON.stringify(searchMetaInfo, null, 2),
        codeBlock: true,
        codeLanguage: "json",
      });
    }

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

function formatApiResultsTable(apis: any[]): string {
  if (apis.length === 0) return "결과 없음";

  // 테이블 헤더
  let table = "| 메서드 | 경로 | 설명 | 작업 ID |\n";
  table += "|--------|------|------|--------|\n";

  // 테이블 내용
  apis.forEach((api) => {
    // null 또는 undefined 값 처리
    const path = api.path || "";
    const method = api.method || "";
    const summary = api.summary || "(설명 없음)";
    const operationId = api.operationId || "(ID 없음)";

    // 긴 경로는 잘라서 표시
    const truncPath = path.length > 30 ? path.substring(0, 27) + "..." : path;
    const truncSummary =
      summary.length > 30 ? summary.substring(0, 27) + "..." : summary;

    table += `| ${method} | ${truncPath} | ${truncSummary} | ${operationId} |\n`;
  });

  return table;
}
