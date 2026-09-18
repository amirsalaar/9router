// === AWS Signature Version 4 ===
// Protocol constants for utils/awsSigv4.js. These are fixed by the SigV4 spec, not by any
// provider, so they live here rather than in a registry entry.
export const AWS_SIGV4 = {
  algorithm: "AWS4-HMAC-SHA256",
  terminator: "aws4_request",
  keyPrefix: "AWS4",
  dateHeader: "x-amz-date",
  securityTokenHeader: "x-amz-security-token",
};

// === AWS credential resolution ===
// How a Bedrock connection supplies credentials. "static" carries the keys itself;
// "profile" defers to the local AWS config so `aws sso login` sessions are picked up.
export const AWS_CREDENTIAL_MODE = {
  STATIC: "static",
  PROFILE: "profile",
};

// Re-resolve a temporary credential this far before it actually expires, so an in-flight
// request cannot be signed with a key that dies mid-stream.
export const AWS_CREDENTIAL_REFRESH_LEAD_MS = 5 * 60 * 1000;

// Credentials with no declared expiry (long-lived IAM keys) still get re-checked
// occasionally so a rotated key is not cached for the life of the process.
export const AWS_STATIC_CREDENTIAL_TTL_MS = 60 * 60 * 1000;

// Package name for error messages only. The actual `import()` in shared/awsCredentials.js has
// to spell this out as a literal, or Next's output tracing cannot see it and omits the package
// from the standalone build — so do NOT refactor that call to use this constant.
export const AWS_CREDENTIAL_PROVIDERS_MODULE = "@aws-sdk/credential-providers";

// === Amazon Bedrock ===
export const BEDROCK = {
  service: "bedrock",
  defaultRegion: "us-east-1",
  // Anthropic models on Bedrock take the Anthropic Messages body verbatim, minus `model`
  // (which lives in the URL) and with this version pin in its place.
  anthropicVersion: "bedrock-2023-05-31",
  streamPath: "invoke-with-response-stream",
  invokePath: "invoke",
  // Bedrock frames streaming responses as AWS EventStream; each chunk payload is
  // {"bytes": "<base64 of one Anthropic streaming event>"}.
  chunkEventName: "chunk",
};

// === AWS EventStream framing ===
// Protocol-level bounds shared by every AWS EventStream consumer (Bedrock invoke-with-
// response-stream and Kiro's CodeWhisperer stream), so the two cannot drift apart.
export const AWS_EVENTSTREAM = {
  maxMessageBytes: 24 * 1024 * 1024,
  maxHeadersBytes: 128 * 1024,
};
