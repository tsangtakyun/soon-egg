import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/ai/anthropic";
import { CREDIT_COSTS, deductCredits } from "@/lib/credits";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { masterSupabase } from "@/lib/supabase/master";
import { getOrCreateKolWorkspace } from "@/lib/workspace";

const model = "claude-sonnet-4-20250514";

export async function POST(req: Request) {
  const serverSupabase = await createServerClient();
  if (!serverSupabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await deductCredits({
    email: user.email,
    amount: CREDIT_COSTS.AI_GENERATION,
    type: "ai_generation",
    tool: "script",
    description: "生成劇本",
  });

  if (!result.success) {
    return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
  }

  const { brandName, industry, topic, background, hookStyle, transitionStyle, endingStyle } = await req.json();
  const anthropic = getAnthropic();

  if (!anthropic) {
    return NextResponse.json({ error: "Anthropic API key missing" }, { status: 500 });
  }

  const hook = findStyle(hookStyles, hookStyle);
  const transition = findStyle(transitionStyles, transitionStyle);
  const ending = findStyle(endingStyles, endingStyle);

  const prompt = `你係一個專業 IG Reel 劇本創作者，擅長香港廣東話短影片內容。

品牌/個人名稱：${brandName}
行業/類型：${Array.isArray(industry) ? industry.join("、") : ""}
主題：${topic}
背景資料：${background}

Hook 風格：${hook.title}（${hook.example}）
轉場風格：${transition.title}（${transition.example}）
Ending 風格：${ending.title}（${ending.example}）

請生成一個完整 IG Reel 劇本（約 60-90 秒），包括：
1. Hook（開場 3-5 秒，用上述 Hook 風格）
2. 主體內容（40-60 秒，自然口語廣東話）
3. 轉場（用上述轉場風格）
4. Ending（用上述 Ending 風格）

要求：
- 全程廣東話口語，自然流暢
- 每段落標明時間和 [旁白] 或 [鏡頭]
- 符合 IG Reel 節奏（快、緊湊、有畫面感）`;

  try {
    const message = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const script = message.content[0]?.type === "text" ? message.content[0].text : "";
    const workspaceId = await getOrCreateKolWorkspace(user.id, user.email, "");

    const { data: saved, error } = await (masterSupabase as any)
      .from("scripts")
      .insert({
        user_id: user.id,
        workspace_id: workspaceId,
        title: topic,
        topic,
        background: background ?? null,
        tone: "IG Reel",
        framework: transition.code,
        hook_variant: hook.code,
        target_minutes: 1,
        ai_draft: script,
        parts: {
          brand_name: brandName,
          industry: Array.isArray(industry) ? industry : [],
          hook_style: hook,
          transition_style: transition,
          ending_style: ending,
        },
        model,
        generated_at: new Date().toISOString(),
      })
      .select("id, title, topic, background, tone, framework, hook_variant, ai_draft, parts, created_at")
      .single();

    if (error) {
      console.error("[script generate] save error:", error);
    }

    return NextResponse.json({
      script,
      script_id: saved?.id,
      saved,
      balance: result.balance,
    });
  } catch (error) {
    console.error("[script generate] error:", error);
    return NextResponse.json({ error: "Script generation failed" }, { status: 500 });
  }
}

type StyleOption = {
  code: string;
  title: string;
  example: string;
};

const hookStyles: StyleOption[] = [
  { code: "H1", title: "極端行動質問", example: "你試過喺香港搵到一碗低過$30嘅靚湯未？" },
  { code: "H2", title: "真定假 — 直接挑戰", example: "成日話呢間係全港最好食，真定假呀？" },
  { code: "H3", title: "聽講 — 半信半疑", example: "我朋友話呢度嘅咖啡係全城最好，我唔信。" },
  { code: "H4", title: "感官喚起 + 懸念", example: "想像一下，第一口係焦糖，第二口係驚喜⋯⋯" },
  { code: "H5", title: "反差驚喜 — 竟然", example: "呢間藏係工廠大廈嘅餐廳，竟然係米芝蓮推介。" },
  { code: "H6", title: "意外自我披露", example: "我試過為咗呢碗麵坐一個鐘車，值唔值？" },
  { code: "H7", title: "荒誕事實", example: "咩話？！香港有間咖啡店，閒日要排隊三個鐘。" },
  { code: "H8", title: "代入感假設", example: "如果你只有$100，你會點喺香港食到最好？" },
];

const transitionStyles: StyleOption[] = [
  { code: "T1", title: "情緒代入 — 同行感", example: "好，我依家入去喇，你哋跟住我。" },
  { code: "T2", title: "轉念 — 入去先信咗", example: "我本來唔信，但入到去就知我錯咗。" },
  { code: "T3", title: "質疑名氣 — 實力存疑", example: "有名就一定好食？我嚟幫你哋試。" },
  { code: "T4", title: "實測宣言 — 等我試下", example: "唔講咁多，我親自試晒每一款。" },
  { code: "T5", title: "場景切割 — 另有真相", example: "但係等等，我發現咗一樣你哋唔知嘅事。" },
  { code: "T6", title: "第一印象反轉", example: "老實講，第一眼我覺得好普通，但係⋯⋯" },
  { code: "T7", title: "靈魂轉移 — 重點喺呢度", example: "啲人嚟係為咗咖啡，但係我係為咗呢個。" },
  { code: "T8", title: "頓悟時刻", example: "食第一口嗰陣，我明白點解佢可以撐三十年。" },
];

const endingStyles: StyleOption[] = [
  { code: "E1", title: "留白式 Verdict", example: "值唔值得去？你知我點諗。" },
  { code: "E2", title: "值唔值得 — 親身作答", example: "三個鐘車程值唔值？我下個月仲會返嚟。" },
  { code: "E3", title: "情懷翻轉 — 真材實料", example: "三十年，唔係靠宣傳，係靠呢碗湯。" },
  { code: "E4", title: "自嘲收尾 — 解鎖", example: "好，我又解鎖咗一個令荷包縮水嘅地方。" },
  { code: "E5", title: "詩意留白", example: "有啲味道，係會記一世嘅。" },
  { code: "E6", title: "個人感悟 — 超越食玩", example: "呢度令我記起，簡單嘅嘢有時最難得。" },
  { code: "E7", title: "哲學收結", example: "一個地方能撐幾十年，從來唔係靠運氣。" },
];

function findStyle(options: StyleOption[], code: string) {
  return options.find((option) => option.code === code) ?? options[0];
}
