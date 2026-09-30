// Pure ranking rules shared by web and mobile API. Hiding is an item-level preference.
type Topic = { id: string; title: string; summary: string | null; category: string; tags: string[]; directions?: string[]; direction_aliases?: string[]; content_format: string };
export type RecommendationDNA = { primary_industry_code?: string; secondary_industry_codes?: string[]; content_styles?: string[]; preferred_formats?: string[]; audience_summary?: string | null };
const aliases: Record<string, string[]> = {
  food_beverage: ['美食', '飲食', '餐飲', '餐廳', '探店'], travel_experience: ['旅遊', '旅行', '城市攻略', '文化體驗', '景點'],
  sports_wellness: ['運動', '健身', '健康'], home_living: ['家居', '生活美學', '居家'],
  medical_aesthetics_wellness: ['醫美', '保健'], beauty_cosmetics: ['美容', '護膚', '美妝', '化妝'], trend_culture: ['潮流', '文化', '時尚', '娛樂'],
  美食: ['飲食', '餐廳', '探店'], 旅遊: ['旅行', '城市攻略', '景點'], 美容護膚: ['美容', '護膚', '美妝'],
  時尚穿搭: ['時尚', '穿搭'], 生活美學: ['生活', '家居'], 健康運動: ['健康', '運動'],
  short_video: ['reel', 'reels', '短片', '短影片', '真人拍短片'], carousel: ['輪播', '圖文'], single_image: ['單圖', '照片'],
};
const clean = (s: string) => s.toLowerCase().replace(/[\s_／/、-]+/g, '');
function matches(values: string[], fields: string[]) {
  const haystack = fields.filter(Boolean).map(clean);
  return values.filter(value => [value, ...(aliases[value] || [])].some(term => term.trim() && haystack.some(field => field.includes(clean(term)))));
}
export function recommendationMatch(topic: Topic, dna: RecommendationDNA | null, categories: string[], positives: Topic[]) {
  const subjectFields = [topic.category, ...(topic.directions || []), ...(topic.direction_aliases || []), ...topic.tags, topic.title];
  const primary = matches(dna?.primary_industry_code ? [dna.primary_industry_code] : [], subjectFields);
  const secondary = matches(dna?.secondary_industry_codes || [], subjectFields);
  const category = matches(categories, subjectFields);
  const style = matches(dna?.content_styles || [], [...subjectFields, topic.summary || '']);
  const format = matches(dna?.preferred_formats || [], [topic.content_format]);
  // Audience prose is not a demographic classifier: use explicit keywords only.
  const audience = matches((dna?.audience_summary || '').split(/[，,、;；\n]/).map(s => s.trim()).filter(s => s.length >= 2 && s.length <= 16), [...topic.tags, topic.summary || '']);
  const related = positives.some(item => item.id !== topic.id && (
    (item.category !== '其他' && item.category !== '最新精選' && item.category === topic.category) ||
    item.tags.filter(tag => !['分享收藏', 'AI整理中'].includes(tag) && topic.tags.includes(tag)).length >= 2
  ));
  const subject = primary.length > 0 || secondary.length > 0 || category.length > 0;
  return {
    score: (primary.length ? 12 : 0) + (secondary.length ? 6 : 0) + (category.length ? 4 : 0) + (style.length ? 3 : 0) + (format.length ? 1 : 0) + (audience.length ? 2 : 0) + (related ? 3 : 0),
    // A matching file format alone does not make a topic relevant.
    relevant: subject || style.length > 0 || audience.length > 0 || related,
    reason: subject ? `Creator DNA · ${topic.category}` : style.length ? `符合你的${style[0]}風格` : audience.length ? '符合你的受眾偏好' : related ? '與你收藏或想拍的題材相近' : undefined,
  };
}
