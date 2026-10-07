import { randomUUID } from 'node:crypto'
import { trialPreviewAdmissionResponse } from '@/lib/credits/preview-admission'
import { NextResponse } from 'next/server'
import { getEggRequestContext } from '@/lib/egg-api-context'
import { coreRegistry, rankProduction, type StyleResult } from '@/lib/production-style'
import { eggStyleContext } from '@/lib/egg-style-context'
export const maxDuration=120
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 const context=await getEggRequestContext(request)
 if(!context)return NextResponse.json({error:'請先登入'},{status:401})
 const previewBlock=trialPreviewAdmissionResponse()
 if(previewBlock)return previewBlock
 const {id}=await params, body=await request.json().catch(()=>({}))
 const {admin,workspaceId}=context
 try {
  const [{data:project},{data:angle},{data:recipe},{data:creator}]=await Promise.all([
   admin.from('egg_content_projects').select('id,topic_summary,source_data').eq('id',id).eq('workspace_id',workspaceId).maybeSingle(),
   admin.from('egg_content_angles').select('id,label,premise,audience_promise,editorial_lens').eq('id',body.angleId).eq('project_id',id).maybeSingle(),
   admin.from('egg_content_recipes').select('id,name,platform,format,production_mode,config').eq('id',body.recipeId).eq('workspace_id',workspaceId).eq('is_active',true).maybeSingle(),
   admin.from('egg_creator_profiles').select('display_name,bio,content_categories,content_language').eq('id',workspaceId).maybeSingle()
  ])
  if(!project||!angle||!recipe)return NextResponse.json({error:'找不到內容方向或做法'},{status:404})
  const shootStatus=['not_visited','visited','existing_assets'].includes(body.shootStatus)?body.shootStatus:'not_visited'
  const input=eggStyleContext(project,angle,recipe,shootStatus,body.materials,creator)
  const registry=input.format?await coreRegistry(input.format):{registryVersion:'snapshot-reference-v1'}
  const {data:cached,error:readError}=await admin.from('egg_project_style_runs').select('result').eq('project_id',id).eq('input_hash',input.inputHash).eq('registry_version',registry.registryVersion).maybeSingle()
  if(readError)throw readError
  const result:StyleResult=cached?.result || (input.format ? await rankProduction({...input,consumer:'egg',projectId:id,workspaceId,brand:creator}) : {id:randomUUID(),registryVersion:registry.registryVersion,contextHash:input.inputHash,candidateCount:0,styles:[],emptyReason:'拍攝參考模式未有相容的內容風格，可按已選基本做法繼續。',outputCapability:'text_production_pack'})
  if(!cached){const {error}=await admin.from('egg_project_style_runs').upsert({project_id:id,workspace_id:workspaceId,input_hash:input.inputHash,registry_version:result.registryVersion,result},{onConflict:'project_id,input_hash,registry_version'});if(error)throw error}
  return NextResponse.json({...result,inputHash:input.inputHash},{headers:{'Cache-Control':'private, no-store'}})
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'未能分析風格，請重試。'},{status:503})}
}
