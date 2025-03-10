import { ChatMessage } from "../types.js";
import { swaggerTool } from "../tools/swagger-parser.tool.js";
import { apiRequestTool } from "../tools/request.tool.js";
import { model } from "../model.js";

// 사용자 쿼리 처리 함수
export async function handleUserQuery(
  userQuery: string,
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  // 간단한 명령어 처리
  if (
    userQuery.toLowerCase() === "help" ||
    userQuery.toLowerCase() === "도움말"
  ) {
    return [
      {
        role: "assistant",
        content: `
다음과 같은 명령을 사용할 수 있습니다:

1. API 문서 로드: "https://petstore.swagger.io/v2/swagger.json API 문서를 로드해줘"
2. 엔드포인트 검색: "사용자 관련 API를 찾아줘"
3. API 호출: "GET /pet/findByStatus로 available 상태인 펫 목록을 가져와줘"
4. 도움말: "help" 또는 "도움말"
5. 대화형 질문: "어떤 API를 사용해서 새로운 사용자를 등록할 수 있을까?"
        `,
        codeBlock: false,
      },
    ];
  }

  try {
    // 1. API 문서 로딩 요청 처리
    if (
      userQuery.includes("swagger") ||
      userQuery.includes("openapi") ||
      userQuery.includes("api 문서") ||
      userQuery.includes("http")
    ) {
      // URL 추출 (단순 정규식)
      const urlMatch = userQuery.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[0];
        try {
          const result = await swaggerTool.func(url);
          const swaggerData = JSON.parse(result);

          // 성공 응답
          return [
            {
              role: "assistant",
              content: `${swaggerData.title} API 문서(v${swaggerData.version})를 성공적으로 로드했습니다.`,
              codeBlock: false,
            },
            {
              role: "assistant",
              content: `사용 가능한 엔드포인트 ${swaggerData.paths.length}개가 있습니다. 주요 엔드포인트:`,
              codeBlock: false,
            },
            {
              role: "assistant",
              content: JSON.stringify(
                swaggerData.paths
                  .slice(0, 5)
                  .map(
                    (p: any) =>
                      `${p.method} ${p.path} - ${p.summary || "설명 없음"}`,
                  ),
                null,
                2,
              ),
              codeBlock: true,
              codeLanguage: "json",
            },
          ];
        } catch (error) {
          return [
            {
              role: "assistant",
              content: `API 문서 로드 중 오류가 발생했습니다: ${(error as Error).message}`,
              codeBlock: false,
            },
          ];
        }
      }
    }

    // 2. API 요청 처리
    if (
      userQuery.match(/^(GET|POST|PUT|DELETE|PATCH)/i) ||
      userQuery.includes("/pet/") ||
      userQuery.includes("/store/") ||
      userQuery.includes("/user/")
    ) {
      // 여기서는 간단한 예제 요청을 구성합니다
      // 실제로는 사용자 입력을 더 지능적으로 파싱하고 구문 분석해야 합니다

      let requestConfig;

      // 예제: GET /pet/findByStatus 요청 처리
      if (
        userQuery.includes("/pet/findByStatus") &&
        userQuery.includes("available")
      ) {
        requestConfig = {
          url: "https://petstore.swagger.io/v2/pet/findByStatus?status=available",
          method: "GET",
          headers: { "Content-Type": "application/json" },
        };
      }
      // 다른 API 요청들도 비슷하게 처리...
      else {
        // 간단한 메시지 반환
        return [
          {
            role: "assistant",
            content:
              "죄송합니다, 요청을 정확히 이해하지 못했습니다. 더 명확한 API 경로와 메서드를 지정해주세요.",
            codeBlock: false,
          },
        ];
      }

      try {
        // API 요청 실행
        const result = await apiRequestTool.func(JSON.stringify(requestConfig));
        const response = JSON.parse(result);

        return [
          {
            role: "assistant",
            content: `API 요청이 성공적으로 완료되었습니다 (상태 코드: ${response.status})`,
            codeBlock: false,
          },
          {
            role: "assistant",
            content: JSON.stringify(response.data, null, 2),
            codeBlock: true,
            codeLanguage: "json",
          },
        ];
      } catch (error) {
        return [
          {
            role: "assistant",
            content: `API 요청 중 오류가 발생했습니다: ${(error as Error).message}`,
            codeBlock: false,
          },
        ];
      }
    }

    // 3. 일반 대화형 질문 처리 - AI 모델 사용
    // const messages = conversation.map(msg => ({
    //   content: msg.content,
    //   role: msg.role
    // }));

    // messages.push({ content: userQuery, role: "user" });

    // const response = await model.invoke(messages);

    // return [{
    //   role: "assistant",
    //   content: response.content || "응답을 생성할 수 없습니다.",
    //   codeBlock: false
    // }];

    // 임시 응답 (모델 통합 전)
    return [
      {
        role: "assistant",
        content:
          "현재 이 질문에 대한 정확한 답변을 제공할 수 없습니다. 'help' 명령어로 사용 가능한 기능을 확인해보세요.",
        codeBlock: false,
      },
    ];
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
