export type MatchMedia = {
  instagram_media_id: string;
  caption: string | null;
  media_type: string | null;
  media_product_type: string | null;
  published_at: string | null;
};

export type MatchPack = {
  id: string;
  content: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  recipe_format?: string | null;
};

export type PublicationCandidate = {
  packId: string;
  title: string;
  caption: string;
  score: number;
  captionSimilarity: number;
  hoursAfterPack: number;
  formatMatch: boolean;
  reasons: string[];
};

function tokens(value: string) {
  const normalized = value.toLocaleLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[#@]/g, " ");
  const result = new Set(normalized.match(/[a-z0-9]+/g) ?? []);
  for (const run of normalized.match(/[\p{Script=Han}]+/gu) ?? []) {
    if (run.length === 1) result.add(run);
    for (let index = 0; index < run.length - 1; index += 1) result.add(run.slice(index, index + 2));
  }
  return result;
}

function jaccard(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function expectedFormat(format?: string | null) {
  if (format === "short_video") return "REELS";
  if (format === "carousel") return "CAROUSEL_ALBUM";
  if (format === "single_image") return "IMAGE";
  return null;
}

export function rankPublicationCandidates(media: MatchMedia, packs: MatchPack[]) {
  const published = media.published_at ? new Date(media.published_at).getTime() : Number.NaN;
  if (!Number.isFinite(published)) return [];
  const mediaFormat = (media.media_product_type || media.media_type || "").toUpperCase();

  return packs.flatMap((pack): PublicationCandidate[] => {
    const packTime = new Date(pack.updated_at || pack.created_at).getTime();
    const hoursAfterPack = (published - packTime) / 3_600_000;
    if (!Number.isFinite(packTime) || hoursAfterPack < -6 || hoursAfterPack > 24 * 45) return [];

    const content = pack.content ?? {};
    const caption = String(content.caption ?? "");
    const title = String(content.title ?? "未命名內容");
    const captionSimilarity = jaccard(media.caption ?? "", `${title} ${caption}`);
    const targetFormat = expectedFormat(pack.recipe_format);
    const formatMatch = !targetFormat || mediaFormat.includes(targetFormat);
    const timeScore = Math.max(0, 1 - Math.max(0, hoursAfterPack) / (24 * 21));
    const score = captionSimilarity * 0.65 + timeScore * 0.25 + (formatMatch ? 0.1 : 0);
    if (score < 0.22 && captionSimilarity < 0.08) return [];

    const reasons = [
      captionSimilarity >= 0.35 ? "Caption 高度相似" : captionSimilarity >= 0.12 ? "Caption 部分相似" : "Caption 線索較弱",
      hoursAfterPack <= 24 * 3 ? "製作及發布時間接近" : `相隔 ${Math.round(hoursAfterPack / 24)} 日`,
      formatMatch ? "格式相符" : "格式未能對上",
    ];
    return [{
      packId: pack.id,
      title,
      caption,
      score: Number(score.toFixed(4)),
      captionSimilarity: Number(captionSimilarity.toFixed(4)),
      hoursAfterPack: Number(hoursAfterPack.toFixed(1)),
      formatMatch,
      reasons,
    }];
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}
