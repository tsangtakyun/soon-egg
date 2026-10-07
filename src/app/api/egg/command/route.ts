import { NextResponse } from "next/server";
import { getEggRequestContext } from "@/lib/egg-api-context";
import { trialPreviewAdmissionResponse } from "@/lib/credits/preview-admission";
import { getAnthropic, parseJsonFromText } from "@/lib/ai/anthropic";
import { extractCommandIntent, researchCommand } from "@/lib/command-research";
import { commandMode, requestedCount, uniqueCommandTopics, shortcutLocation, selectCommandTopics, type CommandTopic } from "@/lib/command-policy";

export const maxDuration = 120;

type Suggestion = {
  title: string;
  angle: string;
  reason: string;
  production_mode: string;
  source_topic_id: string | null;
  evidence_id?: string;
};

export async function GET(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context)
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { data } = await context.admin
    .from("egg_command_sessions")
    .select("id,title,messages,interpreted_context,updated_at")
    .eq("workspace_id", context.workspaceId)
    .order("updated_at", { ascending: false })
    .limit(10);
  return NextResponse.json(
    { sessions: data ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(request: Request) {
  try { return await handlePost(request); }
  catch { return NextResponse.json({ error: "暫時未能查閱題材資料，請稍後重試。" }, { status: 503 }); }
}

async function handlePost(request: Request) {
  const context = await getEggRequestContext(request);
  if (!context)
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const previewBlock = trialPreviewAdmissionResponse();
  if (previewBlock) return previewBlock;
  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    scope?: string;
    sessionId?: string;
    mode?: string;
    location?: { country?: string };
  };
  const prompt = String(body.prompt ?? "")
    .trim()
    .slice(0, 3000);
  const scope = ["auto", "content", "production", "workspace"].includes(
    body.scope ?? "",
  )
    ? body.scope!
    : "auto";
  if (!prompt)
    return NextResponse.json({ error: "請輸入想處理的事情" }, { status: 400 });
  const mode = commandMode(body.mode, prompt);
  const { data: session } = mode === "chat" && body.sessionId
    ? await context.admin
        .from("egg_command_sessions")
        .select("id,messages,interpreted_context")
        .eq("id", body.sessionId)
        .eq("workspace_id", context.workspaceId)
        .maybeSingle()
    : { data: null };
  const history = Array.isArray(session?.messages)
    ? session.messages.slice(-8)
    : [];
  async function loadLibrary() {
    const items: CommandTopic[] = [];
    for (let offset = 0; ; offset += 200) {
      const { data, error } = await context!.admin.from("egg_topic_ideas")
        .select("id,title,summary,category,tags,source_name,source_url,created_at,countries,localities,geography_kind")
        .or(`workspace_id.is.null,workspace_id.eq.${context!.workspaceId}`)
        .eq("status", "published").order("created_at", { ascending: false }).order("id")
        .range(offset, offset + 199);
      if (error) throw error;
      items.push(...(data ?? []));
      if (!data || data.length < 200) return { data: items };
    }
  }
  const [
    { data: creator },
    { data: rules },
    { data: library },
    { data: packs },
  ] = await Promise.all([
    context.admin
      .from("egg_creator_profiles")
      .select(
        "display_name,bio,content_categories,ai_profile_summary,instagram_followers,instagram_engagement_rate",
      )
      .eq("id", context.workspaceId)
      .maybeSingle(),
    context.admin
      .from("egg_creator_dna_rules")
      .select("category,scope,rule_text,evidence_count")
      .eq("workspace_id", context.workspaceId)
      .eq("status", "confirmed")
      .eq("is_active", true),
    loadLibrary(),
    context.admin
      .from("egg_content_packs")
      .select("content,updated_at")
      .eq("workspace_id", context.workspaceId)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);
  let research;
  let searchFailed = false;
  let targetCount = 3;
  let topics: CommandTopic[] = [];
  try {
    const intent = mode === "chat"
      ? await extractCommandIntent(prompt, session?.interpreted_context ?? {})
      : { location: shortcutLocation(body.location), format: "", on_camera: "", goal: "", kind: "inspiration" as const, count: 3 };
    targetCount = requestedCount(prompt, "count" in intent ? intent.count as number : undefined);
    intent.count = targetCount;
    topics = intent.kind === "nearby" ? [] : uniqueCommandTopics(selectCommandTopics(library, intent, creator?.content_categories ?? [], mode));
    research = { intent, evidence: [] as Awaited<ReturnType<typeof researchCommand>>["evidence"], searched: false };
    if (topics.length < targetCount && intent.location) {
      try { research = await researchCommand({ ...intent, count: targetCount - topics.length }, undefined, topics.map(t => t.title)); research.intent = intent; }
      catch { searchFailed = true; }
    }
  } catch {
    return NextResponse.json({ error: "暫時未能查閱題材資料，請重試。" }, { status: 503 });
  }
  const fallback = { answer: "暫時未找到符合要求的方向，請補充店名或縮小主題。", suggestions: [] as Suggestion[], actions: [] as Array<{ label: string; href: string }> };
  const anthropic = getAnthropic();
  let result = fallback;
  try {
  if (anthropic && (topics.length || research.evidence.length)) {
    const response = await anthropic.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `你是 EGG 內容方向助手。只提供供用戶選擇的短方向，不寫劇本、長分析或指定拍法。全部用繁體中文書面語。title 用完整短句，保留店名，不要截斷字詞；angle 只用一句、最多45字說明影片看點；reason 最多20字；answer 最多35字。提供 ${targetCount} 個不同題材，資料不足可以少於 ${targetCount} 個，同一店舖不可拆成多個方向，禁止湊數。最新地點和主題是硬條件；美食不能用景點代替。先從下方已按目的地篩選的題材庫挑選，source_topic_id必須對應候選ID。題材庫是靈感來源，不代表最新營業/價格已核實。也可以使用下方網上證據，evidence_id必須對應。只能使用這兩份候選來源；不能用歷史對話或創作者簡介補入其他地點。nearby模式只能用網上證據並核對地址與主題。不要聲稱現在一定開放或可直接出發。資料不足才返回空陣列，不要求廣泛旅遊靈感用戶先提供店名。不杜撰價格、口味、熱門程度或已核實。未指定出鏡時不要替用戶決定。production_mode 僅作內部相容欄位，預設presenter。JSON：{"answer":"","suggestions":[{"title":"","angle":"","reason":"","production_mode":"presenter","source_topic_id":null,"evidence_id":""}],"actions":[]}
已理解要求：${JSON.stringify(research.intent)}
網上證據：${JSON.stringify(research.evidence)}
過往對話：${JSON.stringify(history)}
使用者最新指令：${prompt}
使用範圍：${scope}
推薦用途：${mode === "daily" ? "今天適合創作的方向，優先近期題材，但不要杜撰限時活動。" : mode === "recommended" ? "優先符合Creator DNA與內容興趣，不強求今日時效。" : "依照最新要求"}
創作者：${JSON.stringify(creator ?? {})}
Creator DNA：${JSON.stringify(rules ?? [])}
題材庫：${JSON.stringify(topics)}
最近 Content Pack：${JSON.stringify((packs ?? []).map((pack) => ({ title: (pack.content as Record<string, unknown>)?.title, updated_at: pack.updated_at })))}
系統路徑：/egg-daily、/topic-library、/egg-this、/egg-preferences、/tools/script、/tools/subtitle、/tools/reply、/profile、/analytics、/brand-deals
JSON 另外加入 interpreted：{"location":"","format":"","on_camera":"","goal":""}，綜合過往對話保留未被最新指令推翻的條件。`,
          },
        ],
      },
      { timeout: 35_000, maxRetries: 0 },
    );
    const output =
      response.content.filter((part) => part.type === "text").map(part => part.text).join("\n");
    result = parseJsonFromText(output, fallback);
  }
  } catch {
    result = fallback;
  }
  const topicIds = new Set((topics ?? []).map((topic) => topic.id));
  let suggestions = Array.isArray(result.suggestions)
    ? result.suggestions
        .filter((item: Suggestion) => item && (research.evidence.some(e => e.id === item.evidence_id) || (research.intent.kind !== "nearby" && item.source_topic_id && topicIds.has(item.source_topic_id))))
        .slice(0, targetCount)
        .map((item: Suggestion) => ({
          ...item,
          title: String(item.title ?? "").trim(),
          angle: String(item.angle ?? "").slice(0, 60),
          reason: String(item.reason ?? "").slice(0, 25),
          production_mode: [
            "presenter",
            "ai_visual",
            "carousel",
            "single_image",
            "snapshot_reference",
          ].includes(item.production_mode)
            ? item.production_mode
            : "presenter",
          source_topic_id:
            item.source_topic_id && topicIds.has(item.source_topic_id)
              ? item.source_topic_id
              : null,
        }))
        .filter((item: Suggestion) => item.title)
    : [];
  suggestions = suggestions.filter((item, index, items) => items.findIndex(other => (other.source_topic_id || other.evidence_id) === (item.source_topic_id || item.evidence_id)) === index);
  const libraryFallback = !suggestions.length && topics.length > 0;
  if (libraryFallback) {
    suggestions = topics.slice(0, targetCount).map(topic => ({
      title: topic.title, angle: `以「${topic.title}」為題材，整理成你的創作分享。`.slice(0, 60),
      reason: "題材庫靈感", production_mode: "presenter", source_topic_id: topic.id,
    }));
  }
  // Preserve grounded candidates if the model under-produces; never invent extra venues.
  for (const topic of topics) {
    if (suggestions.length >= targetCount) break;
    if (!suggestions.some(s => s.source_topic_id === topic.id)) suggestions.push({
      title: topic.title, angle: topic.summary || "查看原始來源，選擇適合你的創作角度。",
      reason: "題材庫靈感", production_mode: "presenter", source_topic_id: topic.id,
    });
  }
  for (const evidence of research.evidence) {
    if (suggestions.length >= targetCount) break;
    if (!suggestions.some(s => s.evidence_id === evidence.id)) suggestions.push({
      title: evidence.name, angle: evidence.fact, reason: "網上補充",
      production_mode: "presenter", source_topic_id: null, evidence_id: evidence.id,
    });
  }
  const seenSources = new Set<string>();
  suggestions = suggestions.filter(item => {
    const key = item.source_topic_id || item.evidence_id || item.title;
    if (seenSources.has(key)) return false;
    seenSources.add(key); return true;
  });
  const allowedPaths = new Set([
    "/egg-daily",
    "/topic-library",
    "/egg-this",
    "/egg-preferences",
    "/tools/script",
    "/tools/subtitle",
    "/tools/reply",
    "/profile",
    "/analytics",
    "/brand-deals",
  ]);
  const actions = Array.isArray(result.actions)
    ? result.actions
        .filter((action) => action && allowedPaths.has(String(action.href)))
        .slice(0, 4)
        .map((action) => ({
          label: String(action.label ?? "打開").slice(0, 40),
          href: String(action.href),
        }))
    : [];
  const interpreted = { location: research.intent.location, count: String(targetCount), format: research.intent.format, on_camera: research.intent.on_camera, goal: research.intent.goal };
  const answer = `已找到 ${suggestions.length}／${targetCount} 個題材。${searchFailed ? "網上補充搜尋暫時未完成，可稍後重試。" : suggestions.length < targetCount ? "目前有來源支持的結果不足，先保留以下題材，不會湊數。" : "可選擇想製作的方向。"}營業及價格等最新資訊仍需確認。`;
  const topicMap = new Map((topics ?? []).map((topic) => [topic.id, topic]));
  const sourcedSuggestions = suggestions.map((item) => {
    const evidence = research.evidence.find(e => e.id === item.evidence_id);
    return {
      ...item,
      source_note: evidence ? "網上補充 · 最新實用資訊待確認" : "題材庫靈感 · 最新資訊待核實",
      source: evidence
        ? { source_name: evidence.name, source_url: evidence.url, address: evidence.address }
        : item.source_topic_id ? (topicMap.get(item.source_topic_id) ?? null) : null,
    };
  });
  const messages = [
    ...history,
    { role: "user", content: prompt },
    { role: "assistant", content: answer, suggestions: sourcedSuggestions },
  ];
  let sessionId = session?.id;
  if (sessionId)
    await context.admin
      .from("egg_command_sessions")
      .update({
        messages,
        interpreted_context: interpreted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  else {
    const { data: created } = await context.admin
      .from("egg_command_sessions")
      .insert({
        workspace_id: context.workspaceId,
        title: prompt.slice(0, 45),
        messages,
        interpreted_context: interpreted,
        created_by: context.user.id,
      })
      .select("id")
      .single();
    sessionId = created?.id;
  }
  return NextResponse.json({
    sessionId,
    answer,
    suggestions: sourcedSuggestions,
    actions,
    interpreted,
    messages,
    used: {
      topics: topics.length,
      dnaRules: rules?.length ?? 0,
      daily: 0,
    },
  });
}
