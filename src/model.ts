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
import { BedrockChat } from "@langchain/community/chat_models/bedrock";

// export const model = new BedrockChat({
//   // model: "anthropic.claude-3-5-sonnet-20240620-v1:0",
//   model: "us.meta.llama3-3-70b-instruct-v1:0",
//   region: 'us-east-1',
//   profile: 'query',
//   maxRetries: 3,
//   maxTokens: 1_000,
// });

/**
 * Ollama 모델 인스턴스
 *
 * temperature가 0으로 설정되어 일관된 결과를 생성합니다.
 * 이는 API 클라이언트와 같은 도구에서 중요한 특성입니다.
 *
 * @type {ChatOllama}
 */
 export const model = new ChatOllama({
   model: "llama3.1",
   temperature: 0
 });

 // 한국어 응답용 모델 추가
 export const koreanModel = new ChatOllama({
   model: "gemma3:4b", // Gemma3 모델
   temperature: 0
 });
