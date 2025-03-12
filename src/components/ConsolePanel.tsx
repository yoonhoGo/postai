import { Box, Text, useStdout } from "ink";
import patchConsole from "patch-console";
import React, { useState } from "react";

export const ConsolePanel = () => {
  const { stdout } = useStdout();
  const [message, setMessage] = useState("");

  patchConsole((stream, data) => {
    setMessage(message + `\n[${stream}] ${data}`);
  });

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      <Text dimColor>
        Terminal dimensions:
        {message}
      </Text>

      <Box marginTop={1}>
        <Text>
          Width: <Text bold>{stdout.columns}</Text>
        </Text>
      </Box>
      <Box>
        <Text>
          Height: <Text bold>{stdout.rows}</Text>
        </Text>
      </Box>
    </Box>
  );
};
