#!/usr/bin/env node
// ============================================================
// Lens MCP Server
// - Stdio MCP transport for Claude Code / VS Code
// - HTTP listener on port 4848 for Chrome extension to push data
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import type { RAFAnnotation, AnnotationSession } from "../shared/raf-schema";

const PORT = parseInt(process.env.LENS_MCP_PORT || "4848");

// ── In-memory store ────────────────────────────
const sessions = new Map<string, AnnotationSession>();
const sseClients: ServerResponse[] = [];

// ── Annotation helpers ─────────────────────────

function getPendingAnnotations(projectSlug?: string): RAFAnnotation[] {
  const pending: RAFAnnotation[] = [];
  for (const session of sessions.values()) {
    if (projectSlug && session.project?.slug !== projectSlug) continue;
    for (const ann of session.annotations) {
      if (ann.status === "pending") pending.push(ann);
    }
  }
  return pending;
}

function findAnnotation(id: string) {
  for (const session of sessions.values()) {
    const idx = session.annotations.findIndex((a) => a.id === id);
    if (idx !== -1) return { session, annotation: session.annotations[idx], index: idx };
  }
  return null;
}

// ── MCP Server ─────────────────────────────────

const mcp = new McpServer({
  name: "lens",
  version: "1.0.0",
});

mcp.tool(
  "lens_get_pending",
  "Get all pending annotations. Includes element selectors, component trees, computed styles, and feedback comments.",
  { project_slug: z.string().optional().describe("Filter by project slug") },
  async ({ project_slug }) => ({
    content: [{ type: "text", text: JSON.stringify(getPendingAnnotations(project_slug), null, 2) }],
  }),
);

mcp.tool(
  "lens_get_session",
  "Get a specific annotation session by ID or by page URL.",
  {
    session_id: z.string().optional().describe("Session ID"),
    url: z.string().optional().describe("Page URL"),
  },
  async ({ session_id, url }) => {
    if (session_id) {
      const s = sessions.get(session_id);
      return { content: [{ type: "text", text: s ? JSON.stringify(s, null, 2) : "Session not found" }] };
    }
    if (url) {
      for (const s of sessions.values()) {
        if (s.url === url) return { content: [{ type: "text", text: JSON.stringify(s, null, 2) }] };
      }
    }
    return { content: [{ type: "text", text: "No session found" }] };
  },
);

mcp.tool(
  "lens_acknowledge",
  "Mark an annotation as acknowledged (you've seen it and will address it).",
  { annotation_id: z.string().describe("Annotation ID") },
  async ({ annotation_id }) => {
    const found = findAnnotation(annotation_id);
    if (!found) return { content: [{ type: "text", text: "Annotation not found" }] };
    found.annotation.status = "acknowledged";
    broadcastToExtension("annotation:updated", { annotation: found.annotation });
    return { content: [{ type: "text", text: JSON.stringify(found.annotation, null, 2) }] };
  },
);

mcp.tool(
  "lens_resolve",
  "Mark an annotation as resolved with an optional message.",
  {
    annotation_id: z.string().describe("Annotation ID"),
    message: z.string().optional().describe("Resolution message"),
  },
  async ({ annotation_id, message }) => {
    const found = findAnnotation(annotation_id);
    if (!found) return { content: [{ type: "text", text: "Annotation not found" }] };
    found.annotation.status = "resolved";
    found.annotation.resolved_by = "claude_code";
    found.annotation.resolved_at = new Date().toISOString();
    if (message) {
      found.annotation.thread.push({
        id: `msg_${Date.now()}`,
        author: "claude_code",
        content: message,
        timestamp: Date.now(),
      });
    }
    broadcastToExtension("annotation:resolved", { annotation: found.annotation });
    return { content: [{ type: "text", text: JSON.stringify(found.annotation, null, 2) }] };
  },
);

mcp.tool(
  "lens_dismiss",
  "Dismiss an annotation (won't fix / not applicable).",
  { annotation_id: z.string().describe("Annotation ID") },
  async ({ annotation_id }) => {
    const found = findAnnotation(annotation_id);
    if (!found) return { content: [{ type: "text", text: "Annotation not found" }] };
    found.annotation.status = "dismissed";
    broadcastToExtension("annotation:updated", { annotation: found.annotation });
    return { content: [{ type: "text", text: "Dismissed" }] };
  },
);

mcp.tool(
  "lens_reply",
  "Add a reply to an annotation's thread.",
  {
    annotation_id: z.string().describe("Annotation ID"),
    message: z.string().describe("Reply message"),
  },
  async ({ annotation_id, message }) => {
    const found = findAnnotation(annotation_id);
    if (!found) return { content: [{ type: "text", text: "Annotation not found" }] };
    found.annotation.thread.push({
      id: `msg_${Date.now()}`,
      author: "claude_code",
      content: message,
      timestamp: Date.now(),
    });
    broadcastToExtension("annotation:reply", {
      annotation_id,
      message: { id: found.annotation.thread.at(-1)!.id, author: "claude_code", content: message },
    });
    return { content: [{ type: "text", text: JSON.stringify(found.annotation.thread, null, 2) }] };
  },
);

// ── SSE broadcast to Chrome extension ──────────

function broadcastToExtension(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// ── HTTP listener (Chrome extension pushes here) ─

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}

const http = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const path = url.pathname;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE stream — Chrome extension connects here to receive AI responses
  if (path === "/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("event: connected\ndata: {}\n\n");
    sseClients.push(res);
    req.on("close", () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
    return;
  }

  if (path === "/sessions/update" && req.method === "POST") {
    const body = await readBody(req);
    try {
      const session = JSON.parse(body) as AnnotationSession;
      sessions.set(session.id, session);
      broadcastToExtension("session:updated", {
        session_id: session.id,
        annotation_count: session.annotations.length,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid session data" }));
    }
    return;
  }

  if (path === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", sessions: sessions.size, port: PORT }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

// ── Start ──────────────────────────────────────

async function main() {
  // Start HTTP listener for Chrome extension
  http.listen(PORT, () => {
    // Log to stderr so it doesn't corrupt stdio MCP transport
    console.error(`[Lens] HTTP listener on http://localhost:${PORT}`);
  });

  // Connect stdio MCP transport
  const transport = new StdioServerTransport();
  await mcp.connect(transport);
}

main().catch((err) => {
  console.error("[Lens] Fatal:", err);
  process.exit(1);
});
