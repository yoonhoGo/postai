import { ChatMessage } from "../../types.js";
import { langfuseHandler } from "../../langfuse.js";
import { model } from "../../model.js";

/**
 * 에이전트 응답을 Gemma3 모델을 통해 개선합니다.
 */
export async function enhanceAgentResponse(
  rawMessages: ChatMessage[],
  context: string = "",
): Promise<ChatMessage[]> {
  // 코드 블록이나 구조화된 데이터는 건너뛰고 텍스트 응답만 개선
  const enhancedMessages: ChatMessage[] = [];

  for (const message of rawMessages) {
    // 코드 블록은 그대로 유지
    if (message.codeBlock) {
      enhancedMessages.push(message);
      continue;
    }

    // 텍스트 응답인 경우 Gemma3로 개선
    try {
      const systemPrompt = `당신은 POSTAI라는 API 탐색 및 테스트 도구의 응답을 개선하는 역할입니다.
주어진 응답을 더 명확하고 자연스러운 언어로 개선해주세요.
원래 응답의 핵심 정보는 그대로 유지하되, 다음과 같이 개선하세요:
1. 더 자연스럽고 친근한 톤으로
2. 전문적이면서도 이해하기 쉽게
3. 맥락을 고려하여 부족한 정보 보완
4. 중요 정보는 굵게 강조
5. 불필요한 반복 제거

응답만 제공하고 추가 설명은 하지 않습니다.

컨텍스트: ${context}`;

      const response = await model.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.content },
        ],
        {
          callbacks: [langfuseHandler],
        },
      );

      enhancedMessages.push({
        ...message,
        content: response.content as string,
      });
    } catch (error) {
      // 개선 중 오류 발생 시 원본 메시지 사용
      console.warn("응답 개선 실패:", error);
      enhancedMessages.push(message);
    }
  }

  return enhancedMessages;
}
