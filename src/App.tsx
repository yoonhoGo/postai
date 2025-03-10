import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import Divider from 'ink-divider';
import { apiRequestTool } from './request.tool.js';
import { swaggerTool } from './swagger-parser.tool.js';
import { Header } from './components/Header.js';
import { RequestPanel } from './components/RequestPanel.js';
import { ResponsePanel } from './components/ResponsePanel.js';
import { StatusBar } from './components/StatusBar.js';
import { model } from './model.js';
import { SwaggerData, SwaggerPath, RequestParams, ApiResponse } from './types.js';

// API Client 애플리케이션의 메인 컴포넌트
const App = () => {
  const [swaggerUrl, setSwaggerUrl] = useState<string>('');
  const [swaggerData, setSwaggerData] = useState<SwaggerData | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<SwaggerPath | null>(null);
  const [requestParams, setRequestParams] = useState<RequestParams>({});
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'swagger' | 'request' | 'response'>('swagger');
  const [focusedElement, setFocusedElement] = useState<string>('url-input');

  // Swagger 문서 불러오기
  const fetchSwagger = async (): Promise<void> => {
    if (isLoading || !swaggerUrl) return;

    setIsLoading(true);
    try {
      const result = await swaggerTool.func(swaggerUrl);
      setSwaggerData(JSON.parse(result));
      setActiveTab('request');
    } catch (error) {
      console.error('Swagger 로딩 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // API 요청 실행
  const executeRequest = async (): Promise<void> => {
    if (!selectedEndpoint || !swaggerData || isLoading) return;

    setIsLoading(true);
    try {
      const requestConfig = {
        url: `${swaggerData.baseUrl || ''}${selectedEndpoint.path}`,
        method: selectedEndpoint.method,
        headers: { 'Content-Type': 'application/json' },
        data: requestParams.body || null,
        params: requestParams.query || null
      };

      const result = await apiRequestTool.func(JSON.stringify(requestConfig));
      setResponse(JSON.parse(result));
      setActiveTab('response');
    } catch (error) {
      console.error('API 요청 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 키보드 입력 처리
  useInput((input, key) => {
    // 탭 전환
    if (key.tab) {
      if (activeTab === 'swagger') {
        if (swaggerData) setActiveTab('request');
      } else if (activeTab === 'request') {
        if (response) setActiveTab('response');
      } else if (activeTab === 'response') {
        setActiveTab('swagger');
      }
    }

    // 포커스 요소 처리
    if (activeTab === 'swagger') {
      if (key.return && focusedElement === 'load-button') {
        fetchSwagger();
      }

      if (input === 'l') {
        fetchSwagger();
      }

      if (key.downArrow) {
        setFocusedElement('load-button');
      } else if (key.upArrow) {
        setFocusedElement('url-input');
      }
    }

    // 요청 탭에서 실행 버튼
    if (activeTab === 'request' && input === 'e') {
      executeRequest();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Header />

      {/* 탭 네비게이션 */}
      <Box marginY={1}>
        <Box marginRight={2}>
          <Text
            backgroundColor={activeTab === 'swagger' ? 'blue' : undefined}
            color={activeTab === 'swagger' ? 'white' : 'gray'}
            bold
          >
            {' 1. Swagger 로딩 '}
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text
            backgroundColor={activeTab === 'request' ? 'blue' : undefined}
            color={activeTab === 'request' ? 'white' : 'gray'}
            bold
          >
            {' 2. 요청 구성 '}
          </Text>
        </Box>
        <Box>
          <Text
            backgroundColor={activeTab === 'response' ? 'blue' : undefined}
            color={activeTab === 'response' ? 'white' : 'gray'}
            bold
          >
            {' 3. 응답 확인 '}
          </Text>
        </Box>
      </Box>

      <Divider title="API Client" />

      {/* Swagger URL 입력 패널 */}
      {activeTab === 'swagger' && (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text bold>Swagger URL 입력:</Text>
          </Box>

          <Box marginBottom={1}>
            <TextInput
              value={swaggerUrl}
              onChange={setSwaggerUrl}
              placeholder="https://petstore.swagger.io/v2/swagger.json"
              showCursor={focusedElement === 'url-input'}
            />
          </Box>

          <Box>
            <Box
              borderStyle="round"
              borderColor={focusedElement === 'load-button' ? 'blue' : 'gray'}
              marginRight={1}
            >
              <Text
                bold
                color={focusedElement === 'load-button' ? 'blue' : 'gray'}
              >
                {' 로드 (L) '}
              </Text>
            </Box>

            {isLoading && (
              <Box>
                <Text>
                  <Spinner type="dots" />
                  <Text> 로딩 중...</Text>
                </Text>
              </Box>
            )}
          </Box>

          <Box marginTop={1}>
            <Text dimColor>※ 화살표키로 이동, Enter로 선택, L키를 눌러 로드</Text>
          </Box>
        </Box>
      )}

      {/* 요청 구성 패널 */}
      {activeTab === 'request' && swaggerData && (
        <RequestPanel
          swaggerData={swaggerData}
          selectedEndpoint={selectedEndpoint}
          setSelectedEndpoint={setSelectedEndpoint}
          requestParams={requestParams}
          setRequestParams={setRequestParams}
          executeRequest={executeRequest}
          isLoading={isLoading}
        />
      )}

      {/* 응답 확인 패널 */}
      {activeTab === 'response' && response && (
        <ResponsePanel response={response} />
      )}

      <StatusBar activeTab={activeTab} />
    </Box>
  );
};

export default App;
