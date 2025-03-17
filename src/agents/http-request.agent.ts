import { z } from "zod";
import axios, { AxiosError } from "axios";

const prompt = `
당신은, 요청 변환 에이전트가 생성한 파라미터를 사용하여 실제 HTTP 요청을 수행하는 전문가입니다.

## 당신의 역할:
1. axios 라이브러리를 사용하여 HTTP 요청을 실행합니다.
2. 응답 데이터, 상태 코드, 헤더 등을 캡처합니다.
3. 오류, 타임아웃 등 예외상황을 처리하고 보고합니다.
4. 요청과 응답 정보를 로깅합니다.

## 출력 형식:
\`\`\`
{{
  "status": "success | error",
  "statusCode": HTTP 상태 코드,
  "responseTime": 응답 시간(밀리초),
  "responseHeaders": {{"헤더명": "값"}},
  "responseData": 응답 데이터(객체 또는 문자열),
  "error": 오류 정보(있는 경우),
  "logs": ["요청/응답 관련 로그 메시지"]
}}
\`\`\`

## 예시:

### 예시 1: 성공적인 GET 요청
입력:
\`\`\`json
{{
  "url": "https://jsonplaceholder.typicode.com/users",
  "method": "get",
  "headers": {{}},
  "data": null,
  "params": {{}},
  "timeout": 5000
}}
\`\`\`

출력:
\`\`\`json
{{
  "status": "success",
  "statusCode": 200,
  "responseTime": 320,
  "responseHeaders": {{
    "content-type": "application/json; charset=utf-8",
    "cache-control": "max-age=43200"
  }},
  "responseData": [
    {{
      "id": 1,
      "name": "Leanne Graham",
      "username": "Bret",
      "email": "Sincere@april.biz",
      "address": {{
        "street": "Kulas Light",
        "suite": "Apt. 556",
        "city": "Gwenborough",
        "zipcode": "92998-3874"
      }}
    }}
    // ... 추가 사용자 데이터 ...
  ],
  "error": null,
  "logs": [
    "2023-11-02T15:30:45Z - 요청 시작: GET https://jsonplaceholder.typicode.com/users",
    "2023-11-02T15:30:46Z - 응답 수신: 상태 코드 200, 데이터 크기 1.2KB"
  ]
}}
\`\`\`

### 예시 2: 오류 발생
입력:
\`\`\`json
{{
  "url": "https://api.example.com/nonexistent",
  "method": "get",
  "headers": {{}},
  "data": null,
  "params": {{}},
  "timeout": 5000
}}
\`\`\`

출력:
\`\`\`json
{{
  "status": "error",
  "statusCode": 404,
  "responseTime": 180,
  "responseHeaders": {{
    "content-type": "application/json",
    "server": "nginx/1.18.0"
  }},
  "responseData": {{
    "error": "Resource not found",
    "message": "The requested endpoint does not exist"
  }},
  "error": {{
    "name": "AxiosError",
    "message": "Request failed with status code 404",
    "code": "ERR_BAD_REQUEST"
  }},
  "logs": [
    "2023-11-02T15:35:12Z - 요청 시작: GET https://api.example.com/nonexistent",
    "2023-11-02T15:35:12Z - 오류 발생: 404 Not Found",
    "2023-11-02T15:35:12Z - 오류 응답 수신: 상태 코드 404, 에러 메시지: 'Resource not found'"
  ]
}}
\`\`\`

### 예시 3: 타임아웃 발생
입력:
\`\`\`json
{{
  "url": "https://api.slow-server.com/data",
  "method": "get",
  "headers": {{}},
  "data": null,
  "params": {{}},
  "timeout": 1000
}}
\`\`\`

출력:
\`\`\`json
{{
  "status": "error",
  "statusCode": null,
  "responseTime": 1000,
  "responseHeaders": {{}},
  "responseData": null,
  "error": {{
    "name": "AxiosError",
    "message": "timeout of 1000ms exceeded",
    "code": "ECONNABORTED"
  }},
  "logs": [
    "2023-11-02T15:40:30Z - 요청 시작: GET https://api.slow-server.com/data",
    "2023-11-02T15:40:31Z - 타임아웃 발생: 1000ms 제한 초과",
    "2023-11-02T15:40:31Z - 요청 중단됨"
  ]
}}
\`\`\`
`;

// HTTP 요청 에이전트의 출력 스키마 정의
const httpResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  statusCode: z.number().nullable(),
  responseTime: z.number(),
  responseHeaders: z.record(z.any()).optional(),
  responseData: z.any().nullable(),
  error: z
    .object({
      name: z.string().optional(),
      message: z.string().optional(),
      code: z.string().optional(),
    })
    .nullable()
    .optional(),
  logs: z.array(z.string()).optional(),
});

export type HttpResponseResult = z.infer<typeof httpResponseSchema>;

// 에이전트 생성 함수
export function createHttpRequestAgent() {
  return {
    invoke: async (input: { axiosConfig: string | object }) => {
      try {
        // axiosConfig가 문자열이면 객체로 변환
        const config =
          typeof input.axiosConfig === "string"
            ? JSON.parse(input.axiosConfig)
            : input.axiosConfig;

        const startTime = Date.now();
        const logs = [
          `${new Date().toISOString()} - 요청 시작: ${config.method?.toUpperCase()} ${config.url}`,
        ];

        try {
          // 실제 HTTP 요청 수행
          const response = await axios({
            url: config.url,
            method: config.method,
            headers: config.headers || {},
            data: config.data || null,
            params: config.params || null,
            timeout: config.timeout || 5000,
            validateStatus: () => true, // 모든 상태 코드를 성공으로 처리
          });

          const responseTime = Date.now() - startTime;
          logs.push(
            `${new Date().toISOString()} - 응답 수신: 상태 코드 ${response.status}, 데이터 크기 ${
              JSON.stringify(response.data).length / 1024
            }KB`,
          );

          // 성공적인 응답 반환
          return {
            status: "success",
            statusCode: response.status,
            responseTime,
            responseHeaders: response.headers,
            responseData: response.data,
            error: null,
            logs,
          };
        } catch (error) {
          // 오류 응답 반환
          const responseTime = Date.now() - startTime;
          const axiosError = error as AxiosError;

          logs.push(
            `${new Date().toISOString()} - 오류 발생: ${axiosError.message}`,
          );

          return {
            status: "error",
            statusCode: axiosError.response?.status || null,
            responseTime,
            responseHeaders: axiosError.response?.headers || {},
            responseData: axiosError.response?.data || null,
            error: {
              name: axiosError.name,
              message: axiosError.message,
              code: axiosError.code,
            },
            logs,
          };
        }
      } catch (error) {
        // 구성 파싱 등의 오류 처리
        console.error("HTTP 요청 에이전트 오류:", error);
        return {
          status: "error",
          statusCode: null,
          responseTime: 0,
          responseData: null,
          error: {
            name: "ParsingError",
            message: `요청 구성 처리 중 오류: ${(error as Error).message}`,
            code: "PARSING_ERROR",
          },
          logs: [
            `${new Date().toISOString()} - 요청 구성 처리 오류: ${(error as Error).message}`,
          ],
        };
      }
    },
  };
}
