/**
 * Sangeetha Specialist Agent - Official A2A v1.0 Server
 * 
 * Complies with Amazon Bedrock AgentCore Runtime Container Contract:
 * - Architecture: linux/arm64
 * - Host: 0.0.0.0, Port: 9000
 * - GET /ping (Container Health Check)
 * - GET /.well-known/agent-card.json (A2A v1.0 Agent Card Discovery)
 * - POST / (Canonical JSON-RPC 2.0 A2A Message Handler)
 */

import http, { IncomingMessage, ServerResponse } from 'http';
import { config } from '../config/env.js';
import { sangeethaSpecialistAgent } from './sangeetha-specialist-agent.js';
import { validateAgentCoreAuth } from '../agentcore/auth.middleware.js';
import {
  A2Av1AgentCard,
  A2Av1JsonRpcRequest,
  A2Av1JsonRpcResponse,
  A2AMessage
} from '../types/a2a-v1.types.js';
import { A2AHandoffRequest, A2AHandoffResponse } from '../types/a2a.types.js';

export class SangeethaA2AServer {
  private server: http.Server | null = null;
  private port: number;
  private host: string;

  constructor(port = config.agentCoreRuntimePort, host = config.agentCoreRuntimeHost) {
    this.port = port;
    this.host = host;
  }

  /**
   * Generates the official A2A v1.0 Agent Card.
   * Note: Excludes all internal credentials, tokens, or MCP secrets.
   */
  public getAgentCard(): A2Av1AgentCard {
    return {
      specVersion: '1.0.0',
      agentId: 'sangeetha.hyperlocal.commerce-agent.v1',
      name: 'Sangeetha Mobiles Hyperlocal Specialist Agent',
      description: 'Official Sangeetha Mobiles specialist agent providing real-time store inventory, 30-minute hyperlocal delivery SLAs, and catalog discovery across South India.',
      version: '1.0.0',
      architecture: 'linux/arm64',
      provider: {
        name: 'Sangeetha Mobiles Pvt Ltd',
        organization: 'E-Commerce & Hyperlocal Engineering',
        website: 'https://www.sangeetha.com'
      },
      supportedInterfaces: [
        {
          protocol: 'JSON_RPC_2_0',
          protocolVersion: '1.0',
          url: `http://${this.host === '0.0.0.0' ? '127.0.0.1' : this.host}:${this.port}/`
        }
      ],
      authentication: {
        type: 'BEARER',
        serviceName: 'bedrock-agentcore'
      },
      capabilities: {
        streaming: false,
        pushNotifications: false,
        skills: [
          {
            id: 'hyperlocal_commerce_discovery',
            name: 'Hyperlocal Product, Store Stock & 30-Min Delivery Verification',
            description: 'Queries live Sangeetha catalog, checks store-level inventory at nearest fulfillment centers, and verifies 30-minute express delivery eligibility for given pincodes.',
            tags: ['ecommerce', 'hyperlocal', 'quick-commerce', 'sangeetha', 'smartphones'],
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Product search term (e.g. "Nothing phone", "iPhone 16")' },
                pincode: { type: 'string', description: '6-digit Indian Postal Pincode' },
                max_price: { type: 'number', description: 'Maximum price filter in INR' },
                deliverable_today_only: { type: 'boolean', description: 'Require 30-min express or same-day delivery' }
              },
              required: ['query', 'pincode']
            },
            outputSchema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['SUCCESS', 'OUT_OF_STOCK', 'UNSERVICEABLE', 'NO_MATCH'] },
                best_product_match: { type: 'object' },
                fulfillment: { type: 'object' }
              }
            }
          }
        ]
      },
      runtimeMetadata: {
        runtimePlatform: 'Amazon Bedrock AgentCore Runtime',
        containerPort: this.port,
        healthEndpoint: '/ping',
        targetArn: config.agentCoreGatewayTargetArn
      }
    };
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Handle CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-A2A-Version, X-A2A-Origin-Agent, X-Amz-Security-Token');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        const url = req.url || '/';
        const pathname = url.split('?')[0];

        // 1. Amazon Bedrock AgentCore Container Health Endpoint: GET /ping
        if (req.method === 'GET' && (pathname === '/ping' || pathname === '/health')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'Healthy',
            container: {
              architecture: 'linux/arm64',
              runtime: 'Amazon Bedrock AgentCore Runtime',
              port: this.port
            },
            agentId: 'sangeetha.hyperlocal.commerce-agent.v1',
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // 2. Official A2A v1.0 Agent Card Discovery: GET /.well-known/agent-card.json
        if (req.method === 'GET' && (pathname === '/.well-known/agent-card.json' || pathname === '/.well-known/agent.json')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getAgentCard(), null, 2));
          return;
        }

        // 3. Authentication Check
        const auth = validateAgentCoreAuth(req);
        if (!auth.authenticated) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32000,
              message: auth.error || 'Unauthorized'
            }
          }));
          return;
        }

        // 4. Canonical JSON-RPC 2.0 A2A Message Handler: POST / (and optional POST /v1/message/send)
        if (req.method === 'POST' && (pathname === '/' || pathname === '/v1/message/send' || pathname === '/v1/tasks/send')) {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const rpcRequest: A2Av1JsonRpcRequest = JSON.parse(body);

              if (rpcRequest.jsonrpc !== '2.0' || !rpcRequest.method) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcRequest.id || null,
                  error: { code: -32600, message: 'Invalid Request: jsonrpc 2.0 and method are required' }
                }));
                return;
              }

              if (rpcRequest.method !== 'message/send' && rpcRequest.method !== 'tasks/create') {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcRequest.id,
                  error: { code: -32601, message: `Method '${rpcRequest.method}' not found. Supported method is 'message/send'.` }
                }));
                return;
              }

              const startTime = Date.now();

              // Extract handoff request from message parts or payload
              const message = rpcRequest.params?.message;
              let handoffPayload: A2AHandoffRequest | undefined;

              if (message?.parts) {
                const dataPart = message.parts.find(p => p.type === 'data');
                if (dataPart?.data) {
                  handoffPayload = dataPart.data as A2AHandoffRequest;
                }
              }

              // Fallback if directly inside params.payload
              if (!handoffPayload && rpcRequest.params?.payload) {
                handoffPayload = rpcRequest.params.payload as A2AHandoffRequest;
              }

              if (!handoffPayload) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  jsonrpc: '2.0',
                  id: rpcRequest.id,
                  error: { code: -32602, message: 'Invalid params: Missing handoff payload in message.parts' }
                }));
                return;
              }

              // Execute through the Sangeetha Specialist Agent (which calls MCP tools)
              const handoffResult: A2AHandoffResponse = await sangeethaSpecialistAgent.executeHandoff(handoffPayload);
              const durationMs = Date.now() - startTime;

              // Construct response message
              const responseMessage: A2AMessage = {
                messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                role: 'agent',
                parts: [
                  {
                    type: 'text',
                    text: handoffResult.resolution?.summary || `Handoff completed with status ${handoffResult.status}`
                  },
                  {
                    type: 'data',
                    mimeType: 'application/json',
                    data: handoffResult
                  }
                ],
                timestamp: new Date().toISOString()
              };

              const rpcResponse: A2Av1JsonRpcResponse = {
                jsonrpc: '2.0',
                id: rpcRequest.id,
                result: {
                  status: 'COMPLETED',
                  message: responseMessage,
                  executionMetrics: {
                    durationMs,
                    toolsInvoked: [
                      'check_pincode_serviceability',
                      'search_products',
                      'check_stock',
                      'get_nearest_fulfilling_location',
                      'get_delivery_eta'
                    ]
                  }
                }
              };

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(rpcResponse, null, 2));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32603, message: 'Internal error: ' + (err.message || String(err)) }
              }));
            }
          });
          return;
        }

        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint Not Found', url }));
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[Sangeetha AgentCore Runtime] A2A v1.0 Server listening on http://${this.host}:${this.port} (Arch: linux/arm64)`);
        console.log(`[Sangeetha AgentCore Runtime] Agent Card: GET http://${this.host}:${this.port}/.well-known/agent-card.json`);
        console.log(`[Sangeetha AgentCore Runtime] Health Check: GET http://${this.host}:${this.port}/ping`);
        console.log(`[Sangeetha AgentCore Runtime] Canonical A2A Endpoint: POST http://${this.host}:${this.port}/`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(() => {
          console.log('[Sangeetha AgentCore Runtime] Server stopped.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const sangeethaA2AServer = new SangeethaA2AServer();

// Auto-run if executed directly
if (process.argv[1]?.endsWith('sangeetha-a2a-server.ts') || process.argv[1]?.endsWith('sangeetha-a2a-server.js')) {
  sangeethaA2AServer.start().catch(console.error);
}
