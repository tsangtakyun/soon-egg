// Run with node --env-file=<private production env> scripts/backfill-topic-geography.cjs [--apply]
// Dry-run by default. Updates ONLY geography, guarded against concurrent edits.
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const contract = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/topic-geography-contract.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:contract});
const apply = process.argv.includes('--apply');
const linked = process.argv.includes('--linked');
const admin = linked ? null : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const query = sql => JSON.parse(require('node:child_process').execFileSync('npx',['supabase','db','query','--linked',sql,'--output','json'],{encoding:'utf8',maxBuffer:10*1024*1024})).rows;
const literal = value => "'" + String(value).replaceAll("'","''") + "'";
const ai = new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
const source = row => [row.title,row.summary,...(row.tags||[])].filter(Boolean).join('\n');
async function main(){
  const {data:rows,error}= linked ? {data:query("select id,title,summary,tags,updated_at,countries,regions,localities,geography_status,geography_version,geography_evidence from public.egg_topic_ideas where workspace_id is not null and status='published' and import_state='ready' and geography_version=0 order by created_at desc limit 1000")} : await admin.from('egg_topic_ideas').select('id,title,summary,tags,updated_at,countries,regions,localities,geography_status,geography_version,geography_evidence')
    .not('workspace_id','is',null).eq('status','published').eq('import_state','ready').eq('geography_version',0).order('created_at',{ascending:false}).limit(1000);
  if(error)throw error;if(rows.length===1000)throw Error('Use paginated backfill before proceeding');
  console.log(JSON.stringify({event:'snapshot',apply,rows}));
  let resolved=0,unknown=0,pending=0,updated=0;
  for(let offset=0;offset<rows.length;offset+=5){
    const batch=rows.slice(offset,offset+5);
    const response=await ai.messages.create({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6',max_tokens:4000,
      messages:[{role:'user',content:`提取每條舊題材已記載的地點，只補地理資料，不修改內容。${contract.TOPIC_GEOGRAPHY_PROMPT}\n輸出 {"items":[{"id":"原id","geography":{...}}]}。每條獨立處理，不能將不同題材的地點互相套用。來源是現存題材文字，沒有證據時 unknown。\n${JSON.stringify(batch.map(row=>({id:row.id,text:source(row)})))}`}]
    },{timeout:60000,maxRetries:1});
    const text=response.content.filter(x=>x.type==='text').map(x=>x.text).join('');
    let items=[];try{items=JSON.parse(text.slice(text.indexOf('{'),text.lastIndexOf('}')+1)).items||[];}catch{}
    for(const row of batch){
      const result=contract.parseTopicGeography(items.find(x=>x.id===row.id)?.geography,source(row));
      if(result.geography_status==='resolved')resolved++;else if(result.geography_status==='unknown')unknown++;else pending++;
      console.log(JSON.stringify({event:'result',id:row.id,title:row.title,...result}));
      if(apply && result.geography_status!=='pending' && !row.countries.length && !row.regions.length && !row.localities.length){
        const {data,error}= linked ? {data:query(`update public.egg_topic_ideas set ${Object.entries(result).map(([key,value])=>`${key}=${Array.isArray(value)?`ARRAY[${value.map(literal).join(',')}]::text[]`:typeof value==='number'?value:literal(value)}`).join(',')} where id=${literal(row.id)}::uuid and updated_at=${literal(row.updated_at)}::timestamptz and geography_version=0 returning id`)} : await admin.from('egg_topic_ideas').update(result).eq('id',row.id).eq('updated_at',row.updated_at).eq('geography_version',0).select('id');
        if(error)throw error;updated+=data.length;
      }
    }
    console.log(JSON.stringify({event:'progress',processed:Math.min(offset+5,rows.length),total:rows.length,resolved,unknown,pending,updated}));
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
