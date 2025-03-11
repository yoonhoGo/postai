import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { SwaggerData } from "../../types.js";

// 애플리케이션 데이터 디렉토리 설정
const APP_DIR = path.join(os.homedir(), ".postai");
const SWAGGER_DIR = path.join(APP_DIR, "swagger");

// 디렉토리 확인 및 생성 함수
async function ensureDirectoryExists(directory: string): Promise<void> {
  try {
    await fs.access(directory);
  } catch (error) {
    // 디렉토리가 존재하지 않으면 생성
    await fs.mkdir(directory, { recursive: true });
    console.log(`디렉토리 생성됨: ${directory}`);
  }
}

// 디렉토리 초기화 - 앱 시작 시 호출
export async function initSwaggerStorage(): Promise<void> {
  try {
    await ensureDirectoryExists(APP_DIR);
    await ensureDirectoryExists(SWAGGER_DIR);
    console.log("Swagger 저장소가 초기화되었습니다.");
  } catch (error) {
    console.error("저장소 초기화 오류:", error);
    throw new Error("Swagger 저장소를 초기화할 수 없습니다.");
  }
}

// Swagger 데이터 저장
export async function saveSwaggerData(
  name: string,
  data: SwaggerData,
): Promise<void> {
  try {
    // 저장 전에 디렉토리 존재 확인
    await ensureDirectoryExists(SWAGGER_DIR);

    const filePath = path.join(SWAGGER_DIR, `${sanitizeFilename(name)}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Swagger 데이터 저장 오류:", error);
    throw new Error(
      `Swagger 데이터를 저장할 수 없습니다: ${(error as Error).message}`,
    );
  }
}

// Swagger 데이터 불러오기
export async function loadSwaggerData(name: string): Promise<SwaggerData> {
  try {
    const filePath = path.join(SWAGGER_DIR, `${sanitizeFilename(name)}.json`);
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as SwaggerData;
  } catch (error) {
    console.error("Swagger 데이터 로드 오류:", error);
    throw new Error(
      `Swagger 데이터를 불러올 수 없습니다: ${(error as Error).message}`,
    );
  }
}

// 저장된 Swagger 목록 가져오기
export async function listSavedSwaggerFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(SWAGGER_DIR);

    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(".json", ""));
  } catch (error) {
    console.error("Swagger 목록 조회 오류:", error);
    throw new Error(
      `저장된 Swagger 목록을 조회할 수 없습니다: ${(error as Error).message}`,
    );
  }
}

// 파일명 안전하게 처리
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9가-힣_-]/gi, "_").toLowerCase();
}

// 단일 Swagger 파일 삭제
export async function deleteSwaggerFile(name: string): Promise<void> {
  try {
    const filePath = path.join(SWAGGER_DIR, `${sanitizeFilename(name)}.json`);

    // 파일 존재 여부 확인
    await fs.access(filePath);

    // 파일 삭제
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`'${name}' 이름의 Swagger 파일을 찾을 수 없습니다.`);
    }
    console.error("Swagger 파일 삭제 오류:", error);
    throw new Error(
      `Swagger 파일을 삭제할 수 없습니다: ${(error as Error).message}`,
    );
  }
}

// 모든 Swagger 파일 삭제
export async function deleteAllSwaggerFiles(): Promise<number> {
  try {
    // 디렉토리가 존재하는지 확인
    await ensureDirectoryExists(SWAGGER_DIR);

    // 모든 파일 목록 가져오기
    const files = await fs.readdir(SWAGGER_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    // 각 파일 삭제
    const deletePromises = jsonFiles.map((file) =>
      fs.unlink(path.join(SWAGGER_DIR, file)),
    );

    await Promise.all(deletePromises);
    return jsonFiles.length;
  } catch (error) {
    console.error("모든 Swagger 파일 삭제 오류:", error);
    throw new Error(
      `Swagger 파일을 삭제할 수 없습니다: ${(error as Error).message}`,
    );
  }
}

export async function loadMultipleSwaggerData(names: string[]): Promise<{
  loaded: { name: string; data: SwaggerData }[];
  failed: { name: string; error: string }[];
}> {
  const results = {
    loaded: [] as { name: string; data: SwaggerData }[],
    failed: [] as { name: string; error: string }[],
  };

  for (const name of names) {
    try {
      const data = await loadSwaggerData(name);
      results.loaded.push({ name, data });
    } catch (error) {
      results.failed.push({
        name,
        error: (error as Error).message,
      });
    }
  }

  return results;
}

// 모든 Swagger 데이터 불러오기
export async function loadAllSwaggerData(): Promise<{
  loaded: { name: string; data: SwaggerData }[];
  failed: { name: string; error: string }[];
}> {
  try {
    const files = await listSavedSwaggerFiles();

    return await loadMultipleSwaggerData(files);
  } catch (error) {
    throw new Error(
      `모든 Swagger 데이터를 불러올 수 없습니다: ${(error as Error).message}`,
    );
  }
}
