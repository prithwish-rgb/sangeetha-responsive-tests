# Sangeetha Mobiles Hyperlocal Shopping Agent (Amazon Agentic Platform A2A + MCP)

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP%20Protocol-2024--11--05-blue.svg)](https://modelcontextprotocol.io/)
[![A2A Handoff](https://img.shields.io/badge/Agent--to--Agent-Compliant-blueviolet.svg)](https://aws.amazon.com/bedrock/)
[![UCP Fulfillment](https://img.shields.io/badge/UCP%20Fulfillment-Compliant-teal.svg)](https://ucp.dev)

A Hyperlocal Shopping Agent demo for **Sangeetha Mobiles** built on the **Amazon Agentic Platform / Amazon Bedrock AgentCore**. It implements a true **Agent-to-Agent (A2A) Handoff** between an **Amazon Shopping Orchestrator Agent** and an **External Sangeetha Hyperlocal Specialist Agent** that accesses live production data via a dedicated **Model Context Protocol (MCP)** interface.

---

## 🏛️ Multi-Agent Architecture

```
User Query ("Find me a Nothing phone under ₹80,000 available at pincode 560078 and deliverable today.")
       ↓
[Agent 1] Amazon Shopping Orchestrator Agent (Identity: amazon.shopping.orchestrator.v1)
       ↓
=== AGENT-TO-AGENT (A2A) HANDOFF BOUNDARY ===
  ▶ Handoff Request: { intent: "hyperlocal_product_search", query: "Nothing", max_price: 80000, pincode: "560078", delivery_requirement: "today" }
       ↓
[Agent 2] External Sangeetha Hyperlocal Specialist Agent (Identity: sangeetha.hyperlocal.commerce-agent.v1)
       ↓
=== DEDICATED SANGEETHA COMMERCE MCP INTERFACE (Streamable HTTP / JSON-RPC 2.0) ===
  ├── 1. check_pincode_serviceability(pincode: "560078")
  ├── 2. search_products(query: "Nothing", max_price: 80000, pincode: "560078")
  ├── 3. check_stock(product_id: "20857", pincode: "560078")
  ├── 4. get_nearest_fulfilling_location(product_id: "20857", pincode: "560078")
  └── 5. get_delivery_eta(product_id: "20857", pincode: "560078")
       ↓
Live Sangeetha Production APIs (Server-to-Server, Read-Only)
  ├── POST /b/pims/data-model/pincode-eta-check
  ├── POST /b/customer/api/search/products
  └── POST /b/customer/api/v3/product-eta-details
       ↓
UCP Fulfillment Normalization
       ↓
=== A2A HANDOFF RETURN ===
  ▶ Handoff Response: { status: "SUCCESS", matched_product: { ... }, fulfillment: { ... }, source: "live_sangeetha_production_api" }
       ↓
[Agent 1] Amazon Shopping Orchestrator Agent
       ↓
Final User Response:
Product: Nothing Phone (4b) 8GB 128GB Black
Price: ₹39,999
Availability: In Stock (Live Store Inventory)
Fulfillment location: Koramangala-2 (SMPL)
Delivery: Hyperlocal Express Delivery
ETA: Get Delivery in 30 minutes from Koramangala-2 (SMPL)

Would you like me to add it to the cart?
```

---

## 🔑 Protocol Distinctions

- **A2A (Agent-to-Agent)**: The protocol used for handoffs between the Amazon Orchestrator Agent (`amazon.shopping.orchestrator.v1`) and the external Sangeetha Specialist Agent (`sangeetha.hyperlocal.commerce-agent.v1`).
- **MCP (Model Context Protocol)**: The tool interface used exclusively by the Sangeetha Specialist Agent to invoke live Sangeetha commerce tools (`search_products`, `check_stock`, etc.).
- **UCP (Universal Commerce Protocol)**: The standardized domain schema representing products, inventory, retail store locations, and fulfillment timeframes.

---

## 🚀 How to Run the Demos

### 1. Run the Multi-Agent A2A Handoff Demo
Executes the primary demo query and the 5-case validation matrix twice across the A2A handoff boundary:
```bash
npx tsx src/demo/run-handoff-demo.ts
```

### 2. Run the Remote AgentCore Gateway + MCP Validation
```bash
npx tsx src/agentcore/run-remote-demo.ts
```

### 3. Run the Direct MCP Server Test Client
```bash
npx tsx src/agent/test-mcp-client.ts
```

---

## 📁 Documentation Suite

- 📘 [`docs/agent-handoff-architecture.md`](docs/agent-handoff-architecture.md): A2A Architecture and sequence diagrams.
- 📋 [`docs/a2a-handoff-contract.md`](docs/a2a-handoff-contract.md): A2AHandoffRequest & A2AHandoffResponse JSON schemas.
- ⚙️ [`docs/sangeetha-agent-mcp-contract.md`](docs/sangeetha-agent-mcp-contract.md): Sangeetha Specialist Agent ↔ MCP tool interface specification.
- 💬 [`docs/end-to-end-agent-demo.md`](docs/end-to-end-agent-demo.md): Full conversational traces and validation logs.
- 🚀 [`docs/agentcore-deployment.md`](docs/agentcore-deployment.md): AWS Bedrock AgentCore deployment instructions.
- 🌐 [`docs/agentcore-gateway.md`](docs/agentcore-gateway.md): Bedrock AgentCore Gateway specification.
- 📊 [`docs/agentcore-validation.md`](docs/agentcore-validation.md): Remote validation matrix and latency benchmarks.
- 🗺️ [`docs/api-mapping.md`](docs/api-mapping.md): Field-by-field Sangeetha API → MCP → UCP mapping table.
- 📄 [`docs/mcp-tool-schemas.json`](docs/mcp-tool-schemas.json): Full JSON Schema definitions for all 6 MCP tools.

---

## 🔐 CI Authentication & Session Management

To run authenticated mobile regression suites in GitHub Actions without committing sensitive credentials or auth files to Git:

1. **Configure Repository Secret**:
   - Secret Name: `AUTH_STATE_BASE64`
   - Generate base64 payload from your local session:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes(".\auth-state-sangeetha.json")) | Set-Clipboard
     ```
   - In GitHub repository settings, navigate to **Settings > Secrets and variables > Actions** and create/update `AUTH_STATE_BASE64`.

2. **Session Expiry & Maintenance**:
   - > [!IMPORTANT]
   - > `AUTH_STATE_BASE64` must be refreshed when the stored Playwright authentication session expires.
   - Live production JWT tokens will expire periodically. When GitHub Actions `Verify Session Health Precondition` step reports `[AUTH HEALTH CHECK FAILED] Session is EXPIRED or INVALID`, generate a fresh `auth-state-sangeetha.json` and update the `AUTH_STATE_BASE64` repository secret.

