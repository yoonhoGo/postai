import { ChatMessage } from "../../types.js";
import { swaggerTool } from "../../tools/swagger-parser.tool.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import { swaggerStorageHandler } from "./swagger-storage.handler.js";

export async function swaggerHandler(
  userQuery: string,
): Promise<ChatMessage[]> {
  // swagger 저장/불러오기 명령어 처리
  const storageMatch = userQuery.match(/^swagger\s+(save|load|list)\s*(.*)?$/i);
  if (storageMatch) {
    const [_, command, args] = storageMatch;
    return await swaggerStorageHandler(
      command.toLowerCase(),
      args?.trim() || "",
    );
  }

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

    // Swagger 데이터를 상태 저장소에 저장
    useSwaggerStore.getState().setCurrent(swaggerData);
    useSwaggerStore.getState().addToHistory(url);

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
      {
        role: "assistant",
        content: `이 Swagger 문서를 저장하려면 'swagger save <이름>'을 사용하세요.`,
        codeBlock: false,
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `API 문서 로드 중 오류가 발생했습니다: ${(<Error>error).message}`,
        codeBlock: false,
      },
    ];
  }
}
