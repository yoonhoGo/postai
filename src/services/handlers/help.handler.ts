import { ChatMessage } from "../../types.js";

export function helpHandler(): ChatMessage[] {
  return [
    {
      role: "assistant",
      content: `
다음과 같은 명령을 사용할 수 있습니다:

1. API 문서 로드: "https://petstore.swagger.io/v2/swagger.json API 문서를 로드해줘"
2. Swagger 저장: "swagger save petstore" (현재 로드된 Swagger 문서 저장)
3. Swagger 불러오기:
   - "swagger load petstore" (단일 문서 불러오기)
   - "swagger load petstore,userapi" (여러 문서 불러오기)
   - "swagger load all" (모든 저장된 문서 불러오기)
4. Swagger 전환: "swagger use petstore" (로드된 여러 문서 간 전환)
5. Swagger 목록:
   - "swagger list" (저장된 모든 문서 목록 보기)
   - "swagger loaded" (현재 메모리에 로드된 문서 목록 보기)
6. Swagger 삭제:
   - "swagger delete petstore" (저장된 Swagger 문서 삭제)
   - "swagger deleteall" (모든 저장된 Swagger 문서 삭제)
7. 엔드포인트 검색: "사용자 관련 API를 찾아줘"
8. API 호출: "GET /pet/findByStatus로 available 상태인 펫 목록을 가져와줘"
9. 도움말: "help" 또는 "도움말"
10. 대화형 질문: "어떤 API를 사용해서 새로운 사용자를 등록할 수 있을까?"
      `,
      codeBlock: false,
    },
  ];
}
