/**
 * Official A2A (Agent-to-Agent) Protocol v1.0 Types
 * 
 * Standard specification based on JSON-RPC 2.0 transport with
 * Agent Card discovery at /.well-known/agent-card.json and canonical POST / message handler.
 */

import { A2AHandoffRequest, A2AHandoffResponse } from './a2a.types.js';

export interface A2ASkillDeclaration {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  inputSchema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: 'object';
    properties: Record<string, any>;
  };
}

export interface A2AInterfaceBinding {
  protocol: 'JSON_RPC_2_0' | 'HTTP_REST' | 'GRPC';
  protocolVersion: '1.0' | '1.0.0';
  url: string;
}

export interface A2AAuthenticationSchema {
  type: 'AWS_SIGV4' | 'OAUTH2' | 'BEARER' | 'NONE';
  serviceName?: string;
  region?: string;
  tokenUrl?: string;
  scopes?: string[];
}

export interface A2Av1AgentCard {
  specVersion: '1.0' | '1.0.0';
  agentId: string;
  name: string;
  description: string;
  version: string;
  architecture?: 'linux/arm64' | 'linux/amd64';
  provider: {
    name: string;
    organization: string;
    website?: string;
  };
  supportedInterfaces: A2AInterfaceBinding[];
  authentication: A2AAuthenticationSchema;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    skills: A2ASkillDeclaration[];
  };
  runtimeMetadata?: {
    runtimePlatform: 'Amazon Bedrock AgentCore Runtime';
    containerPort: number;
    healthEndpoint: string;
    targetArn?: string;
  };
}

export type A2APartType = 'text' | 'data' | 'artifact' | 'file';

export interface A2AMessagePart {
  type: A2APartType;
  mimeType?: string;
  text?: string;
  data?: Record<string, any> | A2AHandoffRequest | A2AHandoffResponse;
  artifactId?: string;
}

export interface A2AMessage {
  messageId: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  parts: A2AMessagePart[];
  timestamp: string;
}

export interface A2ATaskContext {
  sessionId?: string;
  taskId: string;
  correlationId?: string;
  senderAgentId: string;
  recipientAgentId: string;
}

export interface A2Av1JsonRpcRequest<TParams = any> {
  jsonrpc: '2.0';
  id: string | number;
  method: 'message/send' | 'tasks/create' | 'tasks/status' | string;
  params: {
    message: A2AMessage;
    context?: A2ATaskContext;
    [key: string]: any;
  };
}

export interface A2Av1JsonRpcResponse<TResult = any> {
  jsonrpc: '2.0';
  id: string | number;
  result?: {
    status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
    message: A2AMessage;
    artifacts?: any[];
    executionMetrics?: {
      durationMs: number;
      toolsInvoked: string[];
    };
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
