import { NextRequest } from "next/server";
import {
  getLangflowToolConfig,
  isLangflowToolKey,
} from "@/lib/langflow/tool-registry";

export const runtime = "edge";

function isAuthorized(req: NextRequest) {
  const expected = process.env.LANGFLOW_TOOL_GATEWAY_TOKEN;
  if (!expected) return false;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.tool !== "string" || !isLangflowToolKey(body.tool)) {
    return Response.json({ error: "Unknown or missing tool" }, { status: 400 });
  }

  const config = getLangflowToolConfig(body.tool);
  if (!config.endpoint) {
    return Response.json({ error: "Tool is not configured" }, { status: 503 });
  }

  if (config.mutation) {
    return Response.json({ error: "Mutation tools are not enabled in this gateway" }, { status: 403 });
  }

  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
  });
  if (config.token) headers.set("authorization", `Bearer ${config.token}`);

  const upstream = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body.input ?? {}),
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
