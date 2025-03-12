import { ChatMessage } from "../../types.js";
import { swaggerTool } from "../../tools/swagger-parser.tool.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import { swaggerStorageHandler } from "./swagger-storage.handler.js";

export async function swaggerHandler(
  userQuery: string,
): Promise<ChatMessage[]> {
  // swagger 명령어 추출 - 방법 3 적용
  const commandMatch = userQuery.match(/^swagger\s+(\S+)/i);
  if (commandMatch) {
    const command = commandMatch[1].toLowerCase();
    // 명령어 이후의 모든 텍스트를 인수로 사용
    const args = userQuery
      .substring(userQuery.indexOf(command) + command.length)
      .trim();

    // 지원하는 명령어인지 확인
    const supportedCommands = [
      "save",
      "load",
      "list",
      "loaded",
      "delete",
      "remove",
      "deleteall",
      "clear",
      "use",
      "select",
    ];

    if (supportedCommands.includes(command)) {
      return await swaggerStorageHandler(command, args);
    }
  }

  // URL 추출 (단순 정규식)
  const urlMatch = userQuery.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) {
    return [
      {
        role: "assistant",
        content:
          "Swagger 명령어를 인식할 수 없습니다. 'swagger [save|load|list|loaded|delete|use] [인수]' 형식을 사용하거나 Swagger URL을 입력해주세요.",
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
        content: `${swaggerData.title || "API"} 문서(v${swaggerData.version || "N/A"})를 성공적으로 로드했습니다.`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: `API 사양: ${swaggerData.apiVersion || "정보 없음"}
    사용 가능한 엔드포인트 ${swaggerData.paths.length}개가 있습니다. 주요 엔드포인트:`,
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
