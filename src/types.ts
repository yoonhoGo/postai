export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  codeBlock?: boolean;
  codeLanguage?: string;
}

export interface SwaggerPath {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
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
