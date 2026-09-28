import { A2AHandoffRequest, A2AHandoffResponse } from './a2a.types';

/**
 * Standard Agent-to-Agent (A2A) Protocol Specification
 * Compliant with open Agent-to-Agent specifications
 */

export interface A2AAgentSkill {
  id: string;
  name: string;
  description: string;
  parametersSchema?: Record<string, any>;
}

export interface A2AAgentCard {
  schemaVersion: string; // e.g. '1.0.0'
  id: string; // e.g. 'sangeetha.hyperlocal.commerce-agent.v1'
  name: string;
  description: string;
  provider: {
    name: string;
    domain: string;
    supportContact?: string;
  };
  endpoint: string; // e.g. 'http://127.0.0.1:8001/v1/tasks/send'
  protocol: 'a2a/v1.0';
  transport: 'http/json' | 'streamable-http';
  authentication: {
    type: 'bearer' | 'api-key' | 'none';
    headerKey?: string;
  };
  capabilities: {
    streaming: boolean;
    asyncExecution: boolean;
    supportedMimeTypes: string[];
  };
  skills: A2AAgentSkill[];
  metadata?: Record<string, any>;
}

export interface A2ATaskEnvelope<T = any> {
  taskId: string;
  sessionId?: string;
  sourceAgentId: string;
  targetAgentId: string;
  createdAt: string;
  operation: 'tasks/send' | 'tasks/cancel' | 'tasks/status';
  contentType: 'application/json';
  payload: T;
  metadata?: {
    traceId?: string;
    correlationId?: string;
    clientPlatform?: string;
  };
}

export interface A2ATaskResultEnvelope<T = any> {
  taskId: string;
  status: 'COMPLETED' | 'FAILED' | 'REJECTED' | 'IN_PROGRESS';
  completedAt: string;
  contentType: 'application/json';
  payload: T;
  executionMetrics: {
    durationMs: number;
    toolsInvoked: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
