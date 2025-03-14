import { DynamicTool } from "langchain/tools";
import { SwaggerData, SwaggerPath } from "../types.js";

/**
 * Swagger API 요청 검색 도구
 *
 * 이 도구는 Swagger 문서에서 API 요청 정보만을 대상으로 검색합니다.
 * 경로(path), 매개변수(parameters), 요청 본문(requestBody) 등을 검색합니다.
 *
 * @type {DynamicTool}
 */
export const swaggerRequestSearchTool = new DynamicTool({
  name: "swagger_request_search",
  description:
    'Swagger 문서에서 API 요청 정보만 검색합니다. 입력: JSON 형식의 검색 기준 {"swaggerData": SwaggerData 객체, "query": 검색어}',
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

      // 요청 정보만 검색
      const results = searchSwaggerRequests(swaggerData, query);

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
          message: `요청 검색 오류: ${(error as Error).message}`,
        },
        null,
        2,
      );
    }
  },
});

/**
 * Swagger 요청 정보 검색 함수
 *
 * @param {SwaggerData} swaggerData - 파싱된 Swagger 데이터
 * @param {string} query - 검색 쿼리
 * @returns {SwaggerPath[]} - 검색 결과
 */
function searchSwaggerRequests(
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
    // 경로(URL) 검색
    if (path.path.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // 매개변수 검색
    if (path.parameters && path.parameters.length > 0) {
      const paramMatch = path.parameters.some(
        (param) =>
          param.name.toLowerCase().includes(lowerQuery) ||
          (param.description &&
            param.description.toLowerCase().includes(lowerQuery)),
      );
      if (paramMatch) return true;
    }

    // 요청 본문 검색 (문자열화하여 검색)
    if (path.requestBody) {
      const requestBodyStr = JSON.stringify(path.requestBody).toLowerCase();
      if (requestBodyStr.includes(lowerQuery)) {
        return true;
      }
    }

    return false;
  });
}
