import "server-only";

import { after } from "next/server";
import type { Message } from "@anthropic-ai/sdk/resources/messages/messages";
import { createEggAdmin } from "@/lib/creator-workspace";

type MediaMetadata = {
  imageCount?: number;
  imageBytes?: number;
  imageMimeTypes?: string[];
  audioSeconds?: number;
};

export function anthropicImageMetadata(images?: Array<{ mediaType: string; data: string }>): MediaMetadata {
  const values = images ?? [];
  return {
    imageCount: values.length,
    imageBytes: values.reduce((total, image) => total + Math.ceil(image.data.length * 0.75), 0),
    imageMimeTypes: values.map((image) => image.mediaType),
  };
}

type TrackingContext = {
  workspaceId: string;
  userId?: string | null;
  feature: string;
  operation: string;
  requestedModel: string;
  media?: MediaMetadata;
  maxAttemptsConfigured?: number;
  attempt?: number;
  benchmark?: {
    batchId: string;
    action: string;
    run: number;
  };
};

type UsageShape = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: {
    web_search_requests?: number;
  } | null;
};

const USD_TO_HKD_BUDGET_RATE = 8;
const PRICING_VERSION = "anthropic-sonnet-4.6-global-2026-10-06-hkd-fx8-v1";

function estimateAnthropicCost(model: string | null, usage: UsageShape) {
  if (!model?.includes("sonnet-4")) {
    return { amountHkd: null, webSearchAmountHkd: null, version: null };
  }
  const input = Number(usage.input_tokens ?? 0);
  const output = Number(usage.output_tokens ?? 0);
  const cacheWrite = Number(usage.cache_creation_input_tokens ?? 0);
  const cacheRead = Number(usage.cache_read_input_tokens ?? 0);
  const webSearchRequests = Number(usage.server_tool_use?.web_search_requests ?? 0);
  const tokenAmountUsd = (input * 3 + output * 15 + cacheWrite * 3.75 + cacheRead * 0.3) / 1_000_000;
  const webSearchAmountUsd = webSearchRequests * 0.01;
  return {
    amountHkd: (tokenAmountUsd + webSearchAmountUsd) * USD_TO_HKD_BUDGET_RATE,
    webSearchAmountHkd: webSearchAmountUsd * USD_TO_HKD_BUDGET_RATE,
    version: PRICING_VERSION,
  };
}

function safeErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown_error";
  const value = error as { status?: unknown; name?: unknown; code?: unknown };
  return String(value.code ?? value.status ?? value.name ?? "unknown_error").slice(0, 80);
}

async function upsertEvent(payload: Record<string, unknown>) {
  try {
    const admin = createEggAdmin();
    const { error } = await admin.from("egg_ai_usage_events").upsert(payload, { onConflict: "call_id" });
    if (error) console.warn("[ai usage] persistence unavailable", { code: error.code });
  } catch (error) {
    console.warn("[ai usage] persistence unavailable", { code: safeErrorCode(error) });
  }
}

export async function trackedAnthropicCall<T extends Message>(
  context: TrackingContext,
  call: () => Promise<T>,
): Promise<T> {
  const callId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const imageSpec = {
    image_count: context.media?.imageCount ?? 0,
    image_bytes: context.media?.imageBytes ?? 0,
    image_mime_types: [...new Set(context.media?.imageMimeTypes ?? [])].slice(0, 8),
  };

  const startedWrite = upsertEvent({
    call_id: callId,
    workspace_id: context.workspaceId,
    user_id: context.userId ?? null,
    feature: context.feature,
    operation: context.operation,
    provider: "anthropic",
    model: null,
    requested_model: context.requestedModel,
    status: "started",
    attempt: context.attempt ?? 1,
    max_attempts_configured: context.maxAttemptsConfigured ?? null,
    image_spec: imageSpec,
    audio_seconds: context.media?.audioSeconds ?? null,
    actual_cost_hkd: null,
    benchmark_batch_id: context.benchmark?.batchId ?? null,
    benchmark_action: context.benchmark?.action ?? null,
    benchmark_run: context.benchmark?.run ?? null,
    started_at: startedAt,
    updated_at: startedAt,
  });
  // Register the write with the platform before the paid call begins. This
  // keeps request latency independent of telemetry while still retaining the
  // work through the serverless response lifecycle.
  after(() => startedWrite);

  try {
    const response = await call();
    const usage = response.usage as UsageShape;
    const estimate = estimateAnthropicCost(response.model, usage);
    after(async () => {
      await startedWrite;
      await upsertEvent({
        call_id: callId,
        workspace_id: context.workspaceId,
        user_id: context.userId ?? null,
        feature: context.feature,
        operation: context.operation,
        provider: "anthropic",
        model: response.model,
        requested_model: context.requestedModel,
        provider_request_id: (response as Message & { _request_id?: string })._request_id ?? response.id ?? null,
        status: "succeeded",
        attempt: context.attempt ?? 1,
        max_attempts_configured: context.maxAttemptsConfigured ?? null,
        input_tokens: usage.input_tokens ?? null,
        output_tokens: usage.output_tokens ?? null,
        cache_write_tokens: usage.cache_creation_input_tokens ?? null,
        cache_read_tokens: usage.cache_read_input_tokens ?? null,
        web_search_requests: usage.server_tool_use?.web_search_requests ?? 0,
        image_spec: imageSpec,
        audio_seconds: context.media?.audioSeconds ?? null,
        est_cost_hkd: estimate.amountHkd,
        web_search_est_cost_hkd: estimate.webSearchAmountHkd,
        price_version: estimate.version,
        actual_cost_hkd: null,
        actual_cost_source: null,
        benchmark_batch_id: context.benchmark?.batchId ?? null,
        benchmark_action: context.benchmark?.action ?? null,
        benchmark_run: context.benchmark?.run ?? null,
        error_code: null,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
    return response;
  } catch (error) {
    after(async () => {
      await startedWrite;
      await upsertEvent({
        call_id: callId,
        workspace_id: context.workspaceId,
        user_id: context.userId ?? null,
        feature: context.feature,
        operation: context.operation,
        provider: "anthropic",
        model: null,
        requested_model: context.requestedModel,
        status: error instanceof Error && error.name === "AbortError" ? "cancelled" : "failed",
        attempt: context.attempt ?? 1,
        max_attempts_configured: context.maxAttemptsConfigured ?? null,
        image_spec: imageSpec,
        audio_seconds: context.media?.audioSeconds ?? null,
        actual_cost_hkd: null,
        actual_cost_source: null,
        benchmark_batch_id: context.benchmark?.batchId ?? null,
        benchmark_action: context.benchmark?.action ?? null,
        benchmark_run: context.benchmark?.run ?? null,
        error_code: safeErrorCode(error),
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });
    throw error;
  }
}

export async function consumeSoonAiRateLimit(input: {
  workspaceId: string;
  userId: string;
  minuteLimit: number;
  dayLimit: number;
}) {
  const admin = createEggAdmin();
  const { data, error } = await admin.rpc("consume_egg_ai_rate_limit", {
    p_workspace_id: input.workspaceId,
    p_user_id: input.userId,
    p_feature: "soon_ai_chat",
    p_minute_limit: input.minuteLimit,
    p_day_limit: input.dayLimit,
  });
  if (error || !data?.[0]) throw error ?? new Error("rate_limit_backend_unavailable");
  return data[0] as { allowed: boolean; retry_after_seconds: number; minute_count: number; day_count: number };
}
