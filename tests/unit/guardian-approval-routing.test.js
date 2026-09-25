import { describe, expect, it } from "vitest";

import { getProviderModels } from "../../open-sse/config/providerModels.js";
import { getModelInfoCore } from "../../open-sse/services/model.js";

// Codex CLI's automatic approval (Guardian) review runs in its own child thread and sends the
// bare model id "gpt-5.6-luna" to /v1/responses. Prefix inference matched /^gpt-/ → "openai",
// and a setup with no openai connection answered "No active credentials for provider: openai".
// Copilot-only ids start at 5.5; openai's own gpt-5 line tops out at 5.4 and must stay on openai.
describe("Codex Guardian approval model routing", () => {
  const infer = async (model) => (await getModelInfoCore(model, {})).provider;

  it.each([
    "gpt-5.6-luna",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.5",
    "gpt-6-astra",
    "gpt-6-sol",
  ])("routes the Copilot-only id %s to github", async (model) => {
    expect(await infer(model)).toBe("github");
  });

  it.each([
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.2",
    "gpt-5.1",
    "gpt-5",
    "gpt-5-mini",
    "gpt-4o",
    "gpt-4-turbo",
  ])("leaves the real openai id %s on openai", async (model) => {
    expect(await infer(model)).toBe("openai");
  });

  // Guards the boundary above: every id the openai catalog claims must still infer as openai,
  // so widening the Copilot pattern can never silently steal a real openai model.
  it("never steals a model the openai catalog actually serves", async () => {
    const stolen = [];
    for (const { id } of getProviderModels("openai")) {
      if ((await infer(id)) !== "openai") stolen.push(id);
    }
    expect(stolen).toEqual([]);
  });
});
