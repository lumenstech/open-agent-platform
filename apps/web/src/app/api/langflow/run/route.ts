import { NextRequest } from "next/server";
import {
  getLangflowFlowId,
  getLangflowFlowPolicy,
  isLangflowFlowKey,
} from "@/lib/langflow/registry";

export const runtime = "edge";

function isEnabled() {
  return process.env.LANGFLOW_SHARED_RUNTIME_ENABLED === "true";
}

function isAuthorized(req: NextRequest) {
  const expected = process.env.LANGFLOW_SHARED_RUNTIME_TOKEN;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function POST(req: NextRequest) {
  if (!isEnabled()) {
    return Response.json({ error: "Langflow runtime disabled" }, { status: 403 });
  }

  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.flow !== "string" || !isLangflowFlowKey(body.flow)) {
    return Response.json({ error: "Unknown or missing flow" }, { status: 400 });
  }

  if ("tweaks" in body) {
    return Response.json({ error: "Caller-supplied tweaks are not allowed" }, { status: 400 });
  }

  const policy = getLangflowFlowPolicy(body.flow);
  const inputValue = typeof body.input_value === "string" ? body.input_value : "";
  if (inputValue.length > policy.maxInputChars) {
    return Response.json(
      { error: `Input exceeds ${policy.maxInputChars} characters for this flow` },
      { status: 413 },
    );
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (sessionId && !policy.allowSessionId) {
    return Response.json({ error: "Session IDs are not allowed for this flow" }, { status: 400 });
  }

  const flowId = getLangflowFlowId(body.flow);
  if (!flowId) {
    return Response.json({ error: "Flow is not configured" }, { status: 503 });
  }

  const baseUrl = process.env.LANGFLOW_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    return Response.json({ error: "Langflow base URL is not configured" }, { status: 503 });
  }

  const headers = new Headers({ "content-type": "application/json" });
  const apiKey = process.env.LANGFLOW_API_KEY;
  if (apiKey) headers.set("x-api-key", apiKey);

  const upstream = await fetch(`${baseUrl}/api/v1/run/${flowId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      input_value: inputValue,
      input_type: "chat",
      output_type: "chat",
      ...(sessionId ? { session_id: sessionId } : {}),
    }),
  });

  const contentType = upstream.headers.get("content-type") || "application/json";
  const responseBody = await upstream.text();

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}
