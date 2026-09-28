import { UcpProductSummary, UcpFulfillment } from './ucp.types';

/**
 * Agent-to-Agent (A2A) Protocol Contracts
 * Defines communication between Amazon Orchestrator Agent and Sangeetha Specialist Agent
 */

export interface A2AHandoffRequest {
  handoff_id: string;
  source_agent_id: string; // e.g. 'amazon.shopping.orchestrator.v1'
  target_agent_id: string; // e.g. 'sangeetha.hyperlocal.commerce-agent.v1'
  timestamp: string;
  task: {
    intent: 'hyperlocal_product_search' | 'check_inventory' | 'get_delivery_quote';
    query: string;
    product_id?: string;
    max_price?: number;
    brand?: string;
    pincode: string;
    delivery_requirement?: 'today' | 'immediate' | 'standard';
  };
  context?: {
    user_id?: string;
    session_id?: string;
    conversation_turn?: number;
  };
}

export interface A2AHandoffResponse {
  handoff_id: string;
  source_agent_id: string; // 'sangeetha.hyperlocal.commerce-agent.v1'
  target_agent_id: string; // 'amazon.shopping.orchestrator.v1'
  timestamp: string;
  status: 'SUCCESS' | 'NO_MATCH' | 'UNSERVICEABLE' | 'OUT_OF_STOCK' | 'ERROR';
  resolution?: {
    summary?: string;
  };
  execution_summary: {
    mcp_tools_called: string[];
    live_sangeetha_endpoints_queried: string[];
    total_execution_ms: number;
  };
  data: {
    matched_product?: UcpProductSummary;
    all_matches?: UcpProductSummary[];
    lowest_catalog_price_product?: UcpProductSummary;
    fulfillment?: UcpFulfillment;
    is_deliverable_today?: boolean;
    serviceability_message?: string;
    source: 'live_sangeetha_production_api';
  };
  error?: {
    code: string;
    message: string;
  };
}
