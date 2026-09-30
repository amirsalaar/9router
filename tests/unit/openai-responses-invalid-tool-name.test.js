import { CodexExecutor } from "../../open-sse/executors/codex.js";
import { describe, it, expect } from "vitest";
import {
  openaiToOpenAIResponsesRequest,
  openaiResponsesToOpenAIRequest,
} from "../../open-sse/translator/request/openai-responses.js";
import { restoreToolNames } from "../../open-sse/utils/opencodeFingerprint.js";

const OPENAI_TOOL_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;

describe("OpenAI Responses tool name sanitization", () => {
  it("sanitizes dot-containing function_call names in existing body.input history", () => {
    const body = {
      model: "gpt-6-luna",
      input: [
        {
          type: "function_call",
          id: "fc_call_pTYBoxTw62azzjt8zCFLvn7f",
          name: "mcp__codex_app.get_worktree_creation_status",
          arguments: "{}",
          call_id: "call_pTYBoxTw62azzjt8zCFLvn7f",
        },
        {
          type: "function_call_output",
          call_id: "call_pTYBoxTw62azzjt8zCFLvn7f",
          output: "unsupported call",
        },
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "continue" }],
        },
      ],
      tools: [
        {
          type: "function",
          name: "mcp__codex_app__get_worktree_creation_status",
          description: "Check creation status",
          parameters: { type: "object", properties: {} },
        },
      ],
    };

    const out = openaiToOpenAIResponsesRequest("gpt-6-luna", body, true, null);
    const fc = out.input.find((item) => item.type === "function_call");
    expect(fc).toBeDefined();
    expect(fc.name).toMatch(OPENAI_TOOL_NAME_REGEX);
    expect(fc.name).toBe("mcp__codex_app_get_worktree_creation_status");
  });

  it("sanitizes dot-containing tool_calls when converting messages to input", () => {
    const body = {
      model: "gpt-6-luna",
      messages: [
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_123",
              type: "function",
              function: {
                name: "mcp__codex_app.get_worktree_creation_status",
                arguments: "{}",
              },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: "call_123",
          content: "result",
        },
      ],
    };

    const out = openaiToOpenAIResponsesRequest("gpt-6-luna", body, true, null);
    const fc = out.input.find((item) => item.type === "function_call");
    expect(fc).toBeDefined();
    expect(fc.name).toMatch(OPENAI_TOOL_NAME_REGEX);
    expect(fc.name).toBe("mcp__codex_app_get_worktree_creation_status");
  });

  it("sanitizes dot-containing tool declarations and populates _toolNameMap for restoration", () => {
    const body = {
      model: "gpt-6-luna",
      messages: [{ role: "user", content: "test" }],
      tools: [
        {
          type: "function",
          function: {
            name: "mcp__node_repl.js",
            description: "Execute js",
            parameters: { type: "object", properties: {} },
          },
        },
      ],
    };

    const out = openaiToOpenAIResponsesRequest("gpt-6-luna", body, true, null);
    expect(out.tools[0].name).toMatch(OPENAI_TOOL_NAME_REGEX);
    expect(out.tools[0].name).toBe("mcp__node_repl_js");
    expect(out._toolNameMap?.get("mcp__node_repl_js")).toBe("mcp__node_repl.js");

    // Restoring upstream tool call mapping
    const restored = restoreToolNames(
      { output: [{ type: "function_call", name: "mcp__node_repl_js" }] },
      out._toolNameMap
    );
    expect(restored.output[0].name).toBe("mcp__node_repl.js");
  });

  it("does not introduce dots when expanding namespaced tools in openaiResponsesToOpenAIRequest", () => {
    const body = {
      input: "Run status check",
      tools: [
        {
          type: "namespace",
          name: "mcp__codex_app",
          tools: [
            {
              type: "function",
              name: "get_worktree_creation_status",
              parameters: { type: "object", properties: {} },
            },
          ],
        },
      ],
    };

    const out = openaiResponsesToOpenAIRequest("gpt-6-luna", body, true, null);
    expect(out.tools[0].function.name).toBe("mcp__codex_app__get_worktree_creation_status");
    expect(out.tools[0].function.name).toMatch(OPENAI_TOOL_NAME_REGEX);
    // Should NOT map back to a dotted name
    if (out._toolNameMap) {
      for (const [alias, original] of out._toolNameMap) {
        expect(alias).toMatch(OPENAI_TOOL_NAME_REGEX);
        expect(original).toMatch(OPENAI_TOOL_NAME_REGEX);
      }
    }
  });

  it("rewrites legacy dot-separated tool names in history during openaiResponsesToOpenAIRequest", () => {
    const body = {
      input: [
        {
          type: "function_call",
          call_id: "call_old",
          name: "mcp__codex_app.get_worktree_creation_status",
          arguments: "{}",
        },
        {
          type: "function_call_output",
          call_id: "call_old",
          output: "ok",
        },
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "next" }],
        },
      ],
      tools: [
        {
          type: "namespace",
          name: "mcp__codex_app",
          tools: [
            {
              type: "function",
              name: "get_worktree_creation_status",
              parameters: { type: "object", properties: {} },
            },
          ],
        },
      ],
    };

    const out = openaiResponsesToOpenAIRequest("gpt-6-luna", body, true, null);
    const assistantMsg = out.messages.find((m) => m.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.tool_calls[0].function.name).toBe(
      "mcp__codex_app__get_worktree_creation_status"
    );
    expect(assistantMsg.tool_calls[0].function.name).toMatch(OPENAI_TOOL_NAME_REGEX);
  });
  it("sanitizes dot-containing input and tool names in CodexExecutor transformRequest", () => {
    const executor = new CodexExecutor();
    const body = {
      model: "gpt-6-luna",
      input: [
        {
          type: "function_call",
          call_id: "call_dotted",
          name: "mcp__codex_app.get_worktree_creation_status",
          arguments: "{}",
        },
        {
          type: "function_call_output",
          call_id: "call_dotted",
          output: "ok",
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "mcp__codex_app.create_worktree",
            parameters: { type: "object", properties: {} },
          },
        },
        {
          type: "namespace",
          name: "mcp__ns",
          tools: [
            {
              type: "function",
              name: "sub.tool",
              parameters: { type: "object", properties: {} },
            },
          ],
        },
      ],
    };

    executor.transformRequest("gpt-6-luna", body, true, {
      connectionId: "test-conn",
      providerSpecificData: {},
    });

    const fc = body.input.find((item) => item.type === "function_call");
    expect(fc.name).toMatch(OPENAI_TOOL_NAME_REGEX);
    expect(fc.name).toBe("mcp__codex_app_get_worktree_creation_status");

    // gpt-6-luna is a responsesLite model, so tools are moved to input[0] (additional_tools)
    const addTools = body.input.find((i) => i.type === "additional_tools");
    expect(addTools).toBeDefined();
    const fnTool = addTools.tools.find((t) => t.type === "function");
    expect(fnTool.name).toMatch(OPENAI_TOOL_NAME_REGEX);
    expect(fnTool.name).toBe("mcp__codex_app_create_worktree");

    const nsTool = addTools.tools.find((t) => t.type === "namespace");
    expect(nsTool.tools[0].name).toMatch(OPENAI_TOOL_NAME_REGEX);
    expect(nsTool.tools[0].name).toBe("sub_tool");
  });
});
