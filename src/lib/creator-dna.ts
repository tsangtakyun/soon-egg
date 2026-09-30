export const DNA_INDUSTRIES = [['food_beverage','飲食'],['travel_experience','旅遊'],['sports_wellness','運動健康'],['home_living','家居產品'],['medical_aesthetics_wellness','醫美保健'],['beauty_cosmetics','美容化妝'],['trend_culture','潮流文化']] as const;
export const DNA_FORMATS = [['short_video','Reel／短片'],['carousel','多圖圖文'],['single_image','單圖帖文']] as const;
export type CreatorDNA = { primary_industry_code: string; secondary_industry_codes: string[]; content_styles: string[]; preferred_formats: string[]; audience_summary: string | null };
export const EMPTY_DNA: CreatorDNA = { primary_industry_code: '', secondary_industry_codes: [], content_styles: [], preferred_formats: [], audience_summary: '' };
export const dnaBody = (profile: CreatorDNA) => ({ primaryIndustryCode: profile.primary_industry_code, secondaryIndustryCodes: profile.secondary_industry_codes, contentStyles: profile.content_styles, preferredFormats: profile.preferred_formats, audienceSummary: profile.audience_summary, confirm: true });
export const dnaList = (text: string) => [...new Set(text.split(/[，,、\n]/).map(s => s.trim()).filter(Boolean))].slice(0, 8);

/** DNA is authoritative when configured; legacy categories are read-only fallback. */
export function dnaCategories(dna: Pick<CreatorDNA,'primary_industry_code'|'secondary_industry_codes'> | null | undefined, legacy: string[] = []) {
 const codes=[dna?.primary_industry_code,...(dna?.secondary_industry_codes || [])];
 const labels=DNA_INDUSTRIES.filter(([code])=>codes.includes(code)).map(([,label])=>label);
 return labels.length ? labels : legacy;
}
