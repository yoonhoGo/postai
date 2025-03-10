/**
 * Swagger 파서 도구 파일
 *
 * 이 파일은 Swagger/OpenAPI 문서를 파싱하여 API 정보를
 * 추출하는 도구를 정의합니다.
 *
 * swagger-parser 라이브러리를 사용하여 Swagger 문서를 파싱하고
 * API 경로, 메서드, 매개변수 등의 정보를 구조화된 형태로 제공합니다.
 */

import { DynamicTool } from "langchain/tools";
import { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import SwaggerParser from "swagger-parser";

/**
 * Swagger 파싱 도구
 *
 * 이 도구는 Swagger URL을 입력받아 해당 문서를 파싱하고
 * API의 경로, 메서드, 매개변수 등 상세 정보를 추출합니다.
 *
 * @type {DynamicTool}
 */
export const swaggerTool = new DynamicTool({
  name: "swagger_parser",
  description:
    "Swagger/OpenAPI 문서를 파싱하여 API 정보를 조회합니다. 항상 이 도구를 먼저 사용하여 API 문서를 분석하세요. 입력: Swagger 문서 URL",
  func: async (swaggerUrl) => {
    try {
      // Swagger 문서 파싱
      const api = await SwaggerParser.parse(swaggerUrl);

      // baseUrl 추출 (Swagger 버전에 따라 다른 위치에서 추출)
      let baseUrl = "";

      // OpenAPI 3.0 버전의 경우
      if (isOpenAPIV3(api)) {
        if (api.servers && api.servers.length > 0) {
          baseUrl = api.servers[0].url;
        }
      }
      // Swagger 2.0 버전의 경우
      else if (isSwaggerV2(api)) {
        baseUrl = api.schemes
          ? `${api.schemes[0]}://${api.host}${api.basePath || ""}`
          : `http://${api.host || ""}${api.basePath || ""}`;
      }

      // 경로 및 메서드 정보 추출
      const paths = Object.keys(api.paths as {});
      let pathDetails = [];

      // 각 경로별 메서드 정보 추출
      for (const path of paths) {
        const pathObj = (<any>api.paths)[path];
        const methods = Object.keys(pathObj).filter((key) =>
          ["get", "post", "put", "delete", "patch"].includes(key),
        );

        // 각 메서드별 상세 정보 추출
        for (const method of methods) {
          const operation = pathObj[method];
          pathDetails.push({
            path,
            method: method.toUpperCase(),
            summary: operation.summary || "설명 없음",
            parameters: operation.parameters || [],
            requestBody: operation.requestBody || null,
          });
        }
      }

      // 추출한 정보를 구조화하여 반환
      return JSON.stringify(
        {
          title: api.info.title,
          version: api.info.version,
          description: api.info.description,
          baseUrl: baseUrl, // 추출한 baseUrl 추가
          paths: pathDetails,
        },
        null,
        2,
      );
    } catch (error) {
      // 오류 처리 및 메시지 반환
      throw `Swagger 파싱 오류: ${(<Error>error).message}`;
    }
  },
});

// 타입 가드 함수
function isSwaggerV2(api: OpenAPI.Document): api is OpenAPIV2.Document {
  return "swagger" in api && typeof api.swagger === "string";
}

function isOpenAPIV3(
  api: OpenAPI.Document,
): api is OpenAPIV3.Document | OpenAPIV3_1.Document {
  return "openapi" in api && typeof api.openapi === "string";
}
