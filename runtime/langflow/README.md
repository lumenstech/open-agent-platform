# Shared Langflow Runtime

This directory adds Langflow as a shared internal agent runtime behind Open Agent Platform (OAP).

## Architecture

- OAP remains the control plane for operators and LangGraph agents.
- Langflow runs separately and is never exposed directly to end users.
- Product applications call the OAP `/api/langflow/run` gateway with an allowlisted logical flow name.
- Flow UUIDs and Langflow credentials remain server-side environment configuration.
- Neon or each product database remains the system of record.
- n8n remains the deterministic automation/scheduling layer.
- Hard business rules stay in product code. Agents may research, classify, draft, score, or recommend, but they must not bypass deterministic eligibility, authorization, compliance, billing, or write gates.

## Initial logical flows

### BidAgent
- `bidagent.opportunity-qualifier`
- `bidagent.solicitation-reader`
- `bidagent.proposal-agent`

### Comp CRM
- `comp-crm.company-research`
- `comp-crm.lead-enrichment`
- `comp-crm.opportunity-scoring`

### LabsNet / 516Labs
- `labsnet.test-classifier`
- `labsnet.lab-router`
- `labsnet.rfq-generator`

`labsnet.lab-router` is advisory only. The existing deterministic LabsNet eligibility/routing engine remains authoritative and must be called for any real routing decision.

### PropertyGY
- `propertygy.listing-enrichment`
- `propertygy.buyer-agent`

### ReceptionOS
- `receptionos.call-reasoning`
- `receptionos.tool-router`

### Shared
- `shared.web-research`
- `shared.document-rag`
- `shared.company-intelligence`

## Deployment

1. Provision a Postgres database for Langflow. This can be a dedicated Neon database/branch; do not reuse a product application schema.
2. Copy `.env.example` to a private environment file or secret store and fill values there. Do not commit secrets.
3. Start `docker-compose.yml` on the Mac mini, VPS, or VM that will host the runtime.
4. Keep Langflow bound to `127.0.0.1:7860` or another private network interface. Put Cloudflare Access/Tunnel or another authenticated reverse proxy in front only if an operator UI must be reached remotely.
5. Create/import the approved flows in Langflow and place their UUIDs into the corresponding `LANGFLOW_FLOW_*` variables.
6. Set `LANGFLOW_BASE_URL`, `LANGFLOW_API_KEY`, `LANGFLOW_SHARED_RUNTIME_TOKEN`, then enable `LANGFLOW_SHARED_RUNTIME_ENABLED=true` in the OAP server environment.
7. Product backends call `/api/langflow/run`; browsers should not receive the shared runtime token.

## Gateway request

```json
{
  "flow": "comp-crm.company-research",
  "input_value": "Research Acme Corp and return a structured account brief.",
  "session_id": "optional-stable-session-id",
  "tweaks": {}
}
```

Use `Authorization: Bearer <LANGFLOW_SHARED_RUNTIME_TOKEN>` for server-to-server calls.

## Safety boundary

Do not configure Langflow flows with unrestricted database credentials. Prefer read-only tools for research and explicit product APIs/MCP tools for mutations. Mutation tools should enforce their own authorization, validation, idempotency, provenance, and audit rules even when invoked by an agent.
