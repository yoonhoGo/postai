import { DynamicTool } from "langchain/tools";
import { SwaggerData, SwaggerPath } from "../types.js";

/**
 * Swagger API 검색 도구
 *
 * 이 도구는 operationId나 description을 기반으로 Swagger 문서에서
 * API 엔드포인트를 검색합니다.
 *
 * @type {DynamicTool}
 */
export const swaggerSearchTool = new DynamicTool({
  name: "swagger_search",
  description:
    'Swagger 문서에서 API를 검색합니다. 입력: JSON 형식의 검색 기준 {"swaggerData": SwaggerData 객체, "query": 검색어, "fields": ["path", "operationId", "description", "method"]}',
  func: async (inputStr) => {
    try {
      // 입력 파싱
      const input = JSON.parse(inputStr);
      const { swaggerData, query, fields = ["all"] } = input;

      if (!swaggerData || !query) {
        return JSON.stringify({
          error: "swaggerData 객체와 검색어가 필요합니다",
        });
      }

      // 검색 실행
      const results = searchSwaggerPaths(swaggerData, query, fields);

      return JSON.stringify(
        {
          resultsCount: results.length,
          results: results,
        },
        null,
        2,
      );
    } catch (error) {
      return JSON.stringify(
        {
          error: true,
          message: `검색 오류: ${(error as Error).message}`,
        },
        null,
        2,
      );
    }
  },
});

/**
 * Swagger 경로 검색 함수
 *
 * @param {SwaggerData} swaggerData - 파싱된 Swagger 데이터
 * @param {string} query - 검색 쿼리
 * @param {string} type - 검색 유형 ('operationId', 'description', 'both')
 * @returns {SwaggerPath[]} - 검색 결과
 */
function searchSwaggerPaths(
  swaggerData: SwaggerData,
  query: string,
  fields: string[] = ["all"],
): SwaggerPath[] {
  // 대소문자 구분 없이 검색하기 위해 쿼리를 소문자로 변환
  const lowerQuery = query.toLowerCase();

  // 모든 필드 검색 옵션
  const searchAll = fields.includes("all");

  return swaggerData.paths.filter((path) => {
    // 경로(URL) 검색
    if (searchAll || fields.includes("path")) {
      if (path.path.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }

    // HTTP 메서드 검색
    if (searchAll || fields.includes("method")) {
      if (path.method.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }

    // operationId 검색
    if (searchAll || fields.includes("operationId")) {
      if (
        path.operationId &&
        path.operationId.toLowerCase().includes(lowerQuery)
      ) {
        return true;
      }
    }

    // description 및 summary 검색
    if (searchAll || fields.includes("description")) {
      if (
        (path.summary && path.summary.toLowerCase().includes(lowerQuery)) ||
        (path.description &&
          path.description.toLowerCase().includes(lowerQuery))
      ) {
        return true;
      }
    }

    // 태그 검색
    if (searchAll || fields.includes("tags")) {
      if (
        path.tags &&
        path.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      ) {
        return true;
      }
    }

    return false;
  });
}
