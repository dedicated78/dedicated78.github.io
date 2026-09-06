import { describe, expect, it } from "vitest";
import { testAccessGateResponse } from "./test-access-gate";

const PASSWORD = "test-deploy-password";

const req = (path = "/", headers: Record<string, string> = {}) =>
  new Request(`https://test.example.com${path}`, { headers });

const basic = (user: string, password: string) =>
  `Basic ${btoa(`${user}:${password}`)}`;

describe("testAccessGateResponse", () => {
  it("is completely inert when no password is configured", () => {
    // Normal deployments must be untouched by this shim.
    expect(testAccessGateResponse(req(), undefined)).toBeNull();
    expect(testAccessGateResponse(req(), "   ")).toBeNull();
  });

  it("challenges an anonymous request once enabled", () => {
    const response = testAccessGateResponse(req(), PASSWORD);
    expect(response?.status).toBe(401);
    expect(response?.headers.get("WWW-Authenticate")).toContain("Basic");
    expect(response?.headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("lets the correct password through regardless of username", () => {
    expect(
      testAccessGateResponse(
        req("/", { Authorization: basic("anyone", PASSWORD) }),
        PASSWORD,
      ),
    ).toBeNull();
  });

  it("rejects a wrong password", () => {
    expect(
      testAccessGateResponse(
        req("/", { Authorization: basic("admin", "wrong") }),
        PASSWORD,
      )?.status,
    ).toBe(401);
  });

  it("gates /mcp like everything else", () => {
    // Belt and braces: /mcp has its own token check, but an unauthenticated
    // caller must not even reach it on a public test deployment.
    expect(testAccessGateResponse(req("/mcp"), PASSWORD)?.status).toBe(401);
  });

  it("leaves /api/health reachable for the platform's probe", () => {
    expect(testAccessGateResponse(req("/api/health"), PASSWORD)).toBeNull();
  });

  it("ignores a non-Basic Authorization header", () => {
    // An MCP bearer token must not accidentally satisfy the site gate.
    expect(
      testAccessGateResponse(
        req("/", { Authorization: `Bearer ${PASSWORD}` }),
        PASSWORD,
      )?.status,
    ).toBe(401);
  });
});
