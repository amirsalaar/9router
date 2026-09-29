import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/usageDb.js", () => ({
  trackPendingRequest: vi.fn(),
  appendRequestLog: vi.fn(async () => {}),
  saveRequestDetail: vi.fn(async () => {}),
  saveRequestUsage: vi.fn(async () => {}),
}));

const { handleChatCore } = await import("../../open-sse/handlers/chatCore.js");
const { FORMATS } = await import("../../open-sse/translator/formats.js");

describe("Codex namespace validation through chat core", () => {
  it("returns a client error before dispatch when active namespace child names collide", async () => {
    const result = await handleChatCore({
      body: {
        model: "ollama/llama3",
        input: "Run JavaScript",
        stream: true,
        tools: [
          { type: "namespace", name: "first", tools: [{ type: "function", name: "js", parameters: { type: "object", properties: {} } }] },
          { type: "namespace", name: "second", tools: [{ type: "function", name: "js", parameters: { type: "object", properties: {} } }] },
        ],
      },
      modelInfo: { provider: "ollama", model: "llama3" },
      credentials: {},
      sourceFormatOverride: FORMATS.OPENAI_RESPONSES,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toContain('Ambiguous Codex tool "js"');
  });
});
