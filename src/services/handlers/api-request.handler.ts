import { ChatMessage } from "../../types.js";
import { apiRequestTool } from "../../tools/request.tool.js";
import { model } from "../../model.js";
import {
  extractApiConfig,
  findPreviousApiConfig,
} from "../utils/api-request.util.js";
import { langfuseHandler } from "../../langfuse.js";

export async function apiRequestHandler(
  userQuery: string,
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  const lowerQuery = userQuery.toLowerCase();

  // 실행/취소 명령 처리
  if (lowerQuery === "실행" || lowerQuery === "execute") {
    return await executeApiRequest(conversation);
  }

  if (lowerQuery === "취소" || lowerQuery === "cancel") {
    return [
      {
        role: "assistant",
        content: "API 요청이 취소되었습니다.",
        codeBlock: false,
      },
    ];
  }

  // API 요청 명령 처리 (GET, POST 등)
  const methodMatch = userQuery.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/i);
  if (methodMatch) {
    return await createApiRequest(userQuery);
  }

  // 명령어 인식 실패 시
  return [
    {
      role: "assistant",
      content: "API 요청 명령을 인식할 수 없습니다. 'GET /path', 'POST /path {데이터}' 등의 형식을 사용해주세요.",
      codeBlock: false,
    },
  ];
}

async function createApiRequest(userQuery: string): Promise<ChatMessage[]> {
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
      오직 이 JSON 객체만 반환하고 다른 설명은 하지 마세요.

      {{변수}}가 요청에 포함된 경우 {{변수}}를 요청에서 분석하여 대치하여 응답하세요.
      요청 예시) GET https://{{server}}/v1/pet/{{petId}} server=www.petstore.dev petId=123
      응답 예시) {
        "url": "https://www.petstore.dev/v1/pet/123",
        "method": "GET"
      }`,
    },
    {
      role: "user",
      content: userQuery,
    },
  ];

  try {
    // Ollama 모델을 사용하여 API 요청 구성
    const modelResponse = await model.invoke(messages, {
      callbacks: [langfuseHandler],
    });
    const modelContent = modelResponse.content as string;

    // JSON 추출 시도
    const requestConfig = await extractApiConfig(modelContent);
    if (!requestConfig) {
      return [
        {
          role: "assistant",
          content:
            "API 요청 해석 중 오류가 발생했습니다. 좀 더 명확한 요청을 해주세요.",
          codeBlock: false,
        },
      ];
    }

    // 요청 검증
    if (!requestConfig.url || !requestConfig.method) {
      return [
        {
          role: "assistant",
          content:
            "API 요청에 필요한 URL이나 메서드가 지정되지 않았습니다. 더 상세한 요청을 해주세요.",
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

async function executeApiRequest(
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  // 이전 메시지에서 요청 설정 가져오기
  const requestConfig = findPreviousApiConfig(conversation);

  if (!requestConfig) {
    return [
      {
        role: "assistant",
        content:
          "실행할 API 요청을 찾을 수 없습니다. 먼저 API 요청을 입력해주세요.",
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
