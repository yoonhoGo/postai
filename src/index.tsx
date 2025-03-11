import React from 'react';
import { render } from 'ink';
import App from './App.js';
import { initSwaggerStorage } from './services/utils/swagger-storage.util.js';

// 애플리케이션 초기화
async function initApp() {
  try {
    // Swagger 저장소 초기화
    // await initSwaggerStorage();

    // Ink 렌더링 설정
    const { waitUntilExit } = render(<App />);

    // 프로그램이 종료될 때까지 대기
    await waitUntilExit();
  } catch (error) {
    console.error("오류 발생:", error);
    process.exit(1);
  }
}

// 앱 실행
initApp();
