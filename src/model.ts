/**
 * AI 모델 구성 파일
 *
 * 이 파일은 HTTP API Client 프로그램에서 사용할
 * Ollama 기반 AI 모델을 설정합니다.
 *
 * LangChain의 ChatOllama 클래스를 사용하여 로컬에서 실행되는
 * Ollama 서비스에 연결하고 llama3.1 모델을 활용합니다.
 */

import { ChatOllama } from "@langchain/ollama";

/**
 * Ollama 모델 인스턴스
 *
 * temperature가 0으로 설정되어 일관된 결과를 생성합니다.
 * 이는 API 클라이언트와 같은 도구에서 중요한 특성입니다.
 *
 * @type {ChatOllama}
 */
export const model = new ChatOllama({
  model: "gemma3:12b",  // 사용할 모델 - llama3.1 채택
  temperature: 0      // 0으로 설정하여 결정적 출력 생성
});
