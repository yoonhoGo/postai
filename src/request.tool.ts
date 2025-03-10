/**
 * API 요청 도구 파일
 *
 * 이 파일은 HTTP API 요청을 수행하는 도구를 정의합니다.
 * 에이전트는 이 도구를 사용하여 실제 API 엔드포인트에 요청을 보내고
 * 결과를 받아올 수 있습니다.
 *
 * axios 라이브러리를 사용하여 HTTP 요청을 처리하고,
 * 성공 및 오류 응답을 적절히 형식화합니다.
 */

import axios, { AxiosError } from "axios";
import { useConsole } from "./components/ConsolePanel.js";
import { DynamicTool } from "langchain/tools";
import { ApiRequest } from "types.js";

/**
 * API 요청 도구
 *
 * 이 도구는 다양한 HTTP 메서드(GET, POST, PUT, DELETE 등)를
 * 지원하며 JSON 형식으로 요청 매개변수를 받습니다.
 *
 * @type {DynamicTool}
 */
export const apiRequestTool = new DynamicTool({
  name: "api_request",
  description:
    '실제 API 요청을 수행합니다. API 호출이 필요할 때는 반드시 이 도구를 사용하세요. 코드 작성이 아닌 실제 API 호출만 수행합니다. 입력 형식: JSON 문자열 {"url": "요청URL", "method": "GET|POST|PUT|DELETE", "headers": {}, "data": {}}',
  func: async (inputStr) => {
    try {
      // const log = useConsole((state) => state.log);

      // log("axios response:" + inputStr);

      // 입력 문자열을 JSON으로 파싱
      const input: ApiRequest = JSON.parse(inputStr);
      const {
        url,
        method = "GET",
        headers = {},
        data = null,
        params = null,
      } = input;

      // URL 유효성 검사
      if (!url) {
        return "URL이 필요합니다";
      }
      // axios를 사용하여 HTTP 요청 수행
      const response = await axios({
        method: method.toLowerCase(),
        url,
        headers,
        data,
        params,
      });

      // log(
      //   "axios response:" +
      //     JSON.stringify(
      //       {
      //         status: response.status,
      //         statusText: response.statusText,
      //         headers: response.headers,
      //         data: response.data,
      //       },
      //       null,
      //       2,
      //     ),
      // );

      // 성공 응답 형식화 및 반환
      return JSON.stringify(
        {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
        },
        null,
        2,
      );
    } catch (error) {
      // 일반 오류와 Axios 오류 구분
      if (!(error instanceof AxiosError)) {
        return JSON.stringify(
          {
            error: true,
            message: (<Error>error).message,
          },
          null,
          2,
        );
      }

      // 서버 응답이 있는 오류 처리
      if (error.response) {
        return JSON.stringify(
          {
            error: true,
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
          },
          null,
          2,
        );
      } else {
        // 네트워크 오류 등 기타 오류 처리
        return `API 요청 오류: ${error.message}`;
      }
    }
  },
});
