export interface SwaggerPath {
  path: string;
  method: string;
  summary?: string;
  parameters?: SwaggerParameter[];
  requestBody?: any;
}

export interface SwaggerParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
  schema?: any;
}

export interface SwaggerData {
  title: string;
  version: string;
  description?: string;
  baseUrl?: string;
  paths: SwaggerPath[];
}

export interface RequestParams {
  body?: Record<string, any>;
  query?: Record<string, any>;
  path?: Record<string, any>;
  header?: Record<string, any>;
  [key: string]: any;
}

export interface ApiRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  data?: any;
  params?: any;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
}

export interface RequestPanelProps {
  swaggerData: SwaggerData;
  selectedEndpoint: SwaggerPath | null;
  setSelectedEndpoint: (endpoint: SwaggerPath | null) => void;
  requestParams: RequestParams;
  setRequestParams: (
    params: RequestParams | ((prev: RequestParams) => RequestParams),
  ) => void;
  executeRequest: () => Promise<void>;
  isLoading: boolean;
}
