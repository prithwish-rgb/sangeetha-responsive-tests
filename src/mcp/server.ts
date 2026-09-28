import http from 'http';
import readline from 'readline';
import { MCP_TOOLS } from './tools';
import { McpToolHandlers } from './handlers';
import { config } from '../config/env';

/**
 * Sangeetha Commerce MCP Server
 * Dual Transport:
 * 1. Stdio (Local Development, CLI, Subagent testing)
 * 2. Streamable HTTP MCP (Amazon Bedrock AgentCore Runtime on 0.0.0.0:8000/mcp)
 */
export class SangeethaMcpServer {
  private server: http.Server | null = null;
  private isShuttingDown = false;

  /**
   * Process MCP JSON-RPC 2.0 requests
   */
  public async handleRpcRequest(request: any, requestId?: string): Promise<any> {
    const { id, method, params } = request;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false
            }
          },
          serverInfo: {
            name: 'sangeetha-commerce-mcp-runtime',
            version: '1.0.0'
          }
        }
      };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS
        }
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const result = await McpToolHandlers.executeTool(toolName, toolArgs);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ],
            isError: false
          }
        };
      } catch (err: any) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: err.message || String(err) })
              }
            ],
            isError: true
          }
        };
      }
    }

    if (method === 'ping') {
      return {
        jsonrpc: '2.0',
        id,
        result: {}
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    };
  }

  /**
   * 1. Stdio Transport (Local CLI/Dev/CI)
   */
  public startStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      if (!line.trim()) return;
      try {
        const req = JSON.parse(line);
        const res = await this.handleRpcRequest(req);
        process.stdout.write(JSON.stringify(res) + '\n');
      } catch (err: any) {
        const errRes = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: `Parse error: ${err.message}` }
        };
        process.stdout.write(JSON.stringify(errRes) + '\n');
      }
    });

    console.error('[Sangeetha MCP Runtime] Running in Stdio transport mode');
  }

  /**
   * 2. Streamable HTTP MCP Transport (Amazon Bedrock AgentCore Runtime)
   */
  public startHttp(port = config.mcpPort, host = config.mcpHost): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        if (this.isShuttingDown) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Server shutting down' }));
          return;
        }

        const reqId = (req.headers['x-amzn-bedrock-agent-request-id'] ||
          req.headers['x-request-id'] ||
          `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`) as string;

        // Security headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Amzn-Bedrock-Agent-Session-Id, X-Amzn-Bedrock-Agent-Request-Id');
        res.setHeader('X-Amzn-Bedrock-Agent-Request-Id', reqId);

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        const url = req.url || '/';

        // Health check endpoint for AgentCore Runtime / ALB / ECS
        if (req.method === 'GET' && (url === '/health' || url === '/')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'HEALTHY',
            runtime: 'amazon-bedrock-agentcore-runtime',
            server: 'sangeetha-commerce-mcp-server',
            version: '1.0.0',
            protocolVersion: '2024-11-05',
            transport: 'streamable-http',
            toolsCount: MCP_TOOLS.length,
            timestamp: new Date().toISOString()
          }));
          return;
        }

        // Direct tool schemas listing
        if (req.method === 'GET' && url === '/tools') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ tools: MCP_TOOLS }, null, 2));
          return;
        }

        // Validate Inbound Runtime Auth if Bearer header present or required
        const authHeader = req.headers['authorization'];
        if (authHeader && !authHeader.includes(config.runtimeAuthToken) && !authHeader.includes('Bearer')) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized: Invalid Runtime Authorization Token' }));
          return;
        }

        // Streamable HTTP JSON-RPC MCP endpoint
        if (req.method === 'POST' && (url === '/mcp' || url === '/' || url === '/rpc')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const rpcReq = JSON.parse(body);

              // Streamable HTTP chunked transfer
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Transfer-Encoding': 'chunked',
                'X-Content-Type-Options': 'nosniff'
              });

              const rpcRes = await this.handleRpcRequest(rpcReq, reqId);
              res.write(JSON.stringify(rpcRes));
              res.end();
            } catch (err: any) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                jsonrpc: '2.0',
                id: null,
                error: { code: -32700, message: err.message || 'Invalid JSON-RPC payload' }
              }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Endpoint ${url} not found` }));
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(port, host, () => {
        console.log(`[Sangeetha AgentCore Runtime] Streamable HTTP MCP listening on http://${host}:${port}/mcp`);
        resolve();
      });
    });
  }

  public start(port = config.mcpPort, host = config.mcpHost): Promise<void> {
    return this.startHttp(port, host);
  }

  public stop(): Promise<void> {
    return this.stopHttp();
  }

  /**
   * Graceful Shutdown
   */
  public stopHttp(): Promise<void> {
    return new Promise((resolve) => {
      this.isShuttingDown = true;
      if (this.server) {
        this.server.close(() => {
          console.log('[Sangeetha AgentCore Runtime] Server gracefully stopped.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export const sangeethaMcpServer = new SangeethaMcpServer();

// Entrypoint
if (require.main === module) {
  const mode = process.env.MCP_TRANSPORT || (process.argv.includes('--http') ? 'http' : 'stdio');
  const server = new SangeethaMcpServer();

  // Handle process shutdown signals
  process.on('SIGTERM', async () => {
    console.log('\n[Sangeetha AgentCore Runtime] Received SIGTERM, shutting down...');
    await server.stopHttp();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n[Sangeetha AgentCore Runtime] Received SIGINT, shutting down...');
    await server.stopHttp();
    process.exit(0);
  });

  if (mode === 'http') {
    server.startHttp();
  } else {
    server.startStdio();
  }
}
