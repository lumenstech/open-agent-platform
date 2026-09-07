export const langflowToolKeys = [
  "comp-crm.lookup-company",
  "labsnet.route-order",
  "propertygy.search-listings",
  "receptionos.lookup-context",
  "shared.retrieve-documents",
] as const;

export type LangflowToolKey = (typeof langflowToolKeys)[number];

type ToolConfig = {
  endpointEnv: string;
  tokenEnv: string;
  mutation: false;
  description: string;
};

const toolConfig: Record<LangflowToolKey, ToolConfig> = {
  "comp-crm.lookup-company": {
    endpointEnv: "LANGFLOW_TOOL_COMP_CRM_LOOKUP_COMPANY_URL",
    tokenEnv: "LANGFLOW_TOOL_COMP_CRM_TOKEN",
    mutation: false,
    description: "Read canonical CRM/company context through the Comp API.",
  },
  "labsnet.route-order": {
    endpointEnv: "LANGFLOW_TOOL_LABSNET_ROUTE_ORDER_URL",
    tokenEnv: "LANGFLOW_TOOL_LABSNET_TOKEN",
    mutation: false,
    description: "Call the authoritative deterministic LabsNet routing engine.",
  },
  "propertygy.search-listings": {
    endpointEnv: "LANGFLOW_TOOL_PROPERTYGY_SEARCH_LISTINGS_URL",
    tokenEnv: "LANGFLOW_TOOL_PROPERTYGY_TOKEN",
    mutation: false,
    description: "Search authoritative PropertyGY listings without modifying them.",
  },
  "receptionos.lookup-context": {
    endpointEnv: "LANGFLOW_TOOL_RECEPTIONOS_LOOKUP_CONTEXT_URL",
    tokenEnv: "LANGFLOW_TOOL_RECEPTIONOS_TOKEN",
    mutation: false,
    description: "Read tenant/business context needed for call reasoning.",
  },
  "shared.retrieve-documents": {
    endpointEnv: "LANGFLOW_TOOL_SHARED_RETRIEVE_DOCUMENTS_URL",
    tokenEnv: "LANGFLOW_TOOL_SHARED_RETRIEVE_DOCUMENTS_TOKEN",
    mutation: false,
    description: "Retrieve grounded document chunks from the approved retrieval service.",
  },
};

export function isLangflowToolKey(value: string): value is LangflowToolKey {
  return (langflowToolKeys as readonly string[]).includes(value);
}

export function getLangflowToolConfig(tool: LangflowToolKey) {
  const config = toolConfig[tool];
  return {
    ...config,
    endpoint: process.env[config.endpointEnv]?.trim() || null,
    token: process.env[config.tokenEnv]?.trim() || null,
  };
}
