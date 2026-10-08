import { describe, it, expect } from "vitest";
import { openaiResponsesToOpenAIRequest } from "../../open-sse/translator/request/openai-responses.js";
import {
  convertResponsesApiFormat,
  extractResponsesToolOutputImages,
} from "../../open-sse/translator/formats/responsesApi.js";

describe("Responses API tool output image extraction", () => {
  it("extracts images from stringified input_image JSON", () => {
    const rawOutput = JSON.stringify([
      { type: "input_image", image_url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg" },
    ]);
    const res = extractResponsesToolOutputImages(rawOutput, "view_image");
    expect(res.content).toBe("[image: view_image result]");
    expect(res.images).toEqual([
      {
        type: "image_url",
        image_url: {
          url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg",
          detail: "auto",
        },
      },
    ]);
  });

  it("extracts images from mixed text and image array", () => {
    const rawOutput = [
      { type: "text", text: "Screenshot captured successfully" },
      { type: "input_image", image_url: "data:image/png;base64,abc" },
    ];
    const res = extractResponsesToolOutputImages(rawOutput, "take_screenshot");
    expect(res.content).toBe("Screenshot captured successfully");
    expect(res.images).toHaveLength(1);
    expect(res.images[0].image_url.url).toBe("data:image/png;base64,abc");
  });

  it("leaves standard text output untouched without images", () => {
    const rawOutput = "file1.txt\nfile2.txt";
    const res = extractResponsesToolOutputImages(rawOutput, "list_dir");
    expect(res.content).toBe("file1.txt\nfile2.txt");
    expect(res.images).toEqual([]);
  });

  it("translates Responses API function_call_output with input_image in openaiResponsesToOpenAIRequest", () => {
    const body = {
      model: "us.xai.grok-4.7",
      input: [
        { type: "message", role: "user", content: [{ type: "input_text", text: "inspect this" }] },
        {
          type: "function_call",
          call_id: "call_img_1",
          name: "view_image",
          arguments: '{"path":"img.png"}',
        },
        {
          type: "function_call_output",
          call_id: "call_img_1",
          output: JSON.stringify([
            { type: "input_image", image_url: "data:image/png;base64,testdata" },
          ]),
        },
      ],
    };

    const out = openaiResponsesToOpenAIRequest("us.xai.grok-4.7", body, false, null);
    expect(out.messages).toHaveLength(4);

    expect(out.messages[0]).toEqual({
      role: "user",
      content: [{ type: "text", text: "inspect this" }],
    });

    expect(out.messages[1].role).toBe("assistant");
    expect(out.messages[1].tool_calls).toHaveLength(1);
    expect(out.messages[1].tool_calls[0].id).toBe("call_img_1");
    expect(out.messages[1].tool_calls[0].function.name).toBe("view_image");

    expect(out.messages[2]).toEqual({
      role: "tool",
      tool_call_id: "call_img_1",
      content: "[image: view_image result]",
    });

    expect(out.messages[3]).toEqual({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: "data:image/png;base64,testdata",
            detail: "auto",
          },
        },
      ],
    });
  });

  it("translates multi-tool turn with both image and non-image tools", () => {
    const body = {
      model: "us.xai.grok-4.7",
      input: [
        {
          type: "function_call",
          call_id: "call_img",
          name: "view_image",
          arguments: '{"path":"img.png"}',
        },
        {
          type: "function_call",
          call_id: "call_txt",
          name: "read_file",
          arguments: '{"path":"note.txt"}',
        },
        {
          type: "function_call_output",
          call_id: "call_img",
          output: JSON.stringify([{ type: "input_image", image_url: "data:image/png;base64,imgdata" }]),
        },
        {
          type: "function_call_output",
          call_id: "call_txt",
          output: "note content",
        },
      ],
    };

    const out = openaiResponsesToOpenAIRequest("us.xai.grok-4.7", body, false, null);
    expect(out.messages[0].role).toBe("assistant");
    expect(out.messages[0].tool_calls).toHaveLength(2);

    expect(out.messages[1]).toEqual({
      role: "tool",
      tool_call_id: "call_img",
      content: "[image: view_image result]",
    });
    expect(out.messages[2]).toEqual({
      role: "user",
      content: [{ type: "image_url", image_url: { url: "data:image/png;base64,imgdata", detail: "auto" } }],
    });
    expect(out.messages[3]).toEqual({
      role: "tool",
      tool_call_id: "call_txt",
      content: "note content",
    });
  });

  it("translates Responses API function_call_output with input_image in convertResponsesApiFormat", () => {
    const body = {
      model: "us.xai.grok-4.7",
      input: [
        {
          type: "function_call",
          call_id: "call_view",
          name: "view_image",
          arguments: '{"path":"diagram.png"}',
        },
        {
          type: "function_call_output",
          call_id: "call_view",
          output: JSON.stringify([
            { type: "input_image", image_url: "data:image/png;base64,diagrambase64" },
          ]),
        },
      ],
    };

    const out = convertResponsesApiFormat(body);
    expect(out.messages).toHaveLength(3);
    expect(out.messages[0].role).toBe("assistant");
    expect(out.messages[1]).toEqual({
      role: "tool",
      tool_call_id: "call_view",
      content: "[image: view_image result]",
    });
    expect(out.messages[2]).toEqual({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: "data:image/png;base64,diagrambase64",
            detail: "auto",
          },
        },
      ],
    });
  });
});

describe("Desktop session fail_full translation", () => {
  it("translates fail_full.json tool image results into user messages", async () => {
    const fs = await import("node:fs");
    if (!fs.existsSync("/tmp/grok-bisect/fail_full.json")) return;

    const { openaiToOpenAIResponsesRequest } = await import("../../open-sse/translator/request/openai-responses.js");
    const failFull = JSON.parse(fs.readFileSync("/tmp/grok-bisect/fail_full.json", "utf8"));
    const respReq = openaiToOpenAIResponsesRequest("us.xai.grok-4.7", failFull, true, null);
    const chatReq = openaiResponsesToOpenAIRequest("us.xai.grok-4.7", respReq, true, null);

    const imageUserMsgs = chatReq.messages.filter(
      (m) => m.role === "user" && Array.isArray(m.content) && m.content.some((c) => c.type === "image_url")
    );
    expect(imageUserMsgs.length).toBe(2);

    const imageToolMsgs = chatReq.messages.filter(
      (m) => m.role === "tool" && String(m.content).startsWith("[image:")
    );
    expect(imageToolMsgs.length).toBe(2);
  });
});
