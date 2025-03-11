import { ChatMessage } from "../../types.js";

interface ApiRequestConfig {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * 모델 응답에서 API 요청 설정을 추출합니다.
 */
export async function extractApiConfig(modelContent: string): Promise<ApiRequestConfig | null> {
  try {
    // 모델 응답에서 JSON 부분만 추출 (코드 블록이나 추가 텍스트가 있을 수 있음)
    const jsonMatch = modelContent.match(/```json\s*([\s\S]*?)\s*```/) ||
                      modelContent.match(/{[\s\S]*}/);

    if (!jsonMatch) return null;

    const jsonString = jsonMatch[0].replace(/```json|```/g, '');
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("API 설정 추출 중 오류:", error);
    return null;
  }
}

/**
 * 이전 대화에서 API 요청 설정을 찾습니다.
 */
export function findPreviousApiConfig(conversation: ChatMessage[]): ApiRequestConfig | null {
  for (let i = conversation.length - 1; i >= 0; i--) {
    const msg = conversation[i];
    if (msg.codeBlock && msg.codeLanguage === "json") {
      try {
        const config = JSON.parse(msg.content);
        // 기본적인 API 요청 설정인지 검증
        if (config.url && config.method) {
          return config;
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}
