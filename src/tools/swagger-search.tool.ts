import { DynamicTool } from "langchain/tools";
import { SwaggerData, SwaggerPath } from "../types.js";
import { model } from "../model.js";

/**
 * Swagger API 검색 도구
 *
 * 이 도구는 operationId나 description을 기반으로 Swagger 문서에서
 * API 엔드포인트를 검색합니다. description 검색 시 AI 모델을 활용합니다.
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
      const results = await searchSwaggerPaths(swaggerData, query, fields);

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
 * @param {string[]} fields - 검색할 필드 목록
 * @returns {Promise<SwaggerPath[]>} - 검색 결과
 */
async function searchSwaggerPaths(
  swaggerData: SwaggerData,
  query: string,
  fields: string[] = ["all"],
): Promise<SwaggerPath[]> {
  // 대소문자 구분 없이 검색하기 위해 쿼리를 소문자로 변환
  const lowerQuery = query.toLowerCase();

  // 모든 필드 검색 옵션
  const searchAll = fields.includes("all");

  // 기본 필터링 (단순 문자열 매칭)
  const baseFilteredPaths = swaggerData.paths.filter((path) => {
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

  // description 검색을 위한 AI 모델 활용
  if (searchAll || fields.includes("description")) {
    // 이미 다른 필드로 찾은 경로가 있으면 그대로 반환
    if (baseFilteredPaths.length > 0) {
      return baseFilteredPaths;
    }

    // AI 모델을 사용하여 description 기반 검색
    return await searchWithAI(swaggerData.paths, query);
  }

  return baseFilteredPaths;
}

/**
 * AI 모델을 활용한 description 기반 API 검색
 *
 * @param {SwaggerPath[]} paths - 검색할 API 경로 목록
 * @param {string} query - 검색 쿼리
 * @returns {Promise<SwaggerPath[]>} - 검색 결과
 */
async function searchWithAI(
  paths: SwaggerPath[],
  query: string
): Promise<SwaggerPath[]> {
  try {
    // 각 API 경로의 description과 summary 정보 추출
    const apiDescriptions = paths.map((path, index) => ({
      index,
      description: path.description || "",
      summary: path.summary || "",
      path: path.path,
      method: path.method
    }));

    // AI에게 검색 요청을 위한 프롬프트 구성
    const prompt = `
당신은 API 문서 검색 전문가입니다. 사용자의 검색 쿼리를 이해하고 가장 관련성 높은 API를 찾아주세요.

검색 쿼리: "${query}"

다음은 API 목록입니다:
${JSON.stringify(apiDescriptions, null, 2)}

위 API 목록에서 사용자의 검색 쿼리와 의미적으로 가장 일치하는 API의 인덱스 번호만 JSON 배열 형태로 반환하세요.
예시 응답: [0, 3, 5]

검색 결과가 없으면 빈 배열 []을 반환하세요.
`;

    // AI 모델 호출
    const response = await model.invoke([
      { role: "system", content: prompt }
    ]);

    console.log('reaponse:', response);
    // AI 응답에서 JSON 배열 추출
    const contentStr = response.content as string;
    const jsonMatch = contentStr.match(/\[.*\]/);

    if (!jsonMatch) {
      return [];
    }

    try {
      const matchedIndices = JSON.parse(jsonMatch[0]) as number[];

      // 중복 제거 및 유효한 인덱스만 필터링
      return Array.from(new Set(matchedIndices))
        .filter(index => index >= 0 && index < paths.length)
        .map(index => paths[index]);
    } catch (error) {
      console.error("AI 응답 파싱 오류:", error);
      return [];
    }
  } catch (error) {
    console.error("AI 검색 오류:", error);
    return [];
  }
}
