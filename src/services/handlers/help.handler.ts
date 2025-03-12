import { ChatMessage } from "../../types.js";

export function helpHandler(): ChatMessage[] {
  return [
    {
      role: "assistant",
      content: `
# POSTAI 명령어 가이드

## Swagger 문서 관리
- API 문서 로드: "https://petstore.swagger.io/v2/swagger.json API 문서를 로드해줘"
- 저장: "swagger save petstore"
- 불러오기:
  * 단일 문서: "swagger load petstore"
  * 여러 문서: "swagger load petstore,userapi"
  * 모든 문서: "swagger load all"
- 전환: "swagger use petstore"
- 목록 조회:
  * 저장된 문서: "swagger list"
  * 로드된 문서: "swagger loaded"
- 삭제:
  * 단일 문서: "swagger delete petstore"
  * 모든 문서: "swagger deleteall"

## API 검색
- 키워드 검색: "사용자 관련 API 검색"
- 기능 검색: "펫을 추가하는 API 찾기"
- 경로 검색: "/user 관련 API 찾기"
- 메서드 검색: "POST 메서드 API 검색"

## API 요청
- GET 요청: "GET /pet/findByStatus?status=available"
- POST 요청: "POST /pet {'name': 'fluffy', 'status': 'available'}"
- 요청 실행: "실행" 또는 "execute"
- 요청 취소: "취소" 또는 "cancel"

## 자연어 명령
명시적 명령 외에도 자연어로 요청할 수 있습니다:
- "사용자 목록을 가져와줘" → GET /user
- "이름이 fluffy인 새 펫 등록해줘" → POST /pet 요청 준비
- "펫스토어 API 문서 불러와" → swagger load petstore

도움말: "help" 또는 "도움말"
      `,
      codeBlock: false,
    },
  ];
}
