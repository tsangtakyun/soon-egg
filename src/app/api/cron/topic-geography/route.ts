import { retryTopicGeography } from "@/lib/topic-geography-retry";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";

export const maxDuration = 120;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;
  return Response.json({ results: await retryTopicGeography() });
}
