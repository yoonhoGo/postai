import { ChatMessage } from "../../types.js";
import { useSwaggerStore } from "../../store/swagger.store.js";
import {
  saveSwaggerData,
  loadSwaggerData,
  listSavedSwaggerFiles,
  deleteSwaggerFile,
  deleteAllSwaggerFiles,
  loadMultipleSwaggerData,
  loadAllSwaggerData
} from "../utils/swagger-storage.util.js";

export async function swaggerStorageHandler(
  command: string,
  args: string
): Promise<ChatMessage[]> {
  // 저장 명령어 처리
  if (command === 'save') {
    return await handleSaveSwagger(args);
  }

  // 불러오기 명령어 처리
  if (command === 'load') {
    return await handleLoadSwagger(args);
  }

  // 목록 조회 명령어 처리
  if (command === 'list') {
    return await handleListSwaggers();
  }

  // 삭제 명령어 처리
  if (command === 'delete' || command === 'remove') {
    return await handleDeleteSwagger(args);
  }

  // 전체 삭제 명령어 처리
  if (command === 'deleteall' || command === 'clear') {
    return await handleDeleteAllSwaggers();
  }

  // 현재 Swagger 전환 명령어 처리
  if (command === 'use' || command === 'select') {
    return await handleUseSwagger(args);
  }

  // 현재 로드된 Swagger 목록 조회
  if (command === 'loaded') {
    return await handleListLoadedSwaggers();
  }

  return [
    {
      role: "assistant",
      content:
        "알 수 없는 명령입니다. 아래 명령어를 사용해주세요:\n" +
        "- 'swagger save <이름>': 현재 문서 저장\n" +
        "- 'swagger load <이름>': 저장된 문서 불러오기\n" +
        "- 'swagger load <이름1,이름2,...>': 여러 문서 불러오기\n" +
        "- 'swagger load all': 모든 저장된 문서 불러오기\n" +
        "- 'swagger use <이름>': 로드된 문서 중 지정한 문서로 전환\n" +
        "- 'swagger loaded': 현재 로드된 문서 목록\n" +
        "- 'swagger list': 저장된 문서 목록\n" +
        "- 'swagger delete <이름>': 저장된 문서 삭제\n" +
        "- 'swagger deleteall': 모든 저장된 문서 삭제",
      codeBlock: false,
    },
  ];
}

// Swagger 저장 처리
async function handleSaveSwagger(name: string): Promise<ChatMessage[]> {
  const swaggerData = useSwaggerStore.getState().current;

  if (!swaggerData) {
    return [
      {
        role: "assistant",
        content: "저장할 Swagger 데이터가 없습니다. 먼저 Swagger 문서를 로드해주세요.",
        codeBlock: false,
      },
    ];
  }

  if (!name || name.trim() === '') {
    return [
      {
        role: "assistant",
        content: "저장할 이름을 지정해주세요. 'swagger save <이름>' 형식으로 사용합니다.",
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

// Swagger 불러오기 핸들러 - 통합 버전
async function handleLoadSwagger(args: string): Promise<ChatMessage[]> {
  // 인수가 없거나 'all'인 경우 모든 Swagger 로드
  if (!args || args.trim() === '' || args.toLowerCase() === 'all') {
    return await handleLoadAllSwaggers();
  }

  // 쉼표로 구분된 여러 파일 이름인 경우
  if (args.includes(',')) {
    const names = args.split(',').map(name => name.trim()).filter(Boolean);
    return await handleLoadMultipleSwaggers(names);
  }

  // 단일 파일 로드
  try {
    const swaggerData = await loadSwaggerData(args);

    // 저장소에 추가 및 현재 데이터로 설정
    useSwaggerStore.getState().addSwagger(args, swaggerData);
    useSwaggerStore.getState().setCurrent(swaggerData);

    return [
      {
        role: "assistant",
        content: `'${args}' Swagger 문서를 성공적으로 불러왔습니다.`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: `API 제목: ${swaggerData.title || "제목 없음"} (버전: ${swaggerData.version || "버전 정보 없음"})
  API 사양: ${swaggerData.apiVersion || "버전 정보 없음"}
  사용 가능한 엔드포인트 수: ${swaggerData.paths?.length || 0}개`,
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

// 저장된 Swagger 목록 조회
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
        content: files.join('\n'),
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

// Swagger 파일 삭제 처리
async function handleDeleteSwagger(name: string): Promise<ChatMessage[]> {
  if (!name || name.trim() === '') {
    return [
      {
        role: "assistant",
        content: "삭제할 Swagger 이름을 지정해주세요. 'swagger delete <이름>' 형식으로 사용합니다.",
        codeBlock: false,
      },
    ];
  }

  try {
    await deleteSwaggerFile(name);
    return [
      {
        role: "assistant",
        content: `'${name}' Swagger 문서가 성공적으로 삭제되었습니다.`,
        codeBlock: false,
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `Swagger 삭제 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

// 모든 Swagger 파일 삭제 처리
async function handleDeleteAllSwaggers(): Promise<ChatMessage[]> {
  try {
    const deletedCount = await deleteAllSwaggerFiles();

    if (deletedCount === 0) {
      return [
        {
          role: "assistant",
          content: "삭제할 Swagger 문서가 없습니다.",
          codeBlock: false,
        },
      ];
    }

    return [
      {
        role: "assistant",
        content: `총 ${deletedCount}개의 Swagger 문서가 모두 삭제되었습니다.`,
        codeBlock: false,
      },
    ];
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `Swagger 삭제 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

// 여러 Swagger 파일 로드 처리
async function handleLoadMultipleSwaggers(names: string[]): Promise<ChatMessage[]> {
  try {
    const results = await loadMultipleSwaggerData(names);

    // 각 성공 로드된 Swagger를 저장소에 추가
    results.loaded.forEach(({ name, data }) => {
      useSwaggerStore.getState().addSwagger(name, data);
    });

    // 마지막으로 로드된 Swagger를 현재 선택으로 설정 (있는 경우)
    if (results.loaded.length > 0) {
      useSwaggerStore.getState().setCurrent(results.loaded[results.loaded.length - 1].data);
    }

    // 응답 메시지 생성
    const messages: ChatMessage[] = [];

    if (results.loaded.length > 0) {
      messages.push({
        role: "assistant",
        content: `${results.loaded.length}개의 Swagger 문서를 성공적으로 불러왔습니다.`,
        codeBlock: false,
      });

      const loadedSummary = results.loaded
        .map(({ name, data }) =>
          `- ${name}: ${data.title || "제목 없음"} (v${data.version || "버전 없음"}), ` +
          `API 사양: ${data.apiVersion || "정보 없음"}, ` +
          `${data.paths?.length || 0}개 엔드포인트`)
        .join('\n');

      messages.push({
        role: "assistant",
        content: loadedSummary,
        codeBlock: true,
      });
    }

    if (results.failed.length > 0) {
      messages.push({
        role: "assistant",
        content: `${results.failed.length}개의 Swagger 문서를 불러오는 데 실패했습니다.`,
        codeBlock: false,
      });

      const failedSummary = results.failed
        .map(({ name, error }) => `- ${name}: ${error}`)
        .join('\n');

      messages.push({
        role: "assistant",
        content: failedSummary,
        codeBlock: true,
      });
    }

    // 최소한 하나의 메시지는 반환
    if (messages.length === 0) {
      messages.push({
        role: "assistant",
        content: "Swagger 문서 로딩 결과가 없습니다.",
        codeBlock: false,
      });
    }

    return messages;
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

// 모든 Swagger 파일 로드 처리
async function handleLoadAllSwaggers(): Promise<ChatMessage[]> {
  try {
    const results = await loadAllSwaggerData();

    if (results.loaded.length === 0) {
      return [
        {
          role: "assistant",
          content: "불러올 수 있는 저장된 Swagger 문서가 없습니다.",
          codeBlock: false,
        },
      ];
    }

    // 각 Swagger를 저장소에 추가
    results.loaded.forEach(({ name, data }) => {
      useSwaggerStore.getState().addSwagger(name, data);
    });

    // 마지막으로 로드된 Swagger를 현재 선택으로 설정
    if (results.loaded.length > 0) {
      useSwaggerStore.getState().setCurrent(results.loaded[0].data);
    }

    // 응답 메시지 생성
    const messages: ChatMessage[] = [
      {
        role: "assistant",
        content: `모든 Swagger 문서를 성공적으로 불러왔습니다. 총 ${results.loaded.length}개의 문서가 로드되었습니다.`,
        codeBlock: false,
      }
    ];

    if (results.loaded.length > 0) {
      const loadedSummary = results.loaded
        .map(({ name, data }) =>
          `- ${name}: ${data.title || "제목 없음"} (v${data.version || "버전 없음"}), ` +
          `API 사양: ${data.apiVersion || "정보 없음"}, ` +
          `${data.paths?.length || 0}개 엔드포인트`)
        .join('\n');

      messages.push({
        role: "assistant",
        content: loadedSummary,
        codeBlock: true,
      });
    }

    if (results.failed.length > 0) {
      messages.push({
        role: "assistant",
        content: `${results.failed.length}개의 Swagger 문서를 불러오는 데 실패했습니다.`,
        codeBlock: false,
      });

      const failedSummary = results.failed
        .map(({ name, error }) => `- ${name}: ${error}`)
        .join('\n');

      messages.push({
        role: "assistant",
        content: failedSummary,
        codeBlock: true,
      });
    }

    return messages;
  } catch (error) {
    return [
      {
        role: "assistant",
        content: `모든 Swagger 불러오기 중 오류가 발생했습니다: ${(error as Error).message}`,
        codeBlock: false,
      },
    ];
  }
}

// 현재 Swagger 전환 처리
async function handleUseSwagger(name: string): Promise<ChatMessage[]> {
  if (!name || name.trim() === '') {
    return [
      {
        role: "assistant",
        content: "사용할 Swagger 이름을 지정해주세요. 'swagger use <이름>' 형식으로 사용합니다.",
        codeBlock: false,
      },
    ];
  }

  const swaggerStore = useSwaggerStore.getState();
  const success = swaggerStore.setCurrentByName(name);

  if (success) {
    const current = swaggerStore.current;
    return [
      {
        role: "assistant",
        content: `'${name}' Swagger 문서로 전환되었습니다.`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: `API 제목: ${current?.title || "제목 없음"} (버전: ${current?.version || "버전 정보 없음"})
  API 사양: ${current?.apiVersion || "버전 정보 없음"}
  사용 가능한 엔드포인트 수: ${current?.paths?.length || 0}개`,
        codeBlock: false,
      },
    ];
  }else {
    return [
      {
        role: "assistant",
        content: `'${name}' 이름의 Swagger 문서가 로드되어 있지 않습니다.`,
        codeBlock: false,
      },
      {
        role: "assistant",
        content: "현재 로드된 문서 목록을 확인하려면 'swagger loaded'를 입력하세요.",
        codeBlock: false,
      },
    ];
  }
}

// 현재 로드된 Swagger 목록 조회
async function handleListLoadedSwaggers(): Promise<ChatMessage[]> {
  const swaggerStore = useSwaggerStore.getState();
  const loadedNames = swaggerStore.getAllLoadedNames();
  const currentData = swaggerStore.current;

  if (loadedNames.length === 0) {
    return [
      {
        role: "assistant",
        content: "현재 로드된 Swagger 문서가 없습니다.",
        codeBlock: false,
      },
    ];
  }

  let currentName = '없음';
  loadedNames.forEach(name => {
    if (swaggerStore.loadedSwaggers.get(name) === currentData) {
      currentName = name;
    }
  });

  return [
    {
      role: "assistant",
      content: `현재 로드된 Swagger 문서 (총 ${loadedNames.length}개):`,
      codeBlock: false,
    },
    {
      role: "assistant",
      content: loadedNames.map(name =>
        name === currentName
          ? `* ${name} (현재 선택됨)`
          : `- ${name}`
      ).join('\n'),
      codeBlock: true,
    },
    {
      role: "assistant",
      content: "다른 문서로 전환하려면 'swagger use <이름>'을 입력하세요.",
      codeBlock: false,
    },
  ];
}
