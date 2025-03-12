# POSTAI 애플리케이션 아키텍처 분석

POSTAI는 커맨드 라인 인터페이스(CLI)를 통해 Swagger/OpenAPI 문서를 관리하고 API 요청을 실행할 수 있는 애플리케이션입니다. 이 애플리케이션은 React-Ink를 기반으로 터미널에서 사용자 친화적인 인터페이스를 제공합니다.

## 애플리케이션 전체 구조

```
┌─────────────────────────┐
│        UI Layer         │
│  (React Ink Components) │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│      Application       │
│     (Hooks, State)      │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│      Service Layer      │
│  (Handlers, Utilities)  │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│       Tools Layer       │
│  (API, Swagger Parser)  │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│        AI Model         │
│     (Ollama/LLama)      │
└─────────────────────────┘
```

## 주요 레이어 설명

### 1. UI 레이어 (React Ink Components)

React Ink를 사용하여 터미널에서 동작하는 사용자 인터페이스를 구현합니다.

- **App.tsx**: 애플리케이션의 메인 컴포넌트
- **Header.tsx**: 앱 상단에 타이틀 표시
- **ChatInterface.tsx**: 메시지 목록과 입력 영역 관리
- **MessageList.tsx**: 채팅 메시지를 표시
- **InputArea.tsx**: 사용자 입력 처리
- **StatusBar.tsx**: 앱 상태 및 단축키 정보 표시
- **Markdown.tsx**: 마크다운 텍스트 렌더링

### 2. 애플리케이션 레이어 (Hooks, State)

애플리케이션의 상태 관리 및 비즈니스 로직을 담당합니다.

- **useChat.ts**: 채팅 관련 상태 및 메시지 처리 로직
- **swagger.store.ts**: Swagger 문서 관련 상태 관리 (Zustand)

### 3. 서비스 레이어 (Handlers, Utilities)

사용자 명령에 대한 처리 로직을 구현합니다.

- **chatService.ts**: 사용자 입력 처리 및 적절한 핸들러 호출
- **handlers/**: 다양한 명령 처리기
  - **api-request.handler.ts**: API 요청 처리
  - **swagger.handler.ts**: Swagger 문서 관리
  - **help.handler.ts**: 도움말 제공
  - **command-interpret.handler.ts**: 자연어 명령 해석
  - **api-search.handler.ts**: API 검색
- **utils/**: 유틸리티 함수
  - **swagger-storage.util.ts**: Swagger 문서 저장 및 불러오기
  - **api-request.util.ts**: API 요청 구성 및 처리

### 4. 도구 레이어 (Tools)

외부 시스템과의 통신 및 데이터 처리 도구를 제공합니다.

- **swagger-parser.tool.ts**: Swagger 문서 파싱
- **request.tool.ts**: HTTP API 요청 실행
- **swagger-search.tool.ts**: Swagger 문서 내 API 검색

### 5. AI 모델 (Ollama/LLama)

- **model.ts**: 로컬 LLM 모델(LLama) 설정 및 관리

## 데이터 흐름

```
┌──────────────┐  사용자 입력   ┌───────────────┐      명령 해석    ┌────────────────┐
│   사용자 입력   │────────────▶│  useChat Hook │────────────────▶│ chatService.ts │
└──────────────┘             └───────────────┘                 └────────┬───────┘
                                                                        │
                                                                        ▼
┌──────────────┐               ┌───────────────┐                ┌────────────────┐
│  UI 컴포넌트   │◀──────────────│    상태 업데이트  │◀───────────────│     핸들러       │
└──────────────┘      렌더링     └───────────────┘      결과       └────────┬───────┘
                                                                         │
                                                                         ▼
                                                                ┌────────────────┐
                                                                │      도구       │
                                                                │  (Tools 레이어)  │
                                                                └────────┬───────┘
                                                                         │
                                                                         ▼
                                                                ┌────────────────┐
                                                                │  외부 API 또는   │
                                                                │    파일 시스템    │
                                                                └────────────────┘
```

## 주요 기능 구현

### 1. Chat 인터페이스 관리

`useChat` 훅이 채팅 상태를 관리하고, `ChatInterface` 컴포넌트가 사용자 인터페이스를 제공합니다. 사용자 입력은 `handleUserQuery` 함수에서 처리됩니다.

### 2. 명령어 처리 파이프라인

1. 사용자 입력 받기 (InputArea)
2. 입력 내용 분석 (chatService)
3. 적절한 핸들러 호출 (swagger, api-request 등)
4. 결과를
5. UI에 표시

### 3. Swagger 문서 관리

1. 외부 URL에서 Swagger 파싱 (swagger-parser.tool)
2. 저장 및 불러오기 (swagger-storage.util)
3. 상태 관리 (swagger.store)

### 4. API 요청 처리

1. 사용자 입력 해석 (api-request.handler)
2. 요청 구성 (api-request.util)
3. HTTP 요청 실행 (request.tool)
4. 결과 표시 (MessageList)

### 5. AI 통합

LLM을 활용해 사용자의 자연어 명령을 해석하고 적절한 API 요청으로 변환합니다.

## 기술 스택

- **UI**: React, Ink (터미널 UI 라이브러리)
- **상태 관리**: Zustand
- **HTTP 클라이언트**: Axios
- **AI**: LangChain, Ollama (LLama 모델)
- **파일 시스템**: Node.js fs/promises API

## 설계 패턴

- **커맨드 패턴**: 다양한 핸들러를 통해 명령을 처리
- **상태 관리**: Zustand를 이용한 전역 상태 관리
- **서비스 계층 패턴**: 비즈니스 로직을 서비스와 핸들러로 분리
- **의존성 주입**: 컴포넌트와 훅을 통한 의존성 주입

이 애플리케이션은 CLI 환경에서 API 클라이언트 기능을 제공하면서 AI 기반 명령 해석 기능을 갖춘 현대적인 도구입니다. 계층화된 아키텍처로 유지보수와 확장이 용이하며, React와 같은 프론트엔드 기술을 터미널 환경에 적용한 좋은 예시입니다.
