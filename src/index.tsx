import React from 'react';
import { render } from 'ink';
import App from './App.js';

// 애플리케이션 초기화
async function initApp() {
  try {
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
