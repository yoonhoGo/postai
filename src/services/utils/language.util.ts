import { koreanModel } from "../../model.js";
import { langfuseHandler } from "../../langfuse.js";

export async function translateUserInput(input: string): Promise<string> {
  // 한국어 감지 (간단한 휴리스틱)
  const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(input);

  if (!hasKorean) {
    return input; // 영어면 그대로 반환
  }

  try {
    // 한국어를 영어로 번역
    const systemPrompt = `당신은 API 문서와 기술 콘텐츠 전문 번역가입니다. 다음 한국어 텍스트를 자연스러운 영어로 번역하세요.

1. 의미를 정확히 유지하세요
2. 기술 용어는 영어 전문용어로 정확히 번역하세요
3. 번역된 내용만 응답하세요.`;

    const response = await koreanModel.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      {
        callbacks: [langfuseHandler],
      },
    );

    return response.content as string;
  } catch (error) {
    console.warn("입력 번역 오류:", error);
    return input; // 오류 시 원본 반환
  }
}
