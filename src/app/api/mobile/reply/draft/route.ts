import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { trackedAnthropicCall } from "@/lib/ai/usage-ledger";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { buildReplyLanguageInstruction } from "@/lib/reply-language";

export const maxDuration = 60;

export async function POST(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const originalMessage = typeof body.originalMessage === "string" ? body.originalMessage.trim().slice(0, 12_000) : "";
  if (!originalMessage) return NextResponse.json({ error: "未有客戶訊息" }, { status: 400 });
  const identityMode = body.identityMode === "self" ? "self" : "manager";
  const creatorName = typeof body.creatorName === "string" ? body.creatorName.trim().slice(0, 80) : "創作者";
  const assistantName = typeof body.assistantName === "string" ? body.assistantName.trim().slice(0, 80) : "EGG 經理人";
  const tone = typeof body.tone === "string" ? body.tone.trim().slice(0, 80) : "友善、自然、專業";
  const creatorContext = typeof body.creatorContext === "string" ? body.creatorContext.trim().slice(0, 4_000) : "";
  const avoidTopics = typeof body.avoidTopics === "string" ? body.avoidTopics.trim().slice(0, 1_000) : "";
  const knownContext = typeof body.knownContext === "string" ? body.knownContext.trim().slice(0, 4_000) : "";

  const anthropic = getAnthropic();
  if (!anthropic) return NextResponse.json({ error: "AI 回覆服務尚未完成設定" }, { status: 503 });
  try {
    const identityRule = identityMode === "self"
      ? `你就是 ${creatorName} 本人，必須全段使用第一身「我」。不得把 ${creatorName} 當成第三者，不得寫「轉交 ${creatorName}」、「請 ${creatorName} 確認」或任何交給自己跟進的句子；未確認事項要寫成「我需要先確認」。`
      : `你是 ${assistantName}，必須在合適位置清楚表明你是代表 ${creatorName} 的虛擬經理人，不能冒充 ${creatorName} 本人。`;
    const approvalRule = identityMode === "self"
      ? "不可自行確認報價、檔期、接單或承諾合作；要以第一身表示「我需要先確認」，不要提及轉交給自己。"
      : `不可自行確認報價、檔期、接單或承諾合作；要明確表示需由 ${creatorName} 確認。`;
    const requestedModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
    const message = await trackedAnthropicCall({
      workspaceId: context.workspaceId,
      userId: context.user.id,
      feature: "reply",
      operation: "generate_draft",
      requestedModel,
      maxAttemptsConfigured: 2,
    }, () => anthropic.messages.create({
      model: requestedModel,
      max_tokens: 900,
      messages: [{
        role: "user",
        content: `你要草擬一段可由創作者審閱後手動發送的回覆。\n${identityRule}\n${buildReplyLanguageInstruction(originalMessage)}\n語氣：${tone}\n創作者背景：${creatorContext || "未提供"}\n避免話題：${avoidTopics || "沒有特別設定"}\n本段對話已知資料：${knownContext || "只有以下客戶訊息"}\n客戶訊息（可能包含已核對的語音轉寫）：\n${originalMessage}\n\n規則：\n- 已知資料不要重問。只問真正欠缺、而且會影響下一步的資料。\n- ${approvalRule}\n- 不可聲稱已發送、已預留或已接受。\n- 只輸出回覆草稿，不要解釋。`,
      }],
    }, { maxRetries: 0 }));
    const draft = message.content.find((item) => item.type === "text")?.text?.trim() || "";
    if (!draft) throw new Error("AI 未有返回草稿");
    return NextResponse.json({ success: true, draft, identityMode });
  } catch (error) {
    console.error("Reply draft generation failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "未能生成回覆草稿" }, { status: 500 });
  }
}
