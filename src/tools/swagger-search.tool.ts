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
    'Swagger 문서에서 operationId나 description 기반으로 API를 검색합니다. 입력: JSON 형식의 검색 기준 {"swaggerData": SwaggerData 객체, "query": 검색어, "type": "operationId" 또는 "description"}',
  func: async (inputStr) => {
    try {
      // 입력 파싱
      const input = JSON.parse(inputStr);
      const { swaggerData, query, type = "both" } = input;

      if (!swaggerData || !query) {
        return JSON.stringify({
          error: "swaggerData 객체와 검색어가 필요합니다",
        });
      }

      // 검색 실행
      const results = searchSwaggerPaths(swaggerData, query, type);

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
  type: string = "both",
): SwaggerPath[] {
  // 대소문자 구분 없이 검색하기 위해 쿼리를 소문자로 변환
  const lowerQuery = query.toLowerCase();

  return swaggerData.paths.filter((path) => {
    // operationId 검색
    if (type === "operationId" || type === "both") {
      if (
        path.operationId &&
        path.operationId.toLowerCase().includes(lowerQuery)
      ) {
        return true;
      }
    }

    // description 검색
    if (type === "description" || type === "both") {
      if (
        (path.summary && path.summary.toLowerCase().includes(lowerQuery)) ||
        (path.description &&
          path.description.toLowerCase().includes(lowerQuery))
      ) {
        return true;
      }
    }

    return false;
  });
}
