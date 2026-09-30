import "server-only";

const PILOT_WORKSPACE_ID = process.env.SOON_KNOWLEDGE_PILOT_WORKSPACE_ID || "74c7feb1-30c5-4a8d-9d76-4d085dc86835";

export type CoreKnowledgeAsset = {
  assetType: "topic" | "direction" | "method";
  assetId: string;
  version: number;
  ref: string;
  contentHash: string;
  evidenceLevel: "observed" | "directional" | "candidate" | "confirmed";
  content: Record<string, unknown>;
};

export type CoreHookPattern = {
  code: string;
  label_zh: string;
  label_en: string;
  definition: string;
  objectives: string[];
  formats: string[];
  risk_note: string | null;
};

export type CoreKnowledgeSelection = {
  bundleVersion: string;
  contentHash: string;
  assets: CoreKnowledgeAsset[];
  hooks: CoreHookPattern[];
  modifiers: Array<{ code: string; label_zh: string; definition: string }>;
  industries: CoreIndustry[];
};

export type CoreIndustry = {
  code: string;
  parent_code: string | null;
  label_zh: string;
  label_en: string;
  description: string;
  monitor_profile: Record<string, unknown>;
  compliance_level: "standard" | "elevated" | "regulated";
};

type BundleResponse = {
  bundleVersion: string;
  contentHash: string;
  assets: CoreKnowledgeAsset[];
  taxonomy: {
    hooks: CoreHookPattern[];
    modifiers: CoreKnowledgeSelection["modifiers"];
    industries: CoreIndustry[];
  };
};

function searchTerms(value: string) {
  return [...new Set(value.toLowerCase().split(/[\s,，。／/·|：:（）()]+/).map((term) => term.trim()).filter((term) => term.length > 1))].slice(0, 30);
}

function assetScore(asset: CoreKnowledgeAsset, terms: string[]) {
  const haystack = JSON.stringify(asset.content).toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function isKnowledgePilot(workspaceId: string) {
  return workspaceId === PILOT_WORKSPACE_ID;
}

export async function loadCoreKnowledgeForPilot(workspaceId: string, query: string): Promise<CoreKnowledgeSelection | null> {
  if (!isKnowledgePilot(workspaceId)) return null;
  const key = process.env.SOON_CORE_BUNDLE_KEY || process.env.SOON_CORE_KNOWLEDGE_KEY;
  const baseUrl = process.env.SOON_CORE_URL || "https://soon-core.vercel.app";
  if (!key) {
    console.warn("[core knowledge] pilot enabled but SOON_CORE_BUNDLE_KEY is missing");
    return null;
  }
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/intelligence/bundle`, {
      headers: { "x-soon-knowledge-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Core bundle returned ${response.status}`);
    const bundle = await response.json() as BundleResponse;
    const terms = searchTerms(query);
    const ranked = (bundle.assets ?? []).map((asset) => ({ asset, score: assetScore(asset, terms) }));
    const directions = ranked.filter(({ asset }) => asset.assetType === "direction").sort((a, b) => b.score - a.score).slice(0, 3);
    const methods = ranked.filter(({ asset }) => asset.assetType === "method").sort((a, b) => b.score - a.score).slice(0, 2);
    const topics = ranked.filter(({ asset, score }) => asset.assetType === "topic" && score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
    return {
      bundleVersion: bundle.bundleVersion,
      contentHash: bundle.contentHash,
      assets: [...directions, ...methods, ...topics].map(({ asset }) => asset),
      hooks: bundle.taxonomy?.hooks ?? [],
      modifiers: bundle.taxonomy?.modifiers ?? [],
      industries: bundle.taxonomy?.industries ?? [],
    };
  } catch (error) {
    console.error("[core knowledge] bundle unavailable; continuing without Core knowledge", error);
    return null;
  }
}

export function knowledgePrompt(selection: CoreKnowledgeSelection | null) {
  if (!selection) return "本次沒有載入 Core knowledge；不要聲稱使用了任何 Core asset。";
  return `以下是 SOON Core 已版本化的候選知識。先按題材及創作者資料判斷一個主要行業及零至兩個次要行業；只可選擇真正適合本題材的項目，不必全部使用；不可照抄案例或加入候選知識沒有支持的事實。創作者資料內 creator_dna.profile_status 若為 confirmed，可主導風格、格式及行業配對；若為 draft，只可作低權重提示，必須以本次題材、來源資料及使用者輸入為準。醫美保健等 regulated 分類必須保守處理並標示核實風險。knowledge_refs 只可使用下列 ref。\nIndustry taxonomy：${JSON.stringify(selection.industries)}\n候選資產：${JSON.stringify(selection.assets.map((asset) => ({ ref: asset.ref, type: asset.assetType, evidence_level: asset.evidenceLevel, content: asset.content })))}\nHook taxonomy：${JSON.stringify(selection.hooks)}\nHook modifiers：${JSON.stringify(selection.modifiers)}`;
}
