import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { RequestPanelProps, SwaggerParameter, SwaggerPath } from '../types.js';

export const RequestPanel: React.FC<RequestPanelProps> = ({
  swaggerData,
  selectedEndpoint,
  setSelectedEndpoint,
  requestParams,
  setRequestParams,
  executeRequest,
  isLoading
}) => {
  const [focusedParam, setFocusedParam] = useState<number>(-1);
  const [isExecuteButtonFocused, setIsExecuteButtonFocused] = useState<boolean>(false);

  // 엔드포인트 선택 옵션 생성
  const endpointItems = swaggerData.paths.map((path: SwaggerPath, index: number) => ({
    label: `${path.method} ${path.path} - ${path.summary || '설명 없음'}`,
    value: path,
    key: index.toString()
  }));

  // 파라미터 업데이트 함수
  const updateParameter = (type: string, name: string, value: string): void => {
    setRequestParams((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || {}),
        [name]: value
      }
    }));
  };

  // 키보드 입력 처리
  useInput((input, key) => {
    if (!selectedEndpoint) return;

    // 'b' 키를 누르면 엔드포인트 선택 취소
    if (input === 'b') {
      setSelectedEndpoint(null);
      return;
    }

    const params = selectedEndpoint.parameters || [];

    // 화살표 키로 파라미터 내비게이션
    if (key.downArrow) {
      if (focusedParam < params.length - 1) {
        setFocusedParam(focusedParam + 1);
        setIsExecuteButtonFocused(false);
      } else {
        setIsExecuteButtonFocused(true);
      }
    } else if (key.upArrow) {
      if (isExecuteButtonFocused) {
        setIsExecuteButtonFocused(false);
        setFocusedParam(params.length - 1);
      } else if (focusedParam > 0) {
        setFocusedParam(focusedParam - 1);
      }
    }

    // 'e' 키 또는 엔터 키를 누르면 요청 실행
    if ((input === 'e' || (key.return && isExecuteButtonFocused)) && !isLoading) {
      executeRequest();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* 엔드포인트 선택 */}
      {!selectedEndpoint ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>API 엔드포인트 선택:</Text>
          <Box height={15}>
            <SelectInput
              items={endpointItems}
              onSelect={(item: { value: SwaggerPath }) => setSelectedEndpoint(item.value)}
            />
          </Box>
        </Box>
      ) : (
        <>
          {/* 선택된 엔드포인트 정보 */}
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>
              <Text color="green">{selectedEndpoint.method}</Text>
              <Text> {selectedEndpoint.path}</Text>
            </Text>
            <Text dimColor>{selectedEndpoint.summary || '설명 없음'}</Text>
            <Box marginTop={1}>
              <Box
                borderStyle="round"
                borderColor="gray"
                marginRight={1}
              >
                <Text color="gray">{' 돌아가기 (B) '}</Text>
              </Box>
            </Box>
          </Box>

          {/* 파라미터 입력 */}
          <Box flexDirection="column" marginBottom={1} borderStyle="round" padding={1}>
            <Text bold underline>파라미터 입력:</Text>

            {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 ? (
              selectedEndpoint.parameters.map((param: SwaggerParameter, index: number) => (
                <Box key={index} flexDirection="column" marginY={1}>
                  <Text>
                    <Text bold>{param.name}</Text>
                    <Text dimColor> ({param.in || 'query'}) </Text>
                    {param.required && <Text color="red">*필수</Text>}
                    {focusedParam === index && <Text color="blue"> [활성]</Text>}
                  </Text>
                  <Box marginTop={1}>
                    <TextInput
                      value={(requestParams[param.in] && requestParams[param.in][param.name]) || ''}
                      onChange={(value: string) => updateParameter(param.in, param.name, value)}
                      placeholder={param.description || `${param.name} 값 입력`}
                      showCursor={focusedParam === index}
                    />
                  </Box>
                </Box>
              ))
            ) : (
              <Text italic dimColor>파라미터가 없습니다</Text>
            )}

            {/* 요청 실행 버튼 */}
            <Box marginTop={1}>
              <Box
                borderStyle="round"
                borderColor={isExecuteButtonFocused ? "green" : (isLoading ? "gray" : "blue")}
                marginRight={1}
              >
                <Text
                  bold
                  color={isExecuteButtonFocused ? "green" : (isLoading ? "gray" : "blue")}
                >
                  {' 요청 실행 (E) '}
                </Text>
              </Box>

              {isLoading && (
                <Box>
                  <Text>
                    <Spinner type="dots" />
                    <Text> 요청 중...</Text>
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
};
