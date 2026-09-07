import { NextRequest } from "next/server";
import {
  getLangflowFlowId,
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
      input_value: body.input_value ?? "",
      input_type: body.input_type ?? "chat",
      output_type: body.output_type ?? "chat",
      ...(body.session_id ? { session_id: body.session_id } : {}),
      ...(body.tweaks ? { tweaks: body.tweaks } : {}),
    }),
  });

  const contentType = upstream.headers.get("content-type") || "application/json";
  const responseBody = await upstream.text();

  return new Response(responseBody, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });
}
