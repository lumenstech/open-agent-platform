export const langflowFlowKeys = [
  "bidagent.opportunity-qualifier",
  "bidagent.solicitation-reader",
  "bidagent.proposal-agent",
  "comp-crm.company-research",
  "comp-crm.lead-enrichment",
  "comp-crm.opportunity-scoring",
  "labsnet.test-classifier",
  "labsnet.lab-router",
  "labsnet.rfq-generator",
  "propertygy.listing-enrichment",
  "propertygy.buyer-agent",
  "receptionos.call-reasoning",
  "receptionos.tool-router",
  "shared.web-research",
  "shared.document-rag",
  "shared.company-intelligence",
] as const;

export type LangflowFlowKey = (typeof langflowFlowKeys)[number];

export type LangflowFlowPolicy = {
  maxInputChars: number;
  allowSessionId: boolean;
  executionClass: "prompt" | "web-research" | "product-tooling";
  mutatesSystemOfRecord: false;
  advisoryOnly?: boolean;
};

const defaultPolicy: LangflowFlowPolicy = {
  maxInputChars: 128_000,
  allowSessionId: true,
  executionClass: "prompt",
  mutatesSystemOfRecord: false,
};

const policyByFlowKey: Record<LangflowFlowKey, LangflowFlowPolicy> = {
  "bidagent.opportunity-qualifier": defaultPolicy,
  "bidagent.solicitation-reader": {
    ...defaultPolicy,
    maxInputChars: 200_000,
  },
  "bidagent.proposal-agent": {
    ...defaultPolicy,
    maxInputChars: 160_000,
  },
  "comp-crm.company-research": {
    ...defaultPolicy,
    executionClass: "web-research",
  },
  "comp-crm.lead-enrichment": defaultPolicy,
  "comp-crm.opportunity-scoring": defaultPolicy,
  "labsnet.test-classifier": defaultPolicy,
  "labsnet.lab-router": {
    ...defaultPolicy,
    executionClass: "product-tooling",
    advisoryOnly: true,
  },
  "labsnet.rfq-generator": defaultPolicy,
  "propertygy.listing-enrichment": defaultPolicy,
  "propertygy.buyer-agent": {
    ...defaultPolicy,
    executionClass: "product-tooling",
  },
  "receptionos.call-reasoning": defaultPolicy,
  "receptionos.tool-router": {
    ...defaultPolicy,
    executionClass: "product-tooling",
  },
  "shared.web-research": {
    ...defaultPolicy,
    executionClass: "web-research",
  },
  "shared.document-rag": {
    ...defaultPolicy,
    executionClass: "product-tooling",
    maxInputChars: 64_000,
  },
  "shared.company-intelligence": {
    ...defaultPolicy,
    executionClass: "web-research",
  },
};

const envNameByFlowKey: Record<LangflowFlowKey, string> = {
  "bidagent.opportunity-qualifier": "LANGFLOW_FLOW_BIDAGENT_OPPORTUNITY_QUALIFIER",
  "bidagent.solicitation-reader": "LANGFLOW_FLOW_BIDAGENT_SOLICITATION_READER",
  "bidagent.proposal-agent": "LANGFLOW_FLOW_BIDAGENT_PROPOSAL_AGENT",
  "comp-crm.company-research": "LANGFLOW_FLOW_COMP_CRM_COMPANY_RESEARCH",
  "comp-crm.lead-enrichment": "LANGFLOW_FLOW_COMP_CRM_LEAD_ENRICHMENT",
  "comp-crm.opportunity-scoring": "LANGFLOW_FLOW_COMP_CRM_OPPORTUNITY_SCORING",
  "labsnet.test-classifier": "LANGFLOW_FLOW_LABSNET_TEST_CLASSIFIER",
  "labsnet.lab-router": "LANGFLOW_FLOW_LABSNET_LAB_ROUTER",
  "labsnet.rfq-generator": "LANGFLOW_FLOW_LABSNET_RFQ_GENERATOR",
  "propertygy.listing-enrichment": "LANGFLOW_FLOW_PROPERTYGY_LISTING_ENRICHMENT",
  "propertygy.buyer-agent": "LANGFLOW_FLOW_PROPERTYGY_BUYER_AGENT",
  "receptionos.call-reasoning": "LANGFLOW_FLOW_RECEPTIONOS_CALL_REASONING",
  "receptionos.tool-router": "LANGFLOW_FLOW_RECEPTIONOS_TOOL_ROUTER",
  "shared.web-research": "LANGFLOW_FLOW_SHARED_WEB_RESEARCH",
  "shared.document-rag": "LANGFLOW_FLOW_SHARED_DOCUMENT_RAG",
  "shared.company-intelligence": "LANGFLOW_FLOW_SHARED_COMPANY_INTELLIGENCE",
};

export function isLangflowFlowKey(value: string): value is LangflowFlowKey {
  return (langflowFlowKeys as readonly string[]).includes(value);
}

export function getLangflowFlowPolicy(flowKey: LangflowFlowKey): LangflowFlowPolicy {
  return policyByFlowKey[flowKey];
}

export function getLangflowFlowId(flowKey: LangflowFlowKey): string | null {
  const value = process.env[envNameByFlowKey[flowKey]]?.trim();
  return value || null;
}
