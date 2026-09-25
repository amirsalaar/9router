import { DefaultExecutor } from "./default.js";
import { resolveOpenAICompatibleApiType } from "../services/provider.js";

// The v1 surface accepts only api-version=preview; a dated version
// (2024-10-01-preview, 2025-04-01-preview) answers 400 "API version not supported".
const RESPONSES_API_VERSION = "preview";

/**
 * Resolve the upstream target for an azure connection. Single source for the URL
 * rules, shared by the executor and the connection validate/test probes so a
 * green "Test" can never mean a different endpoint than the router will call.
 *
 * Chat Completions puts the deployment in the path; the v1 Responses API is
 * resource-level and takes the deployment as `model` in the body instead. The
 * per-deployment path rejects function tools combined with reasoning_effort on
 * reasoning models (gpt-6-luna and friends), which is what Codex always sends.
 *
 * @param {object} psd - connection providerSpecificData
 * @param {string|null} model - requested model, used when no deployment is pinned
 * @returns {{ url: string, deployment: string, responses: boolean }}
 */
export function resolveAzureTarget(psd = {}, model = null) {
  const endpoint = (psd?.azureEndpoint || process.env.AZURE_ENDPOINT || "https://api.openai.com")
    .replace(/\/$/, "");
  const deployment = psd?.deployment || model || process.env.AZURE_DEPLOYMENT || "gpt-4";
  const responses = resolveOpenAICompatibleApiType("azure", { providerSpecificData: psd }) === "responses";

  if (responses) {
    return { url: `${endpoint}/openai/v1/responses?api-version=${RESPONSES_API_VERSION}`, deployment, responses };
  }

  const apiVersion = psd?.apiVersion || process.env.AZURE_API_VERSION || "2024-10-01-preview";
  return {
    url: `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    deployment,
    responses,
  };
}

export class AzureExecutor extends DefaultExecutor {
  constructor() {
    super("azure");
  }

  buildUrl(model, stream, urlIndex = 0, credentials = null) {
    return resolveAzureTarget(credentials?.providerSpecificData, model).url;
  }

  buildHeaders(credentials, stream = true) {
    const headers = {
      "Content-Type": "application/json",
      ...this.config.headers
    };

    const apiKey = credentials?.apiKey
      || credentials?.accessToken
      || process.env.OPENAI_API_KEY;

    if (apiKey) {
      headers["api-key"] = apiKey;
    }

    const organization = credentials?.providerSpecificData?.organization
      || process.env.AZURE_ORGANIZATION;

    if (organization) {
      headers["OpenAI-Organization"] = organization;
    }

    if (stream) {
      headers["Accept"] = "text/event-stream";
    }

    return headers;
  }

  transformRequest(model, body, stream, credentials) {
    const target = resolveAzureTarget(credentials?.providerSpecificData, model);
    // On the v1 path the deployment name moves from the URL into the body, so the
    // same connection resolves to the same deployment whichever apiType it is set to.
    return target.responses ? { ...body, model: target.deployment } : body;
  }
}
