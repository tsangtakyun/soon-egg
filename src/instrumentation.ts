import type { Instrumentation } from "next";

export async function register() {}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : undefined;
  console.error(JSON.stringify({
    event: "request_error",
    reference: crypto.randomUUID(),
    message: normalized.message,
    digest,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    timestamp: new Date().toISOString(),
  }));
};
