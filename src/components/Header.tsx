import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

export const Header: React.FC = () => (
  <Box flexDirection="column" alignItems="center" marginBottom={1}>
    <Gradient name="rainbow">
      <BigText text="PostAI" font="simple" />
    </Gradient>
    <Text italic color="gray">HTTP API Client 강화된 by Ink & 인공지능</Text>
  </Box>
);
