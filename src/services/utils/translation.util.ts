import { ChatMessage } from "../../types.js";
import { koreanModel } from "../../model.js";
import { langfuseHandler } from "../../langfuse.js";

export async function translateToKorean(
  messages: ChatMessage[],
  context: string = "",
): Promise<ChatMessage[]> {
  const translatedMessages: ChatMessage[] = [];

  for (const message of messages) {
    // 코드 블록은 번역하지 않음
    if (message.codeBlock) {
      translatedMessages.push(message);
      continue;
    }

    try {
      const systemPrompt = `당신은 API 문서와 기술 콘텐츠 전문 번역가입니다. 다음 영어 텍스트를 자연스러운 한국어로 번역하세요.

1. 원본 의미를 정확히 유지하세요
2. 기술 용어는 한국에서 통용되는 방식으로 번역하거나 필요시 원문을 괄호로 유지하세요
3. 전문적이지만 친근한 어조를 유지하세요
4. 응답은 번역된 내용만 포함해야 합니다.

컨텍스트: ${context}`;

      const response = await koreanModel.invoke(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: message.content },
        ],
        {
          callbacks: [langfuseHandler],
        },
      );

      translatedMessages.push({
        ...message,
        content: response.content as string,
      });
    } catch (error) {
      console.warn("번역 중 오류 발생:", error);
      translatedMessages.push(message);
    }
  }

  return translatedMessages;
}
