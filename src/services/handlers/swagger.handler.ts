import { ChatMessage } from "../../types.js";
import { swaggerTool } from "../../tools/swagger-parser.tool.js";

export async function swaggerHandler(
  userQuery: string,
): Promise<ChatMessage[]> {
  // URL 추출 (단순 정규식)
  const urlMatch = userQuery.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    return [
      {
        role: "assistant",
        content:
          "API 문서의 URL을 찾을 수 없습니다. 올바른 URL을 입력해주세요.",
        codeBlock: false,
      },
    ];
  }

  const url = urlMatch[0];
  try {
    const result = await swaggerTool.func(url);
    const swaggerData = JSON.parse(result);

    // 성공 응답
    return [
      {
        role: "assistant",
        content: `${swaggerData.title} API 문서(v${swaggerData.version})를 성공적으로 로드했습니다.`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: `사용 가능한 엔드포인트 ${swaggerData.paths.length}개가 있습니다. 주요 엔드포인트:`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: JSON.stringify(
          swaggerData.paths
            .slice(0, 5)
            .map(
              (p: any) => `${p.method} ${p.path} - ${p.summary || "설명 없음"}`,
            ),
          null,
          2,
        ),
        codeBlock: true,
        codeLanguage: "json",
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `API 문서 로드 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}
