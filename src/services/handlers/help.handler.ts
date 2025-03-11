import { ChatMessage } from "../../types.js";

export function helpHandler(): ChatMessage[] {
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
