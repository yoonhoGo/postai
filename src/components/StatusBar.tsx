import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  activeTab: 'swagger' | 'request' | 'response';
}

export const StatusBar: React.FC<StatusBarProps> = ({ activeTab }) => {
  // 현재 탭에 따라 다른 키보드 단축키 표시
  const getShortcutText = (): string => {
    switch (activeTab) {
      case 'swagger':
        return '[↑/↓] 이동  [Enter] 선택  [L] 로드  [Tab] 다음 탭';
      case 'request':
        return '[↑/↓] 이동  [B] 돌아가기  [E] 요청 실행  [Tab] 다음 탭';
      case 'response':
        return '[1/2/3] 뷰 전환  [Tab] 다음 탭';
      default:
        return '[Ctrl+C] 종료';
    }
  };

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      marginTop={1}
      justifyContent="space-between"
    >
      <Text dimColor>{getShortcutText()}</Text>
      <Text dimColor>PostAI CLI v1.0</Text>
    </Box>
  );
};
