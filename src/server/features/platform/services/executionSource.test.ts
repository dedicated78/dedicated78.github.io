import { afterEach, describe, expect, it } from "vitest";
import {
  currentExecutionSource,
  withExecutionSource,
  __setExecutionSource,
} from "./executionSource";

afterEach(() => __setExecutionSource("app"));

describe("withExecutionSource", () => {
  it("defaults to app", () => {
    expect(currentExecutionSource()).toBe("app");
  });

  it("applies the source for the duration of the call", async () => {
    let seen: string | undefined;
    await withExecutionSource("mcp", async () => {
      seen = currentExecutionSource();
    });

    expect(seen).toBe("mcp");
    expect(currentExecutionSource()).toBe("app");
  });

  it("restores the previous source when the call throws", async () => {
    // Otherwise one failed MCP request would mis-attribute every later call in
    // the isolate to "mcp".
    await expect(
      withExecutionSource("mcp", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(currentExecutionSource()).toBe("app");
  });

  it("nests without losing the outer source", async () => {
    let inner: string | undefined;
    let afterInner: string | undefined;
    await withExecutionSource("workflow", async () => {
      await withExecutionSource("mcp", async () => {
        inner = currentExecutionSource();
      });
      afterInner = currentExecutionSource();
    });

    expect(inner).toBe("mcp");
    expect(afterInner).toBe("workflow");
  });
});
