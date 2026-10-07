import { getAnthropic } from "@/lib/ai/anthropic";
import { runSoonAiRateLimitGuard } from "@/lib/ai/soon-ai-rate-limit-guard";
import { consumeSoonAiRateLimit, trackedAnthropicCall } from "@/lib/ai/usage-ledger";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { commitCredits, creditErrorResponse, refundCredits, reserveCredits, type CreditReservation } from "@/lib/credits/ledger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const requestContext = await getEggRequestContext(req);
  if (!requestContext?.user.email) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const userEmail = requestContext.user.email;

  const minuteLimit = Math.max(1, Number(process.env.SOON_AI_PREVIEW_MINUTE_LIMIT || 5));
  const dayLimit = Math.max(1, Number(process.env.SOON_AI_PREVIEW_DAILY_LIMIT || 30));
  let reservation: CreditReservation | null = null;

  try {
    const guarded = await runSoonAiRateLimitGuard({
      check: () => consumeSoonAiRateLimit({
        workspaceId: requestContext.workspaceId,
        userId: requestContext.user.id,
        minuteLimit,
        dayLimit,
      }),
      onAllowed: async () => {
        const { messages, context, creatorData } = await req.json();
        const anthropic = getAnthropic();

        if (!anthropic) {
          const latest = messages?.at(-1)?.content ?? "";
          return NextResponse.json({
            reply: `我收到：「${latest}」。以 ${context} 角度睇，建議你先揀一個最容易量度成效的行動：更新 pitch、測試一個品牌配對，或者把最高點擊連結放到主頁第一位。`,
          });
        }

        reservation = await reserveCredits({
          request: req,
          userId: requestContext.user.id,
          email: userEmail,
          workspaceId: requestContext.workspaceId,
          action: "soon_ai_chat",
        });

        const model = "claude-sonnet-4-20250514";
        const response = await trackedAnthropicCall({
          workspaceId: requestContext.workspaceId,
          userId: requestContext.user.id,
          feature: "soon_ai_chat",
          operation: "chat_reply",
          requestedModel: model,
          maxAttemptsConfigured: 2,
        }, () => anthropic.messages.create({
            model,
            max_tokens: 600,
            system: "你係 SOON AI，SOON-EGG 的亞洲創作者事業 AI 助理。用繁體中文或廣東話書面語，語氣專業、具體、有溫度。",
            messages: [{
              role: "user",
              content: JSON.stringify({ messages, context, creatorData }),
            }],
          }, { maxRetries: 0 }));

        const reply = response.content[0]?.type === "text" ? response.content[0].text : "";
        const balance = await commitCredits(reservation);
        return NextResponse.json({ reply, credits: { deducted: reservation.enabled ? reservation.amount : 0, balance } });
      },
    });

    if (guarded.status === "limited") {
      return NextResponse.json(
        { error: "使用次數太頻密，請稍後再試。" },
        { status: 429, headers: { "Retry-After": String(guarded.retryAfterSeconds) } },
      );
    }
    if (guarded.status === "backend_unavailable") {
      console.error("[soon-ai] rate-limit backend unavailable", guarded.error);
      return NextResponse.json({ error: "AI 服務暫時未能確認使用限額。" }, { status: 503 });
    }
    return guarded.value;
  } catch (error) {
    if (reservation) {
      try { await refundCredits(reservation); }
      catch (refundError) { console.error("[soon-ai] credit refund pending", refundError instanceof Error ? refundError.name : "unknown_error"); }
    }
    const creditResponse = creditErrorResponse(error);
    if (creditResponse) return creditResponse;
    return NextResponse.json({ error: "SOON AI chat failed" }, { status: 500 });
  }
}
