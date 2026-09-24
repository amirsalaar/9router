import { beforeEach, describe, expect, it, vi } from "vitest";

// execute() fetches through proxyAwareFetch; capture what it actually sends to AWS.
vi.mock("../../open-sse/utils/proxyFetch.js", async (importOriginal) => ({
  ...(await importOriginal()),
  proxyAwareFetch: vi.fn(),
}));

import { proxyAwareFetch } from "../../open-sse/utils/proxyFetch.js";
import { BedrockExecutor } from "../../open-sse/executors/bedrock.js";

describe("BedrockExecutor.execute request-log headers", () => {
  beforeEach(() => proxyAwareFetch.mockReset());

  it("sends real credentials to AWS but returns redacted ones for the request logger", async () => {
    proxyAwareFetch.mockResolvedValue(new Response("{}", { status: 200 }));
    const executor = new BedrockExecutor("bedrock");

    const result = await executor.execute({
      model: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
      body: { messages: [{ role: "user", content: "hi" }], max_tokens: 16 },
      stream: false,
      credentials: {
        apiKey: "secret-access-key",
        providerSpecificData: { accessKeyId: "ASIAEXAMPLE", sessionToken: "FwoGZXsession-token", region: "us-east-1" },
      },
    });

    const sent = proxyAwareFetch.mock.calls[0][1].headers;
    expect(sent["x-amz-security-token"]).toBe("FwoGZXsession-token");
    const signature = sent.Authorization.match(/Signature=([0-9a-f]{64})/)?.[1];
    expect(signature).toBeTruthy();

    const logged = result.headers;
    expect(logged["x-amz-security-token"]).toBe("<redacted>");
    expect(logged.Authorization).toContain("Signature=<redacted>");
    expect(logged.Authorization).not.toContain(signature);
    // The non-secret parts stay, so a SignatureDoesNotMatch can still be debugged from the log.
    expect(logged.Authorization).toContain("Credential=ASIAEXAMPLE/");
    expect(logged.Authorization).toContain("SignedHeaders=");
  });
});
