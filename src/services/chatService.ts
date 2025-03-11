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

    // 2. API 요청 처리 고도화 (Ollama 모델 사용)
    if (userQuery.startsWith("GET") ||
        userQuery.startsWith("POST") ||
        userQuery.startsWith("PUT") ||
        userQuery.startsWith("DELETE") ||
        userQuery.startsWith("PATCH")) {

      // Ollama 모델에게 사용자 쿼리 해석 및 요청 구성 요청
      const messages = [
        {
          role: "system",
          content: `당신은 API 요청을 분석하고 구성하는 전문가입니다.
          사용자가 자연어로 API 요청을 지시하면, 다음 형식의 JSON 설정을 반환하세요:
          {
            "url": "전체 URL (쿼리 파라미터 포함)",
            "method": "HTTP 메서드",
            "headers": { 헤더 객체 },
            "body": 요청 본문 (있는 경우)
          }
          오직 이 JSON 객체만 반환하고 다른 설명은 하지 마세요.`
        },
        {
          role: "user",
          content: userQuery
        }
      ];

      try {
        // Ollama 모델을 사용하여 API 요청 구성
        const modelResponse = await model.invoke(messages);
        const modelContent = modelResponse.content as string;

        // JSON 추출 시도
        let requestConfig;
        try {
          // 모델 응답에서 JSON 부분만 추출 (코드 블록이나 추가 텍스트가 있을 수 있음)
          const jsonMatch = modelContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                           modelContent.match(/{[\s\S]*}/);

          const jsonString = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : modelContent;
          requestConfig = JSON.parse(jsonString);
        } catch (jsonError) {
          return [
            {
              role: "assistant",
              content: `API 요청 해석 중 오류가 발생했습니다. 좀 더 명확한 요청을 해주세요: ${(jsonError as Error).message}`,
              codeBlock: false,
            },
          ];
        }

        // 요청 검증
        if (!requestConfig.url || !requestConfig.method) {
          return [
            {
              role: "assistant",
              content: "API 요청에 필요한 URL이나 메서드가 지정되지 않았습니다. 더 상세한 요청을 해주세요.",
              codeBlock: false,
            },
          ];
        }

        // API 요청 실행 전 사용자에게 확인
        return [
          {
            role: "assistant",
            content: `다음 API 요청을 실행할 준비가 되었습니다:`,
            codeBlock: false,
          },
          {
            role: "assistant",
            content: JSON.stringify(requestConfig, null, 2),
            codeBlock: true,
            codeLanguage: "json",
          },
          {
            role: "assistant",
            content: `요청을 실행하려면 "실행" 또는 "execute"라고 입력하세요. 취소하려면 "취소" 또는 "cancel"을 입력하세요.`,
            codeBlock: false,
          },
        ];
      } catch (modelError) {
        return [
          {
            role: "assistant",
            content: `API 요청 해석 중 오류가 발생했습니다: ${(modelError as Error).message}`,
            codeBlock: false,
          },
        ];
      }
    }

    // 실행 확인 처리
    if (userQuery.toLowerCase() === "실행" || userQuery.toLowerCase() === "execute") {
      // 이전 메시지에서 요청 설정 가져오기
      const previousMessages = conversation;
      let requestConfig = null;

      // 이전 메시지에서 API 요청 설정 찾기
      for (let i = previousMessages.length - 1; i >= 0; i--) {
        const msg = previousMessages[i];
        if (msg.codeBlock && msg.codeLanguage === "json") {
          try {
            requestConfig = JSON.parse(msg.content);
            break;
          } catch (e) {
            continue;
          }
        }
      }

      if (!requestConfig) {
        return [
          {
            role: "assistant",
            content: "실행할 API 요청을 찾을 수 없습니다. 먼저 API 요청을 입력해주세요.",
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

    // 취소 처리
    if (userQuery.toLowerCase() === "취소" || userQuery.toLowerCase() === "cancel") {
      return [
        {
          role: "assistant",
          content: "API 요청이 취소되었습니다.",
          codeBlock: false,
        },
      ];
    }

    // 3. 일반 대화형 질문 처리 - AI 모델 사용
    const messages = conversation.map(msg => ({
      content: msg.content,
      role: msg.role
    }));

    messages.push({ content: userQuery, role: "user" });

    const response = await model.invoke(messages);

    return [{
      role: "assistant",
      content: response.content as string || "응답을 생성할 수 없습니다.",
      codeBlock: false
    }];

    // 임시 응답 (모델 통합 전)
    // return [
    //   {
    //     role: "assistant",
    //     content:
    //       "현재 이 질문에 대한 정확한 답변을 제공할 수 없습니다. 'help' 명령어로 사용 가능한 기능을 확인해보세요.",
    //     codeBlock: false,
    //   },
    // ];
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
