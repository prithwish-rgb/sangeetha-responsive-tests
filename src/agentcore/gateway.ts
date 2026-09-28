import http from 'http';
import { config } from '../config/env';

export interface GatewayInvocationLog {
  requestId: string;
  timestamp: string;
  method: string;
  targetEndpoint: string;
  inboundAuthValid: boolean;
  outboundAuthAttached: boolean;
  latencyMs: number;
  status: number;
  toolName?: string;
}

/**
 * Amazon Bedrock AgentCore Gateway for Sangeetha Mobiles
 * Connects Bedrock Agents to the Sangeetha MCP Runtime target over Streamable HTTP
 */
export class BedrockAgentCoreGateway {
  private server: http.Server | null = null;
  private mcpTargetUrl: string;
  private apiKey: string;
  private runtimeToken: string;

  constructor(
    mcpTargetUrl = config.mcpTargetEndpoint,
    apiKey = config.gatewayApiKey,
    runtimeToken = config.runtimeAuthToken
  ) {
    this.mcpTargetUrl = mcpTargetUrl;
    this.apiKey = apiKey;
    this.runtimeToken = runtimeToken;
  }

  /**
   * Forward a JSON-RPC request to the MCP Runtime Target with secure outbound authorization
   */
  public async forwardToMcpTarget(rpcPayload: any, requestId: string): Promise<{ status: number; body: any; latencyMs: number }> {
    const start = Date.now();

    const response = await fetch(this.mcpTargetUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'authorization': `Bearer ${this.runtimeToken}`,
        'x-amzn-bedrock-agent-request-id': requestId,
        'x-amzn-trace-id': `Root=1-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        'user-agent': 'Amazon-Bedrock-AgentCore-Gateway/1.0'
      },
      body: JSON.stringify(rpcPayload)
    });

    const latencyMs = Date.now() - start;
    const body = await response.json();

    return {
      status: response.status,
      body,
      latencyMs
    };
  }

  /**
   * Start AgentCore Gateway HTTP Server
   */
  public start(port = config.gatewayPort, host = config.gatewayHost): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        const requestId = (req.headers['x-amzn-bedrock-agent-request-id'] ||
          req.headers['x-request-id'] ||
          `gw-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`) as string;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-Amzn-Bedrock-Agent-Session-Id');
        res.setHeader('X-Amzn-Bedrock-Agent-Request-Id', requestId);

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = req.url || '/';

        // 1. Gateway Health Check Endpoint
        if (req.method === 'GET' && (url === '/health' || url === '/')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'AVAILABLE',
            gatewayId: 'gw-sangeetha-hyperlocal-prod',
            gatewayArn: `arn:aws:bedrock:${config.awsRegion}:123456789012:agent-gateway/gw-sangeetha-hyperlocal`,
            mcpTarget: this.mcpTargetUrl,
            protocol: 'streamable-http-mcp',
            inboundAuth: 'API_KEY_OR_BEARER',
            outboundAuth: 'IAM_OR_BEARER',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // 2. Validate Inbound Authorization
        const authHeader = req.headers['authorization'] || '';
        const apiKeyHeader = req.headers['x-api-key'] || '';
        const isAuthorized = authHeader.includes(this.apiKey) ||
          apiKeyHeader === this.apiKey ||
          authHeader.includes('Bearer');

        if (!isAuthorized) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Unauthorized: Invalid AgentCore Gateway Authorization Credential',
            requestId
          }));
          return;
        }

        // 3. Direct Tools Discovery via Gateway
        if (req.method === 'GET' && (url === '/v1/gateway/tools' || url === '/tools')) {
          try {
            const listRpc = { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} };
            const { body, latencyMs } = await this.forwardToMcpTarget(listRpc, requestId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              gateway: 'gw-sangeetha-hyperlocal-prod',
              latencyMs,
              tools: body.result?.tools || []
            }, null, 2));
          } catch (err: any) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Gateway target error: ${err.message}` }));
          }
          return;
        }

        // 4. MCP JSON-RPC Gateway Route (Streamable HTTP)
        if (req.method === 'POST' && (url === '/v1/gateway/mcp' || url === '/mcp' || url === '/rpc')) {
          let reqBody = '';
          req.on('data', chunk => { reqBody += chunk; });
          req.on('end', async () => {
            try {
              const rpcJson = JSON.parse(reqBody);
              const toolName = rpcJson.params?.name;

              console.log(`\n------------------------------------------------------`);
              console.log(`[AgentCore Gateway] Incoming Forward Request [${requestId}]`);
              console.log(`  ▶ Method:          ${rpcJson.method} ${toolName ? `(${toolName})` : ''}`);
              console.log(`  ▶ MCP Target:      ${this.mcpTargetUrl}`);

              const { status, body, latencyMs } = await this.forwardToMcpTarget(rpcJson, requestId);

              console.log(`  ▶ Target Latency:  ${latencyMs}ms`);
              console.log(`  ▶ Target Status:   ${status}`);
              console.log(`------------------------------------------------------\n`);

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Transfer-Encoding': 'chunked',
                'X-Content-Type-Options': 'nosniff'
              });
              res.write(JSON.stringify(body));
              res.end();
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32603, message: `Gateway Target Error: ${err.message}` }
              }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Route ${url} not found on AgentCore Gateway` }));
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, host, () => {
        console.log(`[AgentCore Gateway] Streamable HTTP Gateway listening on http://${host}:${port}/v1/gateway/mcp`);
        console.log(`[AgentCore Gateway] MCP Target routed to: ${this.mcpTargetUrl}`);
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('[AgentCore Gateway] Stopped gracefully.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// CLI entrypoint
if (require.main === module) {
  const gateway = new BedrockAgentCoreGateway();
  gateway.start().catch(console.error);
}
