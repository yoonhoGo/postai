import { DynamicTool } from "langchain/tools";
import { SwaggerData, SwaggerPath } from "../types.js";

/**
 * Swagger API 응답 검색 도구
 *
 * 이 도구는 Swagger 문서에서 API 응답 정보만을 대상으로 검색합니다.
 * API 응답 스키마, 상태 코드, 응답 설명 등을 검색합니다.
 *
 * @type {DynamicTool}
 */
export const swaggerResponseSearchTool = new DynamicTool({
  name: "swagger_response_search",
  description:
    'Swagger 문서에서 API 응답 정보만 검색합니다. 입력: JSON 형식의 검색 기준 {"swaggerData": SwaggerData 객체, "query": 검색어}',
  func: async (inputStr) => {
    try {
      // 입력 파싱
      const input = JSON.parse(inputStr);
      const { swaggerData, query } = input;

      if (!swaggerData || !query) {
        return JSON.stringify({
          error: "swaggerData 객체와 검색어가 필요합니다",
        });
      }

      // 응답 정보만 검색
      const results = searchSwaggerResponses(swaggerData, query);

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
          message: `응답 검색 오류: ${(error as Error).message}`,
        },
        null,
        2,
      );
    }
  },
});

/**
 * Swagger 응답 정보 검색 함수
 *
 * @param {SwaggerData} swaggerData - 파싱된 Swagger 데이터
 * @param {string} query - 검색 쿼리
 * @returns {SwaggerPath[]} - 검색 결과
 */
function searchSwaggerResponses(
  swaggerData: SwaggerData,
  query: string,
): SwaggerPath[] {
  // 검색 결과가 비어있으면 빈 배열 반환
  if (!swaggerData || !swaggerData.paths || swaggerData.paths.length === 0) {
    return [];
  }

  // 대소문자 구분 없이 검색하기 위해 쿼리를 소문자로 변환
  const lowerQuery = query.toLowerCase();

  return swaggerData.paths.filter((path) => {
    // 응답 정보 검색을 위해 추가 필드가 필요
    // responses 필드가 있는지 확인
    if (path.responses) {
      const responsesStr = JSON.stringify(path.responses).toLowerCase();
      if (responsesStr.includes(lowerQuery)) {
        return true;
      }

      // 개별 응답 코드와 설명 검색
      for (const statusCode in path.responses) {
        const response = path.responses[statusCode];

        // 응답 설명 검색
        if (
          response.description &&
          response.description.toLowerCase().includes(lowerQuery)
        ) {
          return true;
        }

        // 응답 스키마 검색
        if (response.content) {
          const contentStr = JSON.stringify(response.content).toLowerCase();
          if (contentStr.includes(lowerQuery)) {
            return true;
          }
        }
      }
    }

    return false;
  });
}
