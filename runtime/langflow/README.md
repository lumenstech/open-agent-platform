# Shared Langflow Runtime

This directory adds Langflow as a shared internal agent runtime behind Open Agent Platform (OAP).

## Architecture

- OAP remains the operator/control plane and existing LangGraph runtime.
- Langflow runs separately and is never exposed directly to end users.
- Product applications call the OAP `/api/langflow/run` gateway with an allowlisted logical flow name.
- Flow UUIDs and Langflow credentials remain server-side environment configuration.
- Neon or each product database remains the system of record.
- n8n remains the deterministic automation/scheduling layer.
- Hard business rules stay in product code. Agents may research, classify, draft, score, or recommend, but they must not bypass deterministic eligibility, authorization, compliance, billing, or write gates.

## Managed flow contracts

`flow-contracts.json` is the source of truth for the first managed flows and their system instructions. The bootstrap uses Langflow's pinned `v1.12.0` Simple Agent starter as the graph base, injects the approved system contract, and creates or updates flows through Langflow's flow-management API.

The bootstrap intentionally does **not** write `.env` files or secrets:

```bash
cd runtime/langflow
LANGFLOW_BASE_URL=http://127.0.0.1:7860 \
LANGFLOW_API_KEY=... \
python3 bootstrap.py > flow-ids.json
```

The JSON written to stdout is the logical-flow-key to Langflow UUID mapping. Store those IDs in the corresponding `LANGFLOW_FLOW_*` server settings later.

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

`labsnet.lab-router` is advisory only. It must receive or call the authoritative deterministic LabsNet eligibility/routing result; it cannot independently qualify or select a laboratory.

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

## Product tool gateway

`/api/langflow/tool` is a separate read-only adapter boundary for product tools. It accepts only these allowlisted logical tools:

- `comp-crm.lookup-company`
- `labsnet.route-order`
- `propertygy.search-listings`
- `receptionos.lookup-context`
- `shared.retrieve-documents`

Each logical tool resolves to a full product-owned API/MCP adapter URL configured later through a server environment variable. The gateway forwards JSON input and optional server-side bearer credentials. Mutation tools are deliberately not present; CRM ingestion, bid submission, bookings, listing edits, and other writes remain behind their existing product APIs and authorization/audit gates.

Example internal call:

```json
{
  "tool": "labsnet.route-order",
  "input": {
    "order": "product-owned structured order payload"
  }
}
```

Use `Authorization: Bearer <LANGFLOW_TOOL_GATEWAY_TOKEN>` for calls into the tool gateway.

## Flow gateway request

```json
{
  "flow": "comp-crm.company-research",
  "input_value": "Research Acme Corp and return a structured account brief.",
  "session_id": "optional-stable-session-id"
}
```

Use `Authorization: Bearer <LANGFLOW_SHARED_RUNTIME_TOKEN>` for server-to-server calls. Caller-supplied Langflow component `tweaks` are rejected; graph configuration is managed by the control plane rather than per-request callers.

## Deployment

1. Provision a dedicated Postgres database for Langflow; do not reuse a product application schema.
2. Supply secret values through the runtime secret store when deployment is ready. Do not commit them.
3. Start `docker-compose.yml` on the Mac mini, VPS, or VM that will host the runtime.
4. Keep Langflow bound to `127.0.0.1:7860` or another private network interface. Put an authenticated reverse proxy in front only if the operator UI must be reached remotely.
5. Run `bootstrap.py` to create/update the managed flows and capture their UUID mapping.
6. Configure the corresponding `LANGFLOW_FLOW_*` values, `LANGFLOW_BASE_URL`, `LANGFLOW_API_KEY`, and gateway tokens, then enable `LANGFLOW_SHARED_RUNTIME_ENABLED=true`.
7. Configure product tool URLs only after each existing product API/MCP adapter has been verified.

## Safety boundary

Do not configure Langflow flows with unrestricted database credentials. Prefer read-only tools for research and explicit product APIs/MCP tools for mutations. Product mutation APIs must enforce their own authorization, validation, idempotency, provenance, and audit rules even when an agent eventually invokes them.
