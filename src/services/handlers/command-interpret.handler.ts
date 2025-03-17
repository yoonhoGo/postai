import { ChatMessage } from "../../types.js";
import { model } from "../../model.js";
import { swaggerHandler } from "./swagger.handler.js";
import { apiRequestHandler } from "./api-request.handler.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import { apiSearchHandler } from "./api-search.handler.js";
import { langfuseHandler } from "../../langfuse.js";

export async function commandInterpretHandler(
  userQuery: string,
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  // 현재 로드된 Swagger 정보 가져오기
  const swaggerStore = useSwaggerStore.getState();
  const currentSwagger = swaggerStore.current;
  const loadedSwaggers = swaggerStore.getAllLoadedNames();

  // AI에게 명령어 해석 요청
  const systemPrompt = `당신은 API 클라이언트의 명령어 해석기입니다. 사용자의 자연어 명령을 분류하여 적절한 명령으로 변환해주세요.

  현재 로드된 Swagger 데이터: ${currentSwagger ? `${currentSwagger.title} (v${currentSwagger.version})` : "없음"}
  사용 가능한 다른 Swagger 문서: ${loadedSwaggers.length > 0 ? loadedSwaggers.join(", ") : "없음"}

  지원하는 명령어 유형:
  1. Swagger 관련 명령어: 'swagger [save|load|list|loaded|delete|clear|use] [인수]'
  2. API 요청: 'GET|POST|PUT|DELETE|PATCH [경로] [요청 데이터]'
  3. API 검색: 'search [검색어]'

  중요 제약사항:
  - Swagger 문서가 로드되지 않은 경우 API 검색이나 요청을 처리할 수 없습니다.
  - 확실하지 않은 정보는 제공하지 마세요.
  - API 요청이나 검색 명령을 해석할 때는 현재 로드된 문서의 내용만 기반으로 해석하세요.

  사용자의 의도를 분석하여 다음 형식으로 응답해주세요:
  {
    "commandType": "swagger" | "api" | "search",
    "command": "변환된 명령어",
    "confidence": "high" | "medium" | "low" // 해석 신뢰도 추가
  }`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userQuery },
  ];

  try {
    const response = await model.invoke(messages, {
      callbacks: [langfuseHandler],
    });
    const content = response.content as string;

    // JSON 응답 추출 시도
    try {
      const jsonMatch = content.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error("명령어 형식 해석 실패");
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      // 신뢰도가 낮은 명령은 거부
      if (
        parsedResponse.confidence === "low" &&
        (parsedResponse.commandType === "api" ||
          parsedResponse.commandType === "search")
      ) {
        return [
          {
            role: "assistant",
            content:
              "요청하신 명령을 처리하기 위한 충분한 정보가 없습니다. 더 구체적인 명령어를 입력하거나, 'swagger list'로 사용 가능한 API 문서를 확인해주세요.",
            codeBlock: false,
          },
        ];
      }

      // 명령어 유형 확인 및 적절한 핸들러 호출
      if (parsedResponse.commandType === "swagger") {
        return await swaggerHandler(parsedResponse.command);
      } else if (parsedResponse.commandType === "api") {
        return await apiRequestHandler(parsedResponse.command, conversation);
      } else if (parsedResponse.commandType === "search") {
        return await apiSearchHandler(parsedResponse.command);
      } else {
        return [
          {
            role: "assistant",
            content:
              "명령어를 해석할 수 없습니다. 'help'를 입력하여 사용 가능한 명령어를 확인하세요.",
            codeBlock: false,
          },
        ];
      }
    } catch (error) {
      // JSON 파싱 실패 시 기본 메시지 반환
      return [
        {
          role: "assistant",
          content:
            "명령어를 해석할 수 없습니다. 더 구체적인 명령어를 입력하거나, 'help'를 입력하여 도움말을 확인하세요.",
          codeBlock: false,
        },
      ];
    }
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `명령어 해석 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}
