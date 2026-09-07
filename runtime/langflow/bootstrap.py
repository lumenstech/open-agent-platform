#!/usr/bin/env python3
"""Idempotently create or update approved Langflow flows.

This script intentionally does not write .env files. It reads LANGFLOW_BASE_URL and
LANGFLOW_API_KEY from the caller environment, creates/updates flows, and prints the
logical-key -> flow-id mapping for an operator or secret-management step to consume.
"""

from __future__ import annotations

import copy
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
CONTRACTS_PATH = ROOT / "flow-contracts.json"


def request_json(method: str, url: str, *, api_key: str | None = None, payload: Any = None) -> Any:
    headers = {"accept": "application/json"}
    data = None
    if api_key:
        headers["x-api-key"] = api_key
    if payload is not None:
        headers["content-type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: HTTP {exc.code}: {detail}") from exc


def load_contracts() -> dict[str, Any]:
    with CONTRACTS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def fetch_template(repository: str, tag: str, starter: str) -> dict[str, Any]:
    encoded = urllib.parse.quote(starter)
    url = (
        f"https://raw.githubusercontent.com/{repository}/{tag}/"
        f"src/backend/base/langflow/initial_setup/starter_projects/{encoded}"
    )
    with urllib.request.urlopen(url, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def set_agent_instructions(value: Any, prompt: str) -> int:
    """Recursively replace Agent instruction fields in a Langflow starter graph."""
    changed = 0
    if isinstance(value, dict):
        for key, child in value.items():
            if key in {"agent_instructions", "system_prompt", "system_message"} and isinstance(child, dict):
                if "value" in child and isinstance(child["value"], str):
                    child["value"] = prompt
                    changed += 1
            changed += set_agent_instructions(child, prompt)
    elif isinstance(value, list):
        for child in value:
            changed += set_agent_instructions(child, prompt)
    return changed


def normalize_template(template: dict[str, Any], contract: dict[str, Any]) -> dict[str, Any]:
    graph = copy.deepcopy(template)
    changed = set_agent_instructions(graph, contract["system_prompt"])
    if changed == 0:
        raise RuntimeError(
            "Starter graph did not expose a recognized instruction field; refusing to create an ungoverned flow"
        )

    data = graph.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("Starter graph is missing data")

    return {
        "name": contract["name"],
        "description": f"Managed shared runtime flow: {contract['key']}",
        "data": data,
        "is_component": False,
        "webhook": False,
        "endpoint_name": None,
        "tags": ["managed", "shared-runtime", contract["key"], contract["execution_class"]],
        "mcp_enabled": False,
    }


def list_flows(base_url: str, api_key: str | None) -> list[dict[str, Any]]:
    result = request_json("GET", f"{base_url}/api/v1/flows/", api_key=api_key)
    if isinstance(result, list):
        return result
    if isinstance(result, dict):
        for key in ("items", "flows", "data"):
            if isinstance(result.get(key), list):
                return result[key]
    raise RuntimeError("Unexpected response from Langflow flow list endpoint")


def main() -> int:
    base_url = os.environ.get("LANGFLOW_BASE_URL", "http://127.0.0.1:7860").rstrip("/")
    api_key = os.environ.get("LANGFLOW_API_KEY") or None
    contracts = load_contracts()
    template_meta = contracts["template"]
    template = fetch_template(
        template_meta["repository"],
        template_meta["tag"],
        template_meta["starter"],
    )

    existing = list_flows(base_url, api_key)
    by_name = {flow.get("name"): flow for flow in existing if isinstance(flow, dict)}
    mapping: dict[str, str] = {}

    for contract in contracts["flows"]:
        payload = normalize_template(template, contract)
        found = by_name.get(contract["name"])
        if found and found.get("id"):
            flow_id = str(found["id"])
            updated = request_json(
                "PATCH",
                f"{base_url}/api/v1/flows/{flow_id}",
                api_key=api_key,
                payload=payload,
            )
            mapping[contract["key"]] = str(updated.get("id", flow_id))
            print(f"updated {contract['key']} -> {mapping[contract['key']]}", file=sys.stderr)
        else:
            created = request_json(
                "POST",
                f"{base_url}/api/v1/flows/",
                api_key=api_key,
                payload=payload,
            )
            flow_id = created.get("id") if isinstance(created, dict) else None
            if not flow_id:
                raise RuntimeError(f"Langflow did not return an id for {contract['key']}")
            mapping[contract["key"]] = str(flow_id)
            print(f"created {contract['key']} -> {flow_id}", file=sys.stderr)

    print(json.dumps(mapping, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
