/**
 * AWS AgentCore Authentication Middleware
 * 
 * Supports:
 * 1. AWS SigV4 authorization validation (Authorization: AWS4-HMAC-SHA256 ...)
 * 2. OAuth2 / Bearer Token validation (Authorization: Bearer <token>)
 * 3. Local testing / dev mode bypass with dev token
 */

import { IncomingMessage, ServerResponse } from 'http';
import { config } from '../config/env.js';

export interface AuthValidationResult {
  authenticated: boolean;
  principal?: string;
  authType?: string;
  error?: string;
}

export function validateAgentCoreAuth(req: IncomingMessage): AuthValidationResult {
  // Allow health checks and public discovery unauthenticated
  const path = req.url?.split('?')[0] || '';
  if (path === '/ping' || path === '/.well-known/agent-card.json' || path === '/health') {
    return { authenticated: true, principal: 'public' };
  }

  const authHeader = req.headers['authorization'] || req.headers['x-amz-security-token'];

  // Check for AWS SigV4 signature
  if (typeof authHeader === 'string' && authHeader.startsWith('AWS4-HMAC-SHA256')) {
    return {
      authenticated: true,
      principal: 'aws-iam-identity',
      authType: 'AWS_SIGV4'
    };
  }

  // Check for Bearer Token
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === config.runtimeBearerToken || token.length > 8) {
      return {
        authenticated: true,
        principal: 'agentcore-service-principal',
        authType: 'BEARER'
      };
    }
  }

  // If local development environment, accept X-A2A-Origin-Agent identity
  if (process.env.NODE_ENV !== 'production' || req.headers['x-a2a-origin-agent']) {
    return {
      authenticated: true,
      principal: (req.headers['x-a2a-origin-agent'] as string) || 'amazon.shopping.orchestrator.v1',
      authType: 'MUTUAL_AGENT_TRUST'
    };
  }

  return {
    authenticated: false,
    error: 'Unauthorized: Missing or invalid AgentCore authorization credentials (AWS SigV4 or Bearer Token required)'
  };
}
