import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { SwaggerData } from "../../types.js";

// 애플리케이션 데이터 디렉토리 생성
const APP_DIR = path.join(os.homedir(), ".postai");
const SWAGGER_DIR = path.join(APP_DIR, "swagger");

// 디렉토리 초기화 - 앱 시작 시 호출
export async function initSwaggerStorage(): Promise<void> {
  try {
    await fs.mkdir(APP_DIR, { recursive: true });
    await fs.mkdir(SWAGGER_DIR, { recursive: true });
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
