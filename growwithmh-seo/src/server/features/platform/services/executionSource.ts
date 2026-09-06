/**
 * Where the current provider call originated: "app", "mcp", "workflow",
 * "cron" or "system".
 *
 * The cost dashboard needs this to answer "what is spending my money" — a
 * runaway agent looks completely different from a user clicking around, and
 * without it every row reads the same. It is ambient rather than threaded
 * through every signature because the metering seam sits many layers below the
 * entry points that know the answer.
 *
 * `AsyncLocalStorage` is not available in the Workers runtime by default, so
 * this is a plain module-scoped value scoped by {@link withExecutionSource}.
 * That is sound here for the same reason the isolate model makes it sound: a
 * Worker isolate handles one request's synchronous continuation at a time, and
 * the value is restored in `finally`. Concurrent requests inside one isolate
 * can still interleave across awaits, so treat this as attribution that is
 * right in the common case, not an audit-grade guarantee — which is why it is
 * a reporting dimension and never an authorization input.
 */
import type { ApiUsageExecutionSource } from "@/server/features/platform/repositories/ApiUsageRepository";

let current: ApiUsageExecutionSource = "app";

export function currentExecutionSource(): ApiUsageExecutionSource {
  return current;
}

export async function withExecutionSource<T>(
  source: ApiUsageExecutionSource,
  run: () => Promise<T>,
): Promise<T> {
  const previous = current;
  current = source;
  try {
    return await run();
  } finally {
    current = previous;
  }
}

/** Test seam. */
export function __setExecutionSource(source: ApiUsageExecutionSource): void {
  current = source;
}
