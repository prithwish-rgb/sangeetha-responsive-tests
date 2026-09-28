# Amazon Bedrock AgentCore Runtime Container Image
# Target Platform: linux/arm64
FROM --platform=linux/arm64 node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy application source
COPY src/ ./src/
COPY docs/ ./docs/

# Stage 2: Production Container
FROM --platform=linux/arm64 node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV AGENTCORE_RUNTIME_PORT=8080
ENV AGENTCORE_RUNTIME_HOST=0.0.0.0
ENV AWS_REGION=ap-south-1

# Copy node_modules and code from builder
COPY --from=builder /app /app

# Expose Bedrock AgentCore Runtime Container Port
EXPOSE 8080 9001 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9000/ping || exit 1

# Start the AgentCore Runtime Invocations & Multi-Agent Server
CMD ["npx", "tsx", "src/agentcore/agentcore-runtime-server.ts"]
