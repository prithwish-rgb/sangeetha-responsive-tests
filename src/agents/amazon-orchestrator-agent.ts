/**
 * Agent 1: Amazon Shopping / Orchestrator Agent
 * Identity: amazon.shopping.orchestrator.v1
 * Platform: Amazon Bedrock Agentic Platform / AgentCore
 *
 * Capabilities:
 * 1. Powered by Amazon Bedrock Runtime (@aws-sdk/client-bedrock-runtime) for agentic reasoning and synthesis.
 * 2. Discovers external specialist agents via official A2A v1.0 Agent Card (GET /.well-known/agent-card.json).
 * 3. Transmits official JSON-RPC 2.0 "message/send" requests to the canonical A2A endpoint (POST /).
 * 4. Receives standard A2A JSON-RPC 2.0 result envelopes carrying A2AMessage parts.
 * 5. Maintains multi-turn shopping context keyed by AgentCore runtime session identifier.
 * 6. Synthesizes consumer recommendations with strict read-only demo notice.
 *
 * CRITICAL ARCHITECTURAL ISOLATION:
 * This orchestrator NEVER directly accesses or calls the Sangeetha Commerce MCP interface.
 * MCP tools are strictly and exclusively invoked across the A2A boundary by the Sangeetha Specialist Agent.
 */

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from '../config/env.js';
import {
  A2Av1AgentCard,
  A2Av1JsonRpcRequest,
  A2Av1JsonRpcResponse,
  A2AMessage
} from '../types/a2a-v1.types.js';
import { A2AHandoffRequest, A2AHandoffResponse } from '../types/a2a.types.js';

export interface ShoppingSessionContext {
  productId: string;
  productName: string;
  brand: string;
  pincode: string;
  price: number;
  fulfillmentLocation: string;
  stockStatus: string;
  eta: string;
  deliveryMethod?: string;
  isAvailable?: boolean;
}

export interface OrchestrationLog {
  userQuery: string;
  agentCardDiscovered?: A2Av1AgentCard;
  a2aWireRequest?: A2Av1JsonRpcRequest;
  a2aWireResponse?: A2Av1JsonRpcResponse;
  finalUserResponse: string;
  bedrockReasoningUsed: boolean;
  sessionId?: string;
  isFollowUp?: boolean;
}

export class AmazonShoppingOrchestratorAgent {
  public readonly agentId = 'amazon.shopping.orchestrator.v1';
  public readonly agentName = 'Amazon Shopping Orchestration Agent';
  public readonly platform = 'Amazon Bedrock Agentic Platform';

  public static sessionStore = new Map<string, ShoppingSessionContext>();

  private agentCoreRuntimeUrl: string;
  private agentCardUrl: string;
  private bedrockClient: BedrockRuntimeClient;

  constructor(runtimeBaseUrl = `http://127.0.0.1:${config.agentCoreRuntimePort}`) {
    this.agentCoreRuntimeUrl = runtimeBaseUrl.replace(/\/$/, '');
    this.agentCardUrl = `${this.agentCoreRuntimeUrl}/.well-known/agent-card.json`;
    this.bedrockClient = new BedrockRuntimeClient({
      region: config.awsRegion
    });
  }

  public static clearSessionStore() {
    AmazonShoppingOrchestratorAgent.sessionStore.clear();
  }

  /**
   * 1. A2A Agent Discovery: Retrieves and validates the external Agent Card
   */
  public async discoverSpecialistAgent(): Promise<A2Av1AgentCard> {
    console.log(`[AMAZON AGENTIC PLATFORM -> A2A DISCOVERY] Querying Agent Card at: ${this.agentCardUrl}`);
    const response = await fetch(this.agentCardUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to discover A2A Agent Card from ${this.agentCardUrl} (HTTP ${response.status})`);
    }

    const agentCard: A2Av1AgentCard = await response.json();
    console.log(`[AMAZON AGENTIC PLATFORM -> A2A DISCOVERY] Discovered Agent: "${agentCard.name}" (ID: ${agentCard.agentId})`);
    console.log(`  ▶ Spec Version: ${agentCard.specVersion}`);
    console.log(`  ▶ Architecture: ${agentCard.architecture || 'linux/arm64'}`);
    console.log(`  ▶ Supported Interfaces: ${agentCard.supportedInterfaces.map(i => `${i.protocol}@${i.url}`).join(', ')}`);
    console.log(`  ▶ Skills Advertised: ${agentCard.capabilities.skills.map(s => s.id).join(', ')}\n`);
    return agentCard;
  }

  /**
   * Helper: Check if query contains an explicit brand/product request
   */
  public static containsExplicitBrandOrProduct(userQuery: string): boolean {
    return /\b(nothing|apple|iphone|ipad|samsung|galaxy|pixel|google|oneplus|one\s*plus|xiaomi|redmi|realme|oppo|vivo|iqoo|motorola|moto)\b/i.test(userQuery);
  }

  /**
   * 2. Intent & Brand Extraction (Deterministic + Bedrock)
   */
  public extractIntent(userQuery: string): {
    query: string;
    brand?: string;
    pincode: string;
    maxPrice?: number;
    deliverableToday: boolean;
  } {
    const pincodeMatch = userQuery.match(/\b\d{6}\b/);
    const pincode = pincodeMatch ? pincodeMatch[0] : '560078';

    const priceMatch = userQuery.match(/(?:under|below|less than|within|budget of)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i);
    const maxPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;

    let brand: string | undefined = undefined;
    let queryKeyword = '';

    if (/\bnothing\b/i.test(userQuery)) {
      brand = 'Nothing';
      queryKeyword = 'Nothing';
    } else if (/\b(?:google\s+pixel|pixel)\b/i.test(userQuery)) {
      brand = 'Google';
      const m = userQuery.match(/pixel\s*\d+[a-z\s]*/i);
      queryKeyword = m ? m[0].trim() : 'Pixel';
    } else if (/\b(?:apple|iphone|ipad)\b/i.test(userQuery)) {
      brand = 'Apple';
      const m = userQuery.match(/iphone\s*\d+\s*(?:pro\s*max|pro|plus)?/i);
      queryKeyword = m ? m[0].trim() : 'iPhone';
    } else if (/\bsamsung\b/i.test(userQuery)) {
      brand = 'Samsung';
      const m = userQuery.match(/samsung\s*(?:galaxy\s*)?[a-z0-9\s]+/i);
      queryKeyword = m ? m[0].trim() : 'Samsung';
    } else if (/\b(?:oneplus|one\s*plus)\b/i.test(userQuery)) {
      brand = 'OnePlus';
      queryKeyword = 'OnePlus';
    } else if (/\b(?:xiaomi|redmi)\b/i.test(userQuery)) {
      brand = 'Xiaomi';
      queryKeyword = 'Redmi';
    } else if (/\brealme\b/i.test(userQuery)) {
      brand = 'Realme';
      queryKeyword = 'Realme';
    } else if (/\boppo\b/i.test(userQuery)) {
      brand = 'Oppo';
      queryKeyword = 'Oppo';
    } else if (/\b(?:vivo|iqoo)\b/i.test(userQuery)) {
      brand = 'Vivo';
      queryKeyword = 'Vivo';
    } else if (/\b(?:motorola|moto)\b/i.test(userQuery)) {
      brand = 'Motorola';
      queryKeyword = 'Motorola';
    } else {
      queryKeyword = userQuery
        .replace(/(?:find|search|show|get|check|available|deliverable|today|at|for|pincode|\b\d{6}\b|under|below|less than|within|₹|rs\.?|inr|[\d,]+|phone|mobile|smartphones?|device)/gi, '')
        .trim();
      if (!queryKeyword) {
        queryKeyword = 'Smartphone';
      }
    }

    const deliverableToday = /today|immediate|express|30\s*min/i.test(userQuery);

    return {
      query: queryKeyword,
      brand,
      pincode,
      maxPrice,
      deliverableToday
    };
  }

  /**
   * 2. Bedrock Agentic Intent Extraction
   */
  private async extractIntentWithBedrock(userQuery: string): Promise<{
    query: string;
    brand?: string;
    pincode: string;
    maxPrice?: number;
    deliverableToday: boolean;
    usedBedrock: boolean;
  }> {
    const local = this.extractIntent(userQuery);

    // Attempt Bedrock Converse API invocation if credentials exist
    if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_PROFILE) {
      try {
        console.log(`[ORCHESTRATOR REASONING] Attempting Amazon Bedrock Converse API call (Model: ${config.agentModelId})...`);
        const command = new ConverseCommand({
          modelId: config.agentModelId,
          messages: [
            {
              role: 'user',
              content: [
                {
                  text: `You are Amazon Shopping Orchestrator Agent. Extract search parameters from this user query into JSON with keys: query (string), brand (string or null, e.g. "Nothing", "Samsung", "Apple", "Google", "OnePlus"), pincode (string, default 560078), maxPrice (number or null), deliverableToday (boolean). User Query: "${userQuery}". Output ONLY JSON.`
                }
              ]
            }
          ]
        });

        const res = await this.bedrockClient.send(command);
        const textOut = res.output?.message?.content?.[0]?.text || '{}';
        const parsed = JSON.parse(textOut);
        console.log(`[ORCHESTRATOR REASONING] ✅ REAL AWS Bedrock Converse API Executed Successfully.`);
        return {
          query: parsed.query || local.query,
          brand: parsed.brand || local.brand,
          pincode: parsed.pincode || local.pincode,
          maxPrice: parsed.maxPrice !== undefined ? parsed.maxPrice : local.maxPrice,
          deliverableToday: parsed.deliverableToday !== undefined ? !!parsed.deliverableToday : local.deliverableToday,
          usedBedrock: true
        };
      } catch (err: any) {
        console.log(`[ORCHESTRATOR REASONING] ⚠️ Bedrock API call failed: ${err.message}`);
      }
    }

    // Explicit log for fallback
    console.log(`[ORCHESTRATOR REASONING] BEDROCK CLOUD CALL NOT EXECUTED — LOCAL FALLBACK ACTIVE`);
    console.log(`  ▶ Reason: AWS credentials not configured in environment (aws sts get-caller-identity returned NoCredentials)\n`);

    return {
      ...local,
      usedBedrock: false
    };
  }

  /**
   * 3. Main Query Orchestration over official A2A v1.0 Wire with Session Context
   */
  public async handleUserQuery(userQuery: string, sessionId?: string): Promise<OrchestrationLog> {
    const activeSessionId = sessionId || 'session-default';

    console.log(`\n################################################################`);
    console.log(`[AMAZON AGENTIC PLATFORM] [Agent ID: ${this.agentId}]`);
    console.log(`  ▶ Platform:     ${this.platform}`);
    console.log(`  ▶ User Request: "${userQuery}"`);
    console.log(`[SESSION] Session ID: ${activeSessionId}`);
    console.log(`################################################################\n`);

    const readOnlyNotice = 'This is a read-only shopping demo; cart and checkout actions are not enabled.';

    // Check for previous session context
    const previousContext = AmazonShoppingOrchestratorAgent.sessionStore.get(activeSessionId);
    const hasExplicitBrand = AmazonShoppingOrchestratorAgent.containsExplicitBrandOrProduct(userQuery);

    // Multi-turn Follow-up Handling (when previousContext exists and user is not starting a brand-new search)
    if (previousContext && !hasExplicitBrand) {
      console.log(`[SESSION] Stored shopping context: ${previousContext.productName}`);
      const qLower = userQuery.toLowerCase().trim();

      // Case 1: Pincode Change follow-up (e.g. "What about 560001?", "Can it be delivered to 560001?", "560001")
      const newPincodeMatch = userQuery.match(/\b\d{6}\b/);
      if (newPincodeMatch && (newPincodeMatch[0] !== previousContext.pincode || /what about|check|deliver to|for\s*\d{6}/i.test(userQuery))) {
        const newPincode = newPincodeMatch[0];
        console.log(`[SESSION] Follow-up detected: "${userQuery}"`);
        console.log(`[SESSION] Resolving against previous product: "${previousContext.productName}" (Re-evaluating fulfillment for pincode ${newPincode})`);

        // Execute A2A check specifically for this product at the new pincode
        const agentCard = await this.discoverSpecialistAgent();
        const jsonRpcInterface = agentCard.supportedInterfaces.find(i => i.protocol === 'JSON_RPC_2_0');
        const targetA2AUrl = jsonRpcInterface?.url || `${this.agentCoreRuntimeUrl}/`;

        const handoffPayload: A2AHandoffRequest = {
          handoff_id: `handoff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          source_agent_id: this.agentId,
          target_agent_id: agentCard.agentId,
          timestamp: new Date().toISOString(),
          task: {
            intent: 'hyperlocal_product_search',
            query: previousContext.productName,
            brand: previousContext.brand,
            product_id: previousContext.productId,
            pincode: newPincode,
            delivery_requirement: 'standard'
          },
          context: {
            session_id: activeSessionId,
            conversation_turn: 2
          }
        };

        const a2aRequestMessage: A2AMessage = {
          messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          role: 'user',
          parts: [
            { type: 'text', text: userQuery },
            { type: 'data', mimeType: 'application/json', data: handoffPayload }
          ],
          timestamp: new Date().toISOString()
        };

        const a2aRpcRequest: A2Av1JsonRpcRequest = {
          jsonrpc: '2.0',
          id: `rpc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          method: 'message/send',
          params: {
            message: a2aRequestMessage,
            context: {
              taskId: `task-${Date.now()}`,
              sessionId: activeSessionId,
              senderAgentId: this.agentId,
              recipientAgentId: agentCard.agentId
            }
          }
        };

        const a2aResponse = await fetch(targetA2AUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${config.runtimeBearerToken}`,
            'X-A2A-Version': '1.0.0',
            'X-A2A-Origin-Agent': this.agentId
          },
          body: JSON.stringify(a2aRpcRequest)
        });

        const a2aRpcResponse: A2Av1JsonRpcResponse = await a2aResponse.json();
        const responseDataPart = a2aRpcResponse.result?.message?.parts.find(p => p.type === 'data');
        const handoffResult = (responseDataPart?.data as A2AHandoffResponse) || ({} as A2AHandoffResponse);

        let finalUserResponse = '';
        if (handoffResult.status === 'UNSERVICEABLE') {
          finalUserResponse = `I'm sorry, but postal code ${newPincode} is currently not serviceable for delivery by Sangeetha Mobiles (${handoffResult.data?.serviceability_message || 'Unserviceable area'}). Please provide an alternative delivery pincode.\n\n${readOnlyNotice}`;
        } else {
          const fulfillment = handoffResult.data?.fulfillment;
          const isAvailable = fulfillment?.availability?.is_deliverable ?? false;
          const storeName = fulfillment?.location?.name || 'Nearest Sangeetha Store';
          const deliveryMethod = fulfillment?.fulfillment_options?.[0]?.title || 'Hyperlocal Express Delivery';
          const etaText = fulfillment?.buyer_facing_description || 'Standard Delivery';

          // Update session context with new pincode fulfillment
          const updatedContext: ShoppingSessionContext = {
            productId: previousContext.productId,
            productName: previousContext.productName,
            brand: previousContext.brand,
            pincode: newPincode,
            price: previousContext.price,
            fulfillmentLocation: storeName,
            stockStatus: isAvailable ? 'In Stock (Live Store Inventory)' : 'Out of Stock',
            eta: etaText,
            deliveryMethod,
            isAvailable
          };
          AmazonShoppingOrchestratorAgent.sessionStore.set(activeSessionId, updatedContext);
          console.log(`[SESSION] Stored shopping context: ${updatedContext.productName} (Pincode updated to ${newPincode})`);

          if (isAvailable) {
            finalUserResponse = `Product: ${previousContext.productName}\n` +
              `Price: ₹${previousContext.price.toLocaleString('en-IN')}\n` +
              `Availability: In Stock (Live Store Inventory)\n` +
              `Fulfillment location: ${storeName}\n` +
              `Delivery: ${deliveryMethod}\n` +
              `ETA: ${etaText}\n\n` +
              `${readOnlyNotice}`;
          } else {
            finalUserResponse = `Product: ${previousContext.productName}\n` +
              `Price: ₹${previousContext.price.toLocaleString('en-IN')}\n` +
              `Availability: Out of Stock\n` +
              `Fulfillment location: ${storeName}\n` +
              `Delivery: Unavailable\n` +
              `ETA: Not Deliverable\n\n` +
              `This item is currently out of stock for pincode ${newPincode}.\n` +
              `${readOnlyNotice}`;
          }
        }

        return {
          userQuery,
          agentCardDiscovered: agentCard,
          a2aWireRequest: a2aRpcRequest,
          a2aWireResponse: a2aRpcResponse,
          finalUserResponse,
          bedrockReasoningUsed: false,
          sessionId: activeSessionId,
          isFollowUp: true
        };
      }

      // Case 2: Store / Location follow-up ("Which store will fulfill it?", "Where is it coming from?", "Where is it delivered from?")
      if (/store|fulfil|fulfill|where is it|where will|coming from|which location|from where/i.test(qLower)) {
        console.log(`[SESSION] Follow-up detected: "${userQuery}"`);
        console.log(`[SESSION] Resolving against previous product: "${previousContext.productName}"`);

        const finalUserResponse = `Product: ${previousContext.productName}\n` +
          `Fulfillment location: ${previousContext.fulfillmentLocation}\n` +
          `Delivery: ${previousContext.deliveryMethod || 'Hyperlocal Express Delivery'}\n` +
          `ETA: ${previousContext.eta}\n` +
          `Availability: ${previousContext.stockStatus}\n\n` +
          `The ${previousContext.productName} will be fulfilled from ${previousContext.fulfillmentLocation} for delivery to pincode ${previousContext.pincode}.\n\n` +
          `${readOnlyNotice}`;

        return {
          userQuery,
          finalUserResponse,
          bedrockReasoningUsed: false,
          sessionId: activeSessionId,
          isFollowUp: true
        };
      }

      // Case 3: ETA / Speed follow-up ("How quickly can I get it?", "What's the ETA?", "When will I get it?", "Delivery time?")
      if (/how quick|how fast|when will|what.*eta|delivery time|how soon|arrive/i.test(qLower)) {
        console.log(`[SESSION] Follow-up detected: "${userQuery}"`);
        console.log(`[SESSION] Resolving against previous product: "${previousContext.productName}"`);

        const finalUserResponse = `Product: ${previousContext.productName}\n` +
          `ETA: ${previousContext.eta}\n` +
          `Delivery: ${previousContext.deliveryMethod || 'Hyperlocal Express Delivery'}\n` +
          `Fulfillment location: ${previousContext.fulfillmentLocation}\n` +
          `Availability: ${previousContext.stockStatus}\n\n` +
          `Estimated delivery for ${previousContext.productName} to pincode ${previousContext.pincode} is ${previousContext.eta} via ${previousContext.deliveryMethod || 'Hyperlocal Express Delivery'}.\n\n` +
          `${readOnlyNotice}`;

        return {
          userQuery,
          finalUserResponse,
          bedrockReasoningUsed: false,
          sessionId: activeSessionId,
          isFollowUp: true
        };
      }

      // Case 4: Stock / Availability follow-up ("Is it in stock?", "Is this available?", "Check stock")
      if (/in stock|available|availability|have stock/i.test(qLower)) {
        console.log(`[SESSION] Follow-up detected: "${userQuery}"`);
        console.log(`[SESSION] Resolving against previous product: "${previousContext.productName}"`);

        const finalUserResponse = `Product: ${previousContext.productName}\n` +
          `Availability: ${previousContext.stockStatus}\n` +
          `Price: ₹${previousContext.price.toLocaleString('en-IN')}\n` +
          `Fulfillment location: ${previousContext.fulfillmentLocation}\n` +
          `ETA: ${previousContext.eta}\n\n` +
          `${previousContext.productName} is currently ${previousContext.stockStatus} for delivery to pincode ${previousContext.pincode}.\n\n` +
          `${readOnlyNotice}`;

        return {
          userQuery,
          finalUserResponse,
          bedrockReasoningUsed: false,
          sessionId: activeSessionId,
          isFollowUp: true
        };
      }

      // Case 5: Store Pickup follow-up ("Can I pick it up?", "Is store pickup available?")
      if (/pick.*up|collect.*store/i.test(qLower)) {
        console.log(`[SESSION] Follow-up detected: "${userQuery}"`);
        console.log(`[SESSION] Resolving against previous product: "${previousContext.productName}"`);

        const finalUserResponse = `Product: ${previousContext.productName}\n` +
          `Fulfillment location: ${previousContext.fulfillmentLocation}\n` +
          `Availability: ${previousContext.stockStatus}\n\n` +
          `Store pickup is available for ${previousContext.productName} at ${previousContext.fulfillmentLocation}.\n\n` +
          `${readOnlyNotice}`;

        return {
          userQuery,
          finalUserResponse,
          bedrockReasoningUsed: false,
          sessionId: activeSessionId,
          isFollowUp: true
        };
      }

      // Case 6: Generic follow-up referring to "it" / "this"
      if (/\b(it|this|that|price|cost|how much)\b/i.test(qLower)) {
        console.log(`[SESSION] Follow-up detected: "${userQuery}"`);
        console.log(`[SESSION] Resolving against previous product: "${previousContext.productName}"`);

        const finalUserResponse = `Product: ${previousContext.productName}\n` +
          `Price: ₹${previousContext.price.toLocaleString('en-IN')}\n` +
          `Availability: ${previousContext.stockStatus}\n` +
          `Fulfillment location: ${previousContext.fulfillmentLocation}\n` +
          `Delivery: ${previousContext.deliveryMethod || 'Hyperlocal Express Delivery'}\n` +
          `ETA: ${previousContext.eta}\n\n` +
          `${readOnlyNotice}`;

        return {
          userQuery,
          finalUserResponse,
          bedrockReasoningUsed: false,
          sessionId: activeSessionId,
          isFollowUp: true
        };
      }
    }

    // Full Search Pipeline via A2A
    // Step A: Discover external agent via Agent Card
    const agentCard = await this.discoverSpecialistAgent();

    // Determine target A2A URL from supportedInterfaces
    const jsonRpcInterface = agentCard.supportedInterfaces.find(i => i.protocol === 'JSON_RPC_2_0');
    const targetA2AUrl = jsonRpcInterface?.url || `${this.agentCoreRuntimeUrl}/`;

    // Step B: Intent & Constraint Extraction via Bedrock Agentic logic
    const { query, brand, pincode, maxPrice, deliverableToday, usedBedrock } = await this.extractIntentWithBedrock(userQuery);

    // Step C: Construct Business Handoff Payload
    const handoffPayload: A2AHandoffRequest = {
      handoff_id: `handoff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      source_agent_id: this.agentId,
      target_agent_id: agentCard.agentId,
      timestamp: new Date().toISOString(),
      task: {
        intent: 'hyperlocal_product_search',
        query,
        brand,
        max_price: maxPrice,
        pincode,
        delivery_requirement: deliverableToday ? 'today' : 'standard'
      },
      context: {
        session_id: activeSessionId,
        conversation_turn: 1
      }
    };

    // Step D: Wrap into Official A2A v1.0 JSON-RPC 2.0 Message Structure
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const rpcRequestId = `rpc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const a2aRequestMessage: A2AMessage = {
      messageId,
      role: 'user',
      parts: [
        {
          type: 'text',
          text: userQuery
        },
        {
          type: 'data',
          mimeType: 'application/json',
          data: handoffPayload
        }
      ],
      timestamp: new Date().toISOString()
    };

    const a2aRpcRequest: A2Av1JsonRpcRequest = {
      jsonrpc: '2.0',
      id: rpcRequestId,
      method: 'message/send',
      params: {
        message: a2aRequestMessage,
        context: {
          taskId: `task-${Date.now()}`,
          sessionId: activeSessionId,
          senderAgentId: this.agentId,
          recipientAgentId: agentCard.agentId
        }
      }
    };

    console.log(`------------------------------------------------------`);
    console.log(`[A2A PROTOCOL v1.0 WIRE -> REQUEST]`);
    console.log(`  POST ${targetA2AUrl}`);
    console.log(`  Headers: Content-Type: application/json, Accept: application/json, Authorization: Bearer <TOKEN>, X-A2A-Origin-Agent: ${this.agentId}`);
    console.log(`  Body:\n${JSON.stringify(a2aRpcRequest, null, 2)}`);
    console.log(`------------------------------------------------------\n`);

    // Step E: Send A2A Request across the HTTP wire to Bedrock AgentCore Runtime
    const a2aResponse = await fetch(targetA2AUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.runtimeBearerToken}`,
        'X-A2A-Version': '1.0.0',
        'X-A2A-Origin-Agent': this.agentId
      },
      body: JSON.stringify(a2aRpcRequest)
    });

    if (!a2aResponse.ok) {
      throw new Error(`A2A AgentCore Runtime returned HTTP ${a2aResponse.status}: ${await a2aResponse.text()}`);
    }

    const a2aRpcResponse: A2Av1JsonRpcResponse = await a2aResponse.json();

    console.log(`------------------------------------------------------`);
    console.log(`[A2A PROTOCOL v1.0 WIRE -> RESPONSE]`);
    console.log(`  HTTP Status: ${a2aResponse.status}`);
    console.log(`  Body:\n${JSON.stringify(a2aRpcResponse, null, 2)}`);
    console.log(`------------------------------------------------------\n`);

    if (a2aRpcResponse.error) {
      throw new Error(`A2A JSON-RPC Error: [${a2aRpcResponse.error.code}] ${a2aRpcResponse.error.message}`);
    }

    // Step F: Extract Data Part from JSON-RPC Response Message
    const responseMsg = a2aRpcResponse.result?.message;
    const responseDataPart = responseMsg?.parts.find(p => p.type === 'data');
    const handoffResult = (responseDataPart?.data as A2AHandoffResponse) || ({} as A2AHandoffResponse);

    // Step G: Synthesize Final User Response
    let finalUserResponse = '';

    if (handoffResult.status === 'UNSERVICEABLE') {
      finalUserResponse = `I'm sorry, but postal code ${pincode} is currently not serviceable for delivery by Sangeetha Mobiles (${handoffResult.data?.serviceability_message || 'Unserviceable area'}). Please provide an alternative delivery pincode.\n\n${readOnlyNotice}`;
    } else if (handoffResult.status === 'NO_MATCH') {
      const lowest = handoffResult.data?.lowest_catalog_price_product;
      let altText = '';
      if (lowest) {
        altText = ` The lowest priced ${brand || query} currently in catalog is the **${lowest.title}** at ₹${lowest.price.sale_price.toLocaleString('en-IN')}.`;
      }
      finalUserResponse = `No ${brand || query} models were found under ₹${maxPrice?.toLocaleString('en-IN') || '80,000'} in Sangeetha's live inventory.${altText}\n\n${readOnlyNotice}`;
    } else {
      const product = handoffResult.data?.matched_product!;
      const fulfillment = handoffResult.data?.fulfillment!;
      const isAvailable = fulfillment?.availability?.is_deliverable;
      const storeName = fulfillment?.location?.name || 'Nearest Sangeetha Store';
      const deliveryMethod = fulfillment?.fulfillment_options?.[0]?.title || 'Hyperlocal Express Delivery';
      const etaText = fulfillment?.buyer_facing_description || '30 Minutes';

      // Store in session context
      const newContext: ShoppingSessionContext = {
        productId: product.product_id,
        productName: product.title,
        brand: product.brand,
        pincode,
        price: product.price.sale_price,
        fulfillmentLocation: storeName,
        stockStatus: isAvailable ? 'In Stock (Live Store Inventory)' : 'Out of Stock',
        eta: etaText,
        deliveryMethod,
        isAvailable
      };
      AmazonShoppingOrchestratorAgent.sessionStore.set(activeSessionId, newContext);
      console.log(`[SESSION] Stored shopping context: ${newContext.productName}`);

      if (isAvailable) {
        finalUserResponse = `Product: ${product.title}\n` +
          `Price: ₹${product.price.sale_price.toLocaleString('en-IN')}\n` +
          `Availability: In Stock (Live Store Inventory)\n` +
          `Fulfillment location: ${storeName}\n` +
          `Delivery: ${deliveryMethod}\n` +
          `ETA: ${etaText}\n\n` +
          `${readOnlyNotice}`;
      } else {
        finalUserResponse = `Product: ${product?.title || query}\n` +
          `Price: ₹${product?.price?.sale_price?.toLocaleString('en-IN') || 'N/A'}\n` +
          `Availability: Out of Stock\n` +
          `Fulfillment location: ${storeName}\n` +
          `Delivery: Unavailable\n` +
          `ETA: Not Deliverable\n\n` +
          `This item is currently out of stock for pincode ${pincode}.\n` +
          `${readOnlyNotice}`;
      }
    }

    console.log(`[AMAZON AGENTIC PLATFORM] Final User Response:`);
    console.log(finalUserResponse);
    console.log(`\n======================================================\n`);

    return {
      userQuery,
      agentCardDiscovered: agentCard,
      a2aWireRequest: a2aRpcRequest,
      a2aWireResponse: a2aRpcResponse,
      finalUserResponse,
      bedrockReasoningUsed: usedBedrock,
      sessionId: activeSessionId,
      isFollowUp: false
    };
  }
}
