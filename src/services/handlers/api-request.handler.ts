import { findPreviousApiConfig } from "../../services/utils/api-request.util.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import { apiRequestTool } from "../../tools/request.tool.js";
import { ChatMessage } from "../../types.js";

/**
 * API 요청 명령어를 처리합니다.
 * Swagger 문서에 의존하지 않고도 모든 API 요청이 가능합니다.
 */
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

  // API 요청 명령어 처리 (GET, POST 등)
  const methodMatch = userQuery.match(
    /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+/i,
  );
  if (methodMatch) {
    return await createApiRequest(userQuery);
  }

  // 명령어 인식 실패 시
  return [
    {
      role: "assistant",
      content:
        "API 요청 명령을 인식할 수 없습니다. 'GET /path', 'POST /path {데이터}' 등의 형식을 사용해주세요.",
      codeBlock: false,
    },
  ];
}

/**
 * API 요청을 생성합니다.
 * Swagger 문서에 의존하지 않고도 어떤 API 경로로든 요청할 수 있습니다.
 */
async function createApiRequest(userQuery: string): Promise<ChatMessage[]> {
  // 현재 Swagger 데이터 가져오기 (참고용으로만 사용)
  const swaggerData = useSwaggerStore.getState().current;

  // 사용자 입력 분석
  const parts = userQuery.trim().split(/\s+(.+)/);
  const method = parts[0].toUpperCase();

  let path = "";
  let bodyOrParams = "";

  if (parts.length > 1) {
    const pathParts = parts[1].split(/\s+(.+)/);
    path = pathParts[0];
    bodyOrParams = pathParts.length > 1 ? pathParts[1] : "";
  }

  // 경로 파라미터 처리 (e.g., /users/{userId} userId=123)
  const pathParamRegex = /\{([^}]+)\}/g;
  let match;
  const pathParams = new Map();

  while ((match = pathParamRegex.exec(path)) !== null) {
    const paramName = match[1];
    // 파라미터 값 찾기 (예: userId=123)
    const paramValueMatch = new RegExp(`${paramName}\\s*=\\s*([^\\s&]+)`).exec(bodyOrParams);
    if (paramValueMatch) {
      pathParams.set(paramName, paramValueMatch[1]);
    }
  }

  // 경로 파라미터 적용
  let resolvedPath = path;
  pathParams.forEach((value, key) => {
    resolvedPath = resolvedPath.replace(`{${key}}`, value);
  });

  // 요청 URL 구성
  // Swagger가 있으면 baseUrl 활용, 없으면 경로만 사용
  let baseUrl = "";
  let fullUrl = resolvedPath;

  if (swaggerData?.baseUrl) {
    baseUrl = swaggerData.baseUrl;
    fullUrl = baseUrl + (resolvedPath.startsWith("/") ? resolvedPath : "/" + resolvedPath);
  } else if (!resolvedPath.startsWith("http")) {
    // Swagger가 없고 절대 URL이 아닌 경우 사용자에게 알림
    const messages: ChatMessage[] = [
      {
        role: "assistant",
        content: "Swagger 문서가 로드되지 않아 baseUrl을 알 수 없습니다.",
        codeBlock: false,
      },
      {
        role: "assistant",
        content: "다음 옵션 중 하나를 선택해주세요:",
        codeBlock: false,
      },
      {
        role: "assistant",
        content: "1. 전체 URL을 입력하세요. (예: GET https://api.example.com/users)\n" +
                "2. baseUrl을 입력하세요. (예: set-base-url https://api.example.com)\n" +
                "3. Swagger 문서를 로드하세요. (예: swagger load petstore)",
        codeBlock: false,
      }
    ];
    return messages;
  }

  // URL이 http 또는 https로 시작하는지 확인
  if (!fullUrl.startsWith("http")) {
    fullUrl = "https://" + fullUrl; // 기본값으로 https 사용
  }

  // 쿼리 파라미터 또는 요청 본문 파싱
  let params = {};
  let body = null;

  if (bodyOrParams) {
    try {
      // JSON 본문인지 확인
      if (bodyOrParams.trim().startsWith('{') && bodyOrParams.trim().endsWith('}')) {
        body = JSON.parse(bodyOrParams);
      } else {
        // 쿼리 파라미터로 처리
        const queryParams = new URLSearchParams();
        bodyOrParams.split('&').forEach(param => {
          const [key, value] = param.split('=');
          // 이미 경로 파라미터로 사용된 것은 제외
          if (key && value && !pathParams.has(key)) {
            queryParams.append(key, value);
          }
        });
        params = Object.fromEntries(queryParams);
      }
    } catch (error) {
      // JSON 파싱 오류 시 문자열 그대로 사용
      console.warn("요청 데이터 파싱 오류:", error);
      body = bodyOrParams;
    }
  }

  // Swagger 문서가 있다면 API 정보 찾아서 참고
  let apiInfo = null;
  if (swaggerData?.paths) {
    // 패스 매칭 (경로 파라미터 고려)
    apiInfo = swaggerData.paths.find(api => {
      // 메서드 일치 확인
      if (api.method.toUpperCase() !== method) return false;

      // 경로 패턴 일치 확인 (경로 파라미터 처리)
      const apiPathPattern = api.path.replace(/{[^}]+}/g, '([^/]+)');
      const pathRegex = new RegExp(`^${apiPathPattern}$`);

      return pathRegex.test(path);
    });
  }

  // 요청 구성
  const requestConfig = {
    url: fullUrl,
    method,
    headers: { "Content-Type": "application/json" },
    params: Object.keys(params).length > 0 ? params : undefined,
    body: body
  };

  // 응답 메시지 구성
  const messages: ChatMessage[] = [
    {
      role: "assistant",
      content: `다음 API 요청을 실행할 준비가 되었습니다:`,
      codeBlock: false,
    }
  ];

  // Swagger에서 찾은 API 정보가 있으면 추가
  if (apiInfo) {
    messages.push({
      role: "assistant",
      content: `API 설명: ${apiInfo.summary || apiInfo.description || "설명 없음"}`,
      codeBlock: false,
    });
  }

  messages.push({
    role: "assistant",
    content: JSON.stringify(requestConfig, null, 2),
    codeBlock: true,
    codeLanguage: "json",
  });

  // 필요한 경우 추가 파라미터 안내
  if (apiInfo?.parameters?.length || 0 > 0) {
    const requiredParams = apiInfo?.parameters?.filter(p => p.required);
    if (requiredParams?.length || 0 > 0) {
      const missingParams = requiredParams?.filter(p => {
        // 경로 파라미터
        if (p.in === 'path' && !pathParams.has(p.name)) return true;
        // 쿼리 파라미터
        if (p.in === 'query' && !params.hasOwnProperty(p.name)) return true;
        // 본문 파라미터
        if ((p.in === 'body' || p.in === 'formData') && (!body || !body[p.name])) return true;
        return false;
      });

      if (missingParams?.length || 0 > 0) {
        messages.push({
          role: "assistant",
          content: "참고: 다음 필수 파라미터가 누락되었습니다. 필요에 따라 요청을 수정하세요:",
          codeBlock: false,
        });

        messages.push({
          role: "assistant",
          content: missingParams!.map(p =>
            `- ${p.name} (${p.in || '정보 없음'}): ${p.description || '설명 없음'}`
          ).join('\n'),
          codeBlock: true,
        });
      }
    }
  }

  messages.push({
    role: "assistant",
    content: `요청을 실행하려면 "실행" 또는 "execute"라고 입력하세요. 취소하려면 "취소" 또는 "cancel"을 입력하세요.`,
    codeBlock: false,
  });

  return messages;
}

/**
 * API 요청을 실행합니다.
 */
export async function executeApiRequest(
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

    try {
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
      // 응답이 JSON이 아닌 경우
      return [
        {
          role: "assistant",
          content: `API 요청 결과:`,
          codeBlock: false,
        },
        {
          role: "assistant",
          content: result,
          codeBlock: true,
        },
      ];
    }
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
