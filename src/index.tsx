import React from 'react';
import { render } from 'ink';
import App from './App.js';

// Ink 렌더링 설정
const { waitUntilExit } = render(<App />);

// 프로그램이 종료될 때까지 대기
waitUntilExit().catch(error => {
  console.error("오류 발생:", error);
});
