import { fingerprint, materialFlags, object } from './production-style'
export function eggStyleContext(project:Record<string,unknown>,angle:Record<string,unknown>,recipe:Record<string,unknown>,shootStatus:string,materials:unknown,creator?:Record<string,unknown>|null) {
 const source=object(project.source_data)
 const format=recipe.production_mode==='snapshot_reference' ? null : recipe.format==='carousel' ? 'instagram_carousel' : recipe.format==='single_image' ? 'instagram_single_feed' : recipe.production_mode==='ai_visual' ? 'ai_short_video' : 'human_short_video'
 const facts=JSON.stringify(source)
 const brand=creator?{display_name:creator.display_name,bio:creator.bio,content_categories:creator.content_categories,content_language:creator.content_language}:null
 const input={brand,format,brief:String(project.topic_summary || ''),facts,story:angle,assets:source.image_paths || [],materials:materialFlags(materials),constraints:{shootStatus,recipe,output:'text_production_pack',instruction:shootStatus==='existing_assets'?'只能使用已確認素材，不得要求補拍。':'不得假裝已有素材或親身體驗。'},topicVersion:fingerprint(source)}
 return {...input,inputHash:fingerprint(input)}
}
