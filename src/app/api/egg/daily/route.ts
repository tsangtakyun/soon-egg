import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";

const MODES = [
  "presenter",
  "ai_visual",
  "carousel",
  "single_image",
  "snapshot_reference",
] as const;
type DailyIdea = {
  title: string;
  angle: string;
  why_you: string;
  audience_value: string;
  production_mode: string;
  effort: string;
  source_topic_id: string | null;
};

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context)
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
  }).format(new Date());
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  const fields =
    "id,rank,title,angle,why_you,audience_value,production_mode,effort,source_topic_id,source_context,recommendation_date";
  const existing = await context.admin
    .from("egg_daily_recommendations")
    .select(fields)
    .eq("workspace_id", context.workspaceId)
    .eq("recommendation_date", today)
    .order("rank");
  if (!force && existing.data?.length === 3)
    return NextResponse.json({ date: today, recommendations: existing.data });
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;
  const [
    { data: creator },
    { data: rules },
    { data: topics },
    { data: candidateActions },
  ] = await Promise.all([
    context.admin
      .from("egg_creator_profiles")
      .select("display_name,bio,content_categories,ai_profile_summary")
      .eq("id", context.workspaceId)
      .maybeSingle(),
    context.admin
      .from("egg_creator_dna_rules")
      .select("category,scope,rule_text")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "confirmed")
      .eq("is_active", true),
    context.admin
      .from("egg_topic_ideas")
      .select(
        "id,title,summary,category,tags,content_format,source_name,source_url,created_at",
      )
      .or(`workspace_id.is.null,workspace_id.eq.${context.workspaceId}`)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20),
    context.admin
      .from("egg_topic_actions")
      .select("idea_id")
      .eq("workspace_id", context.workspaceId)
      .eq("saved", true)
      .eq("dismissed", false)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);
  const candidateIds = new Set(
    (candidateActions ?? []).map((action) => action.idea_id),
  );
  const rankedTopics = [...(topics ?? [])].sort(
    (a, b) => Number(candidateIds.has(b.id)) - Number(candidateIds.has(a.id)),
  );
  const fallback = fallbackIdeas(creator);
  let ideas = fallback;
  const anthropic = getAnthropic();
  if (anthropic) {
    const response = await anthropic.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: `你是 Egg 的私人內容策略編輯。為這位創作者選擇 3 個今天值得製作、彼此不同的內容建議。只可使用提供的題材資料，不可虛構新聞、趨勢或成效；題材不足時可提出 evergreen 題材。所有輸出必須使用自然、簡潔的繁體中文書面語，禁止使用粵語口語字詞。production_mode 只可用 ${MODES.join(",")}；effort 只可用「15 分鐘」「30 分鐘」「60 分鐘」。標題最多 28 字，其餘每項最多 55 字。source_topic_id 只可使用提供的 id，否則 null。只輸出 JSON：{"ideas":[{"title":"","angle":"","why_you":"","audience_value":"","production_mode":"","effort":"","source_topic_id":null}]}
創作者：${JSON.stringify(creator ?? {})}
已確認 Creator DNA：${JSON.stringify(rules ?? [])}
今日候選題材 ID：${JSON.stringify([...candidateIds])}
最新題材（候選優先排列）：${JSON.stringify(rankedTopics)}`,
          },
        ],
      },
      { timeout: 35_000, maxRetries: 1 },
    );
    const output =
      response.content.find((part) => part.type === "text")?.text ?? "";
    const parsed = parseJsonFromText<{ ideas?: DailyIdea[] }>(output, {
      ideas: fallback,
    });
    if (Array.isArray(parsed.ideas) && parsed.ideas.length >= 3)
      ideas = parsed.ideas.slice(0, 3);
  }
  const topicMap = new Map((topics ?? []).map((topic) => [topic.id, topic]));
  const rows = ideas.map((idea, index) => {
    const source = idea.source_topic_id
      ? topicMap.get(idea.source_topic_id)
      : null;
    return {
      workspace_id: context.workspaceId,
      recommendation_date: today,
      rank: index + 1,
      title: String(idea.title).slice(0, 80),
      angle: String(idea.angle).slice(0, 180),
      why_you: String(idea.why_you).slice(0, 180),
      audience_value: String(idea.audience_value).slice(0, 180),
      production_mode: MODES.includes(
        idea.production_mode as (typeof MODES)[number],
      )
        ? idea.production_mode
        : "presenter",
      effort: ["15 分鐘", "30 分鐘", "60 分鐘"].includes(idea.effort)
        ? idea.effort
        : "30 分鐘",
      source_topic_id: source?.id ?? null,
      source_context: source ?? { title: idea.title, summary: idea.angle },
      created_by: context.user.id,
    };
  });
  const { data, error } = await context.admin
    .from("egg_daily_recommendations")
    .upsert(rows, { onConflict: "workspace_id,recommendation_date,rank" })
    .select(fields)
    .order("rank");
  if (error)
    return NextResponse.json(
      { error: "暫時未能準備今日建議" },
      { status: 500 },
    );
  return NextResponse.json({ date: today, recommendations: data ?? [] });
}

function fallbackIdeas(creator: Record<string, unknown> | null): DailyIdea[] {
  const category =
    Array.isArray(creator?.content_categories) &&
    creator.content_categories.length
      ? String(creator.content_categories[0])
      : "你的專長";
  return [
    {
      title: `${category}：3 個最常見誤解`,
      angle: "用三個短例子拆解觀眾最容易混淆的地方。",
      why_you: "可直接運用你的經驗，不需要額外拍攝。",
      audience_value: "觀眾可以快速理解並收藏重溫。",
      production_mode: "presenter",
      effort: "30 分鐘",
      source_topic_id: null,
    },
    {
      title: `${category}：一張圖講清重點`,
      angle: "將一個實用觀點濃縮成清楚、可分享的單圖。",
      why_you: "製作時間短，適合維持穩定更新。",
      audience_value: "一眼取得重點，容易轉發給朋友。",
      production_mode: "single_image",
      effort: "15 分鐘",
      source_topic_id: null,
    },
    {
      title: `${category}：我會點樣開始`,
      angle: "用第一身流程分享由零開始的最小一步。",
      why_you: "個人觀點鮮明，同時保留實用價值。",
      audience_value: "觀眾得到一個今日就能實行的做法。",
      production_mode: "carousel",
      effort: "60 分鐘",
      source_topic_id: null,
    },
  ];
}
