import React from 'react';
import { Box, Text } from 'ink';

interface StatusBarProps {
  isProcessing: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ isProcessing }) => {
  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      marginTop={1}
      justifyContent="space-between"
    >
      <Text dimColor>
        {isProcessing ?
          "[처리 중...]" :
          "[↑/↓] 명령 히스토리  [PgUp/PgDn] 스크롤  [Ctrl+C] 종료"}
      </Text>
      <Text dimColor>POSTAI v1.0</Text>
    </Box>
  );
};
