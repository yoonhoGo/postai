# POSTAI - HTTP API 클라이언트

POSTAI는 터미널 기반의 인터랙티브 HTTP API 클라이언트입니다. Swagger/OpenAPI 문서를 로드하고, API 검색, 요청 생성 및 실행을 AI 지원을 통해 간편하게 수행할 수 있습니다.

## 주요 기능

- **Swagger/OpenAPI 문서 관리**: URL에서 Swagger 문서 로드, 저장, 관리
- **API 검색**: 자연어 쿼리로 엔드포인트 검색
- **API 요청 실행**: HTTP 메서드(GET, POST, PUT, DELETE 등) 요청 생성 및 실행
- **자연어 명령 지원**: AI를 통한 명령어 해석

## [아키텍처](./architecture.md)

POSTAI는 다음과 같은 아키텍처 구조로 구성되어 있습니다:

### 핵심 컴포넌트

1. **UI 레이어**
   - `App.tsx`: 메인 애플리케이션 컴포넌트
   - `ChatInterface.tsx`: 사용자 입력 및 메시지 인터페이스
   - `MessageList.tsx`: 메시지 표시 컴포넌트

2. **상태 관리**
   - `swagger.store.ts`: Zustand를 사용한 Swagger 데이터 상태 관리

3. **서비스 레이어**
   - **핸들러**: 각 명령어 유형을 처리하는 핸들러
     - `swagger.handler.ts`: Swagger 명령어 처리
     - `api-request.handler.ts`: API 요청 처리
     - `api-search.handler.ts`: API 검색 처리
     - `command-interpret.handler.ts`: 자연어 명령어 해석
   - `chatService.ts`: 사용자 쿼리 처리 및 적절한 핸들러 라우팅

4. **도구(Tools)**
   - `swagger-parser.tool.ts`: Swagger 문서 파싱
   - `swagger-search.tool.ts`: Swagger 데이터 검색
   - `request.tool.ts`: HTTP 요청 실행

5. **AI 통합**
   - `model.ts`: LangChain과 Ollama를 사용한 로컬 AI 모델 통합

### 흐름도

1. 사용자가 명령어 입력
2. `chatService.ts`가 명령어 유형 분석
3. 적절한 핸들러로 라우팅 (명확하지 않은 명령어는 AI가 해석)
4. 핸들러가 명령 실행 및 결과 생성
5. 결과를 사용자에게 표시

## 주요 사용법

### Swagger 문서 관리

```bash
# URL로 API 문서 로드
https://petstore.swagger.io/v2/swagger.json 로드해줘

# 저장된 문서 관리
swagger save petstore
swagger load petstore
swagger list
swagger loaded
swagger use petstore
swagger delete petstore
```

### API 검색

```bash
# 자연어 검색
사용자 관련 API 검색
펫을 추가하는 API 찾기

# 명시적 검색
search /user
search POST
```

### API 요청

```bash
# 명시적 메서드
GET /pet/findByStatus?status=available
POST /pet {"name": "fluffy", "status": "available"}

# 요청 실행/취소
실행
취소
```

### 자연어 명령

```bash
# AI가 적절한 명령으로 해석
사용자 목록을 가져와줘
새 펫 등록해줘
```

## 기술 스택

- **프론트엔드**: React, Ink (터미널 UI)
- **상태 관리**: Zustand
- **HTTP 통신**: Axios
- **AI 통합**: LangChain, Ollama (llama3.1 모델)
- **기타 라이브러리**: swagger-parser, marked, OpenAPI/Swagger 타입

## 아키텍처 특징

1. **모듈화**: 명확히 분리된 책임을 가진 컴포넌트
2. **확장성**: 새로운 명령어 타입이나 핸들러 쉽게 추가 가능
3. **AI 통합**: 자연어 처리를 통한 사용자 친화적 인터페이스
4. **지속성**: 로컬 파일 시스템을 통한 Swagger 문서 저장 및 관리

POSTAI는 개발자가 API 문서를 탐색하고 요청을 테스트하는 과정을 단순화하여, 복잡한 HTTP 클라이언트 사용 방법을 배울 필요 없이 자연어로 쉽게 API와 상호작용할 수 있게 해줍니다.
