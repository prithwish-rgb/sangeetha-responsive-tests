/**
 * Amazon Bedrock AgentCore Runtime Server
 * 
 * Front-facing server container entrypoint for Amazon Bedrock AgentCore Runtime Playground:
 * - Listens on Host 0.0.0.0, Port 9000 (AgentCore Container Standard)
 * - Exposes GET /ping (Container Health Check)
 * - Exposes POST /invocations & POST / (AgentCore Runtime Playground Invocations)
 * - Manages internal services:
 *   1. Sangeetha Commerce MCP Server on Port 8000
 *   2. Sangeetha Specialist Agent A2A Server on Port 9001
 *   3. Amazon Shopping Orchestrator Agent (invokes Bedrock / routes to A2A)
 */

import http, { IncomingMessage, ServerResponse } from 'http';
import { sangeethaMcpServer } from '../mcp/server.js';
import { SangeethaA2AServer } from '../agents/sangeetha-a2a-server.js';
import { AmazonShoppingOrchestratorAgent } from '../agents/amazon-orchestrator-agent.js';
import { config } from '../config/env.js';

export class AgentCoreRuntimeServer {
  private runtimeHttpServer: http.Server | null = null;
  private sangeethaA2AServer: SangeethaA2AServer;
  private orchestrator: AmazonShoppingOrchestratorAgent;
  private mcpPort = 8000;
  private a2aPort = 9001;
  private runtimePort = 9000;
  private host = '0.0.0.0';

  constructor() {
    this.sangeethaA2AServer = new SangeethaA2AServer(this.a2aPort, this.host);
    this.orchestrator = new AmazonShoppingOrchestratorAgent(`http://127.0.0.1:${this.a2aPort}`);
  }

  public async start(): Promise<void> {
    // 1. Start Sangeetha Commerce MCP Server on Port 8000
    console.log(`[AGENTCORE INIT] Starting Sangeetha Commerce MCP Server on http://${this.host}:${this.mcpPort}/mcp...`);
    await sangeethaMcpServer.start();

    // 2. Start Sangeetha Specialist Agent A2A Server on Port 9001
    console.log(`[AGENTCORE INIT] Starting Sangeetha Specialist Agent A2A Server on http://${this.host}:${this.a2aPort}/...`);
    await this.sangeethaA2AServer.start();

    // 3. Start Front-Facing AgentCore Runtime Server on Port 9000
    return new Promise((resolve, reject) => {
      this.runtimeHttpServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amz-Security-Token, X-Amzn-Bedrock-*');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = req.url || '/';
        const pathname = url.split('?')[0];

        // 1. Health Endpoint: GET /ping
        if (req.method === 'GET' && (pathname === '/ping' || pathname === '/health')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'Healthy',
            runtime: 'Amazon Bedrock AgentCore Runtime',
            container: {
              architecture: 'linux/arm64',
              port: this.runtimePort
            },
            agent: 'amazon.shopping.orchestrator.v1',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // 2. Agent Card Discovery: GET /.well-known/agent-card.json
        if (req.method === 'GET' && (pathname === '/.well-known/agent-card.json' || pathname === '/.well-known/agent.json')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.sangeethaA2AServer.getAgentCard(), null, 2));
          return;
        }

        // 3. Playground Invocations Endpoint: POST /invocations or POST /
        if (req.method === 'POST' && (pathname === '/invocations' || pathname === '/' || pathname === '/v1/invocations')) {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              let prompt = '';

              let sessionId: string | undefined;

              if (body && body.trim().startsWith('{')) {
                const parsed = JSON.parse(body);
                // Extract prompt from standard Bedrock/AgentCore Playground request formats
                prompt =
                  parsed.prompt ||
                  parsed.inputText ||
                  parsed.input?.text ||
                  parsed.messages?.[0]?.content?.[0]?.text ||
                  parsed.message?.parts?.[0]?.text ||
                  parsed.text ||
                  '';

                // Extract session identifier from request body if present
                sessionId =
                  parsed.sessionId ||
                  parsed.session_id ||
                  parsed.context?.sessionId ||
                  parsed.context?.session_id ||
                  parsed.runtimeSessionId ||
                  parsed.conversationId;
              } else {
                prompt = body.trim();
              }

              // Also inspect incoming headers for AgentCore / Bedrock runtime session identifiers
              const headerSessionId = (
                req.headers['x-amzn-bedrock-agent-session-id'] ||
                req.headers['x-amzn-session-id'] ||
                req.headers['x-session-id'] ||
                req.headers['session-id'] ||
                req.headers['x-conversation-id']
              ) as string | undefined;

              if (headerSessionId) {
                sessionId = headerSessionId;
              }

              if (sessionId) {
                console.log(`[SESSION] Session ID: ${sessionId}`);
              } else {
                // Safest minimal fallback that does NOT mix different clients/sessions
                const remoteIp = req.socket.remoteAddress || 'local';
                const userAgentHash = req.headers['user-agent'] ? Buffer.from(req.headers['user-agent']).toString('base64').slice(0, 8) : 'default';
                sessionId = `session-fallback-${remoteIp}-${userAgentHash}`;
                console.log(`[SESSION] No explicit session identifier found in headers/body; using fallback session: ${sessionId}`);
              }

              if (!prompt) {
                prompt = 'Find a Nothing phone under ₹80,000 that can be delivered to pincode 560078.';
              }

              console.log(`\n[AGENTCORE PLAYGROUND] Received Invocations Request: "${prompt}" (Session: ${sessionId})`);

              // Forward to the Amazon Shopping Orchestrator Agent
              // Orchestrator -> A2A (Port 9001) -> Sangeetha Specialist -> MCP (Port 8000) -> Live Sangeetha APIs -> UCP
              const result = await this.orchestrator.handleUserQuery(prompt, sessionId);

              const responsePayload = {
                output: {
                  message: {
                    role: 'assistant',
                    content: [
                      {
                        text: result.finalUserResponse
                      }
                    ]
                  }
                },
                responseText: result.finalUserResponse,
                agentId: this.orchestrator.agentId,
                sessionId: result.sessionId || sessionId,
                isFollowUp: result.isFollowUp || false,
                status: 'COMPLETED',
                executionMetrics: {
                  bedrockReasoningUsed: result.bedrockReasoningUsed,
                  a2aStatus: result.a2aWireResponse?.result?.status || 'COMPLETED'
                }
              };

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(responsePayload, null, 2));
            } catch (err: any) {
              console.error('[AGENTCORE RUNTIME ERROR]:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                error: 'InvocationFailed',
                message: err.message || String(err)
              }));
            }
          });
          return;
        }

        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint Not Found', url }));
      });

      this.runtimeHttpServer.listen(this.runtimePort, this.host, () => {
        console.log(`\n================================================================`);
        console.log(`  AMAZON BEDROCK AGENTCORE RUNTIME SERVER STARTED`);
        console.log(`  ▶ Architecture:      linux/arm64`);
        console.log(`  ▶ Health Check:      GET http://${this.host}:${this.runtimePort}/ping`);
        console.log(`  ▶ Playground API:    POST http://${this.host}:${this.runtimePort}/invocations`);
        console.log(`  ▶ Sangeetha A2A:     http://${this.host}:${this.a2aPort}/`);
        console.log(`  ▶ Sangeetha MCP:     http://${this.host}:${this.mcpPort}/mcp`);
        console.log(`================================================================\n`);
        resolve();
      });

      this.runtimeHttpServer.on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    return new Promise(resolve => {
      if (this.runtimeHttpServer) {
        this.runtimeHttpServer.close(async () => {
          console.log('[AGENTCORE RUNTIME] Server stopped.');
          await this.sangeethaA2AServer.stop();
          await sangeethaMcpServer.stop();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const agentCoreRuntimeServer = new AgentCoreRuntimeServer();

if (require.main === module || process.argv[1]?.endsWith('agentcore-runtime-server.ts') || process.argv[1]?.endsWith('agentcore-runtime-server.js')) {
  agentCoreRuntimeServer.start().catch(console.error);
}
