import { describe, expect, it } from "vitest";
import { authorizeSelfHostedMcp } from "./self-hosted-auth";

const req = (headers: Record<string, string> = {}) =>
  new Request("https://seo.example.com/mcp", { method: "POST", headers });

describe("authorizeSelfHostedMcp", () => {
  // The Phase 1 finding, as a test: an anonymous POST used to execute tools as
  // admin@localhost. A production deployment must now refuse it outright.
  it("refuses anonymous local_noauth requests in production", () => {
    const decision = authorizeSelfHostedMcp({
      request: req(),
      authMode: "local_noauth",
      mcpAuthToken: undefined,
      deploymentMode: undefined,
    });

    expect(decision).toMatchObject({ ok: false, status: 503 });
  });

  it("accepts the configured bearer token", () => {
    const decision = authorizeSelfHostedMcp({
      request: req({ Authorization: "Bearer s3cret-token" }),
      authMode: "local_noauth",
      mcpAuthToken: "s3cret-token",
      deploymentMode: "production",
    });

    expect(decision).toEqual({ ok: true, reason: "token" });
  });

  it("rejects a wrong token with 401 rather than falling through", () => {
    const decision = authorizeSelfHostedMcp({
      request: req({ Authorization: "Bearer wrong" }),
      authMode: "local_noauth",
      mcpAuthToken: "s3cret-token",
      deploymentMode: "development",
    });

    // Even in development, a configured token is enforced — otherwise setting
    // one would be silently optional.
    expect(decision).toMatchObject({ ok: false, status: 401 });
  });

  it("accepts the x-mcp-token header for clients that cannot set Authorization", () => {
    const decision = authorizeSelfHostedMcp({
      request: req({ "x-mcp-token": "s3cret-token" }),
      authMode: "local_noauth",
      mcpAuthToken: "s3cret-token",
      deploymentMode: "production",
    });

    expect(decision).toEqual({ ok: true, reason: "token" });
  });

  it("allows an unauthenticated developer machine that says so explicitly", () => {
    const decision = authorizeSelfHostedMcp({
      request: req(),
      authMode: "local_noauth",
      mcpAuthToken: undefined,
      deploymentMode: "development",
    });

    expect(decision).toEqual({ ok: true, reason: "development" });
  });

  it("defers to Cloudflare Access, which authenticated before the Worker ran", () => {
    const decision = authorizeSelfHostedMcp({
      request: req(),
      authMode: "cloudflare_access",
      mcpAuthToken: undefined,
      deploymentMode: "production",
    });

    expect(decision).toEqual({ ok: true, reason: "cloudflare_access" });
  });
});
