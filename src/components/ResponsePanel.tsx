import { Box, Text, useInput } from "ink";
import SyntaxHighlight from "ink-syntax-highlight";
import React, { useState } from "react";
import { ApiRequest, ApiResponse } from "../types.js";

interface ResponsePanelProps {
  response: ApiResponse;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
}) => {
  const [view, setView] = useState<"preview" | "headers" | "raw">("preview");

  // 응답 미리보기 최대 길이
  const MAX_PREVIEW_LENGTH = 500;

  // 상태 코드에 따른 색상 결정
  const getStatusColor = (status: number): string => {
    if (status < 300) return "green";
    if (status < 400) return "yellow";
    return "red";
  };

  // 키보드 입력 처리
  useInput((input) => {
    if (input === "1") {
      setView("preview");
    } else if (input === "2") {
      setView("headers");
    } else if (input === "3") {
      setView("raw");
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* 응답 상태 정보 */}
      <Box marginBottom={1}>
        <Box borderStyle="round" borderColor={getStatusColor(response.status)}>
          <Text bold color={getStatusColor(response.status)}>
            {` ${response.status} ${response.statusText} `}
          </Text>
        </Box>
      </Box>

      {/* 뷰 전환 탭 */}
      <Box marginBottom={1}>
        <Box marginRight={2}>
          <Text
            backgroundColor={view === "preview" ? "blue" : undefined}
            color={view === "preview" ? "white" : "gray"}
            bold
          >
            {" 미리보기 (1) "}
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text
            backgroundColor={view === "headers" ? "blue" : undefined}
            color={view === "headers" ? "white" : "gray"}
            bold
          >
            {" 헤더 (2) "}
          </Text>
        </Box>
        <Box>
          <Text
            backgroundColor={view === "raw" ? "blue" : undefined}
            color={view === "raw" ? "white" : "gray"}
            bold
          >
            {" 원본 (3) "}
          </Text>
        </Box>
      </Box>

      {/* 응답 내용 */}
      <Box flexDirection="column" borderStyle="round" padding={1} height={20}>
        {view === "preview" && (
          <SyntaxHighlight
            language="json"
            code={JSON.stringify(response.data ?? "", null, 2).substring(
              0,
              MAX_PREVIEW_LENGTH,
            )}
          />
        )}

        {view === "headers" && (
          <>
            <Text bold underline>
              응답 헤더:
            </Text>
            {Object.entries(response.headers ?? {}).map(([key, value]) => (
              <Text key={key}>
                <Text bold>{key}:</Text> {String(value)}
              </Text>
            ))}
          </>
        )}

        {view === "raw" && (
          <SyntaxHighlight
            language="json"
            code={JSON.stringify(response, null, 2)}
          />
        )}
      </Box>
    </Box>
  );
};
