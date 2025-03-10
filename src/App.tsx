import { Box, Text, useInput } from "ink";
import Divider from "ink-divider";
import Spinner from "ink-spinner";
import TextInput from "ink-text-input";
import React, { useState } from "react";
import { ConsolePanel } from "./components/ConsolePanel.js";
import { Header } from "./components/Header.js";
import { RequestPanel } from "./components/RequestPanel.js";
import { ResponsePanel } from "./components/ResponsePanel.js";
import { StatusBar } from "./components/StatusBar.js";
import { apiRequestTool } from "./request.tool.js";
import { swaggerTool } from "./swagger-parser.tool.js";
import {
  ApiRequest,
  ApiResponse,
  RequestParams,
  SwaggerData,
  SwaggerPath,
} from "./types.js";

// API Client 애플리케이션의 메인 컴포넌트
const App = () => {
  const [swaggerUrl, setSwaggerUrl] = useState<string>("");
  const [swaggerData, setSwaggerData] = useState<SwaggerData | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<SwaggerPath | null>(
    null,
  );
  const [requestParams, setRequestParams] = useState<RequestParams>({});
  const [request, setRequest] = useState<ApiRequest | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "swagger" | "request" | "response"
  >("swagger");
  const [focusedElement, setFocusedElement] = useState<string>("url-input");

  // Swagger 문서 불러오기
  const fetchSwagger = async (): Promise<void> => {
    if (isLoading || !swaggerUrl) return;

    setIsLoading(true);
    try {
      const result = await swaggerTool.func(swaggerUrl);
      setSwaggerData(JSON.parse(result));
      setActiveTab("request");
    } catch (error) {
      console.error("Swagger 로딩 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // API 요청 실행
  const executeRequest = async (): Promise<void> => {
    if (!selectedEndpoint || !swaggerData || isLoading) return;

    setIsLoading(true);
    try {
      // path 파라미터 치환 로직 추가
      let pathWithParams = selectedEndpoint.path;

      // path 파라미터가 있는 경우 처리
      if (requestParams.path && selectedEndpoint.parameters) {
        // path 타입의 파라미터들을 찾아서 치환
        selectedEndpoint.parameters.forEach((param) => {
          if (
            param.in === "path" &&
            requestParams.path &&
            requestParams.path[param.name]
          ) {
            const paramValue = requestParams.path[param.name];
            pathWithParams = pathWithParams.replace(
              `{${param.name}}`,
              paramValue,
            );
          }
        });
      }

      const requestConfig: ApiRequest = {
        url: `${swaggerData.baseUrl || ""}${pathWithParams}`,
        method: selectedEndpoint.method,
        headers: { "Content-Type": "application/json" },
        data: requestParams.body || null,
        params: requestParams.query || null,
      };

      setRequest(requestConfig);
      const result = await apiRequestTool.func(JSON.stringify(requestConfig));
      setResponse(JSON.parse(result));
      setActiveTab("response");
    } catch (error) {
      console.error("API 요청 오류:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 키보드 입력 처리
  useInput((input, key) => {
    // 탭 전환
    if (key.tab) {
      if (activeTab === "swagger") {
        if (swaggerData) setActiveTab("request");
      } else if (activeTab === "request") {
        if (response) setActiveTab("response");
      } else if (activeTab === "response") {
        setActiveTab("swagger");
      }
    }

    // 포커스 요소 처리
    if (activeTab === "swagger") {
      if (key.return && focusedElement === "load-button") {
        fetchSwagger();
      }

      if (input === "l") {
        fetchSwagger();
      }

      if (key.downArrow) {
        setFocusedElement("load-button");
      } else if (key.upArrow) {
        setFocusedElement("url-input");
      }
    }

    // 요청 탭에서 실행 버튼
    if (activeTab === "request" && input === "e") {
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
            backgroundColor={activeTab === "swagger" ? "blue" : undefined}
            color={activeTab === "swagger" ? "white" : "gray"}
            bold
          >
            {" 1. Swagger 로딩 "}
          </Text>
        </Box>
        <Box marginRight={2}>
          <Text
            backgroundColor={activeTab === "request" ? "blue" : undefined}
            color={activeTab === "request" ? "white" : "gray"}
            bold
          >
            {" 2. 요청 구성 "}
          </Text>
        </Box>
        <Box>
          <Text
            backgroundColor={activeTab === "response" ? "blue" : undefined}
            color={activeTab === "response" ? "white" : "gray"}
            bold
          >
            {" 3. 응답 확인 "}
          </Text>
        </Box>
      </Box>

      <Divider title="API Client" />

      {/* Swagger URL 입력 패널 */}
      {activeTab === "swagger" && (
        <Box flexDirection="column" padding={1}>
          <Box marginBottom={1}>
            <Text bold>Swagger URL 입력:</Text>
          </Box>

          <Box marginBottom={1}>
            <TextInput
              value={swaggerUrl}
              onChange={setSwaggerUrl}
              placeholder="https://petstore.swagger.io/v2/swagger.json"
              showCursor={focusedElement === "url-input"}
            />
          </Box>

          <Box>
            <Box
              borderStyle="round"
              borderColor={focusedElement === "load-button" ? "blue" : "gray"}
              marginRight={1}
            >
              <Text
                bold
                color={focusedElement === "load-button" ? "blue" : "gray"}
              >
                {" 로드 (L) "}
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
            <Text dimColor>
              ※ 화살표키로 이동, Enter로 선택, L키를 눌러 로드
            </Text>
          </Box>
        </Box>
      )}

      {/* 요청 구성 패널 */}
      {activeTab === "request" && swaggerData && (
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
      {activeTab === "response" && response && (
        <ResponsePanel response={response} />
      )}

      <StatusBar activeTab={activeTab} />

      <ConsolePanel />
    </Box>
  );
};

export default App;
