import dotenv from 'dotenv';
dotenv.config();

export interface AppConfig {
  sangeethaBaseUrl: string;
  mcpHost: string;
  mcpPort: number;
  agentCoreRuntimeHost: string;
  agentCoreRuntimePort: number;
  agentCoreArchitecture: 'linux/arm64';
  gatewayHost: string;
  gatewayPort: number;
  environment: string;
  logLevel: string;
  requestTimeoutMs: number;
  awsRegion: string;
  agentModelId: string;
  mcpTargetEndpoint: string;
  agentCoreRuntimeArn: string;
  agentCoreGatewayId: string;
  agentCoreGatewayTargetArn: string;
  agentCoreGatewayEndpoint: string;
  authType: 'AWS_SIGV4' | 'BEARER' | 'NONE';
  runtimeBearerToken?: string;
  gatewayApiKey: string;
  runtimeAuthToken: string;
}

export const config: AppConfig = {
  sangeethaBaseUrl: process.env.SANGEETHA_BASE_URL || 'https://www.sangeetha.com',
  mcpHost: process.env.MCP_HTTP_HOST || '0.0.0.0',
  mcpPort: parseInt(process.env.MCP_HTTP_PORT || '8000', 10),
  agentCoreRuntimeHost: process.env.AGENTCORE_RUNTIME_HOST || '0.0.0.0',
  agentCoreRuntimePort: parseInt(process.env.AGENTCORE_RUNTIME_PORT || '8080', 10),
  agentCoreArchitecture: 'linux/arm64',
  gatewayHost: process.env.GATEWAY_HOST || '0.0.0.0',
  gatewayPort: parseInt(process.env.GATEWAY_PORT || '8080', 10),
  environment: process.env.NODE_ENV || 'production',
  logLevel: process.env.LOG_LEVEL || 'info',
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '10000', 10),
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  agentModelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  mcpTargetEndpoint: process.env.MCP_TARGET_ENDPOINT || 'http://127.0.0.1:8000/mcp',
  agentCoreRuntimeArn: process.env.AGENTCORE_RUNTIME_ARN || 'arn:aws:bedrock:ap-south-1:123456789012:agentcore-runtime/sangeetha-specialist-a2a-v1',
  agentCoreGatewayId: process.env.AGENTCORE_GATEWAY_ID || 'gw-sangeetha-hyperlocal-01',
  agentCoreGatewayTargetArn: process.env.AGENTCORE_GATEWAY_TARGET_ARN || 'arn:aws:bedrock:ap-south-1:123456789012:agentcore-gateway-target/tgt-sangeetha-a2a-01',
  agentCoreGatewayEndpoint: process.env.AGENTCORE_GATEWAY_ENDPOINT || 'https://gw-sangeetha-hyperlocal-01.gateway.bedrock.ap-south-1.amazonaws.com',
  authType: (process.env.AGENTCORE_AUTH_TYPE as any) || 'BEARER',
  runtimeBearerToken: process.env.RUNTIME_AUTH_TOKEN || 'a2a-runtime-session-token',
  gatewayApiKey: process.env.GATEWAY_API_KEY || 'sangeetha-agentcore-key',
  runtimeAuthToken: process.env.RUNTIME_AUTH_TOKEN || 'a2a-runtime-session-token'
};
