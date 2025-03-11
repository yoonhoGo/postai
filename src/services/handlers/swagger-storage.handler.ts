import { ChatMessage } from "../../types.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import {
  saveSwaggerData,
  loadSwaggerData,
  listSavedSwaggerFiles,
} from "../utils/swagger-storage.util.js";

export async function swaggerStorageHandler(
  command: string,
  args: string,
): Promise<ChatMessage[]> {
  // 저장 명령어 처리
  if (command === "save") {
    return await handleSaveSwagger(args);
  }

  // 불러오기 명령어 처리
  if (command === "load") {
    return await handleLoadSwagger(args);
  }

  // 목록 조회 명령어 처리
  if (command === "list") {
    return await handleListSwaggers();
  }

  return [
    {
      role: "assistant",
      content:
        "알 수 없는 명령입니다. 'swagger save <이름>', 'swagger load <이름>', 또는 'swagger list'를 사용해주세요.",
      codeBlock: false,
    },
  ];
}

async function handleSaveSwagger(name: string): Promise<ChatMessage[]> {
  const swaggerData = useSwaggerStore.getState().current;

  if (!swaggerData) {
    return [
      {
        role: "assistant",
        content:
          "저장할 Swagger 데이터가 없습니다. 먼저 Swagger 문서를 로드해주세요.",
        codeBlock: false,
      },
    ];
  }

  if (!name || name.trim() === "") {
    return [
      {
        role: "assistant",
        content:
          "저장할 이름을 지정해주세요. 'swagger save <이름>' 형식으로 사용합니다.",
        codeBlock: false,
      },
    ];
  }

  try {
    await saveSwaggerData(name, swaggerData);
    return [
      {
        role: "assistant",
        content: `Swagger 문서가 '${name}' 이름으로 성공적으로 저장되었습니다.`,
        codeBlock: false,
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `Swagger 저장 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

async function handleLoadSwagger(name: string): Promise<ChatMessage[]> {
  if (!name || name.trim() === "") {
    return [
      {
        role: "assistant",
        content:
          "불러올 Swagger 이름을 지정해주세요. 'swagger load <이름>' 형식으로 사용합니다.",
        codeBlock: false,
      },
    ];
  }

  try {
    const swaggerData = await loadSwaggerData(name);
    useSwaggerStore.getState().setCurrent(swaggerData);

    return [
      {
        role: "assistant",
        content: `'${name}' Swagger 문서를 성공적으로 불러왔습니다.`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: `API 제목: ${swaggerData.title} (버전: ${swaggerData.version})
사용 가능한 엔드포인트 수: ${swaggerData.paths.length}개`,
        codeBlock: false,
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `Swagger 불러오기 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

async function handleListSwaggers(): Promise<ChatMessage[]> {
  try {
    const files = await listSavedSwaggerFiles();

    if (files.length === 0) {
      return [
        {
          role: "assistant",
          content: "저장된 Swagger 문서가 없습니다.",
          codeBlock: false,
        },
      ];
    }

    return [
      {
        role: "assistant",
        content: "저장된 Swagger 문서 목록:",
        codeBlock: false,
      },
      {
        role: "assistant",
        content: files.join("\n"),
        codeBlock: true,
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `Swagger 목록 조회 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}
