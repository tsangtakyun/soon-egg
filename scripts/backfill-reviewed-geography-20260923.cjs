// One-time, source-reviewed migration. NOT a runtime city dictionary.
// Input is the private pre-migration snapshot; every update is id/version/timestamp guarded.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const rows=JSON.parse(fs.readFileSync('/private/tmp/egg-geography-snapshot-20260923.json','utf8')).rows;
if(rows.length!==92 || rows[0].id!=='812b4b08-4af4-411c-b782-dfa2382f49ff') throw Error('Unexpected snapshot');
const contract={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/topic-geography-contract.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:contract});
// index: country, locality, region; null means insufficient actual-location evidence.
const reviewed=[
['NL','阿姆斯特丹'],['FR','巴黎'],['FR','巴黎'],['JP','浮羽市','福岡縣'],['MY'],['NL'],['FI'],['JP','下關'],['FR','巴黎'],['HK'],
['JP','東京'],['FR','巴黎'],['HK','尖沙咀'],['JP','','關西'],['HK','上環'],null,['AU','墨爾本'],['JP','由布院'],['HK','西沙'],['FR','巴黎'],
['FR','巴黎'],['JP','江田島','廣島'],['TW','台北'],['FR','巴黎'],['FR','巴黎'],['FR','巴黎'],['HK','中環'],['SG','聖淘沙'],['HK'],['MY','浪中島','登嘉樓'],
['JP','大阪'],['FR'],['FR','聖米歇爾山'],['HK','旺角'],['HK'],['MO'],['JP','東京'],['SG','烏節路'],['PL'],['CN'],
['HK','堅尼地城'],['SG'],['SG'],['FR','維希'],['JP','福岡'],['FR','巴黎'],null,['TH','曼谷'],['GB','Birchington','肯特郡'],['MX','普埃布拉'],
['FR','巴黎'],['FR','巴黎'],['HU','布達佩斯'],['FR','巴黎'],['GB','','英格蘭'],['FR','巴黎'],['JP'],['JP','東京'],['US','聖貝納迪諾','加州'],['JP','大阪'],
['JP','東京'],['FR'],['TH','清邁'],['TW','台中'],['JP','博多'],null,['FR','巴黎'],['TW','高雄'],null,null,
['AU','Maria Island','塔斯馬尼亞'],['DE','柏林'],['HK','中環'],['PL'],['TW'],['FR','聖雷米'],null,['TW','台中'],null,['TW','高雄'],
['TW','台南'],['TW','台南'],['TW','台南'],['TW','台南'],['JP','恩納村','沖繩'],null,null,['TW','台南'],null,null,null,['TW','台南']
];
const lit=v=>"'"+String(v).replaceAll("'","''")+"'";
let resolved=0,unknown=0;
const statements=rows.map((row,i)=>{
 const item=reviewed[i];
 const source=[row.title,row.summary,...row.tags].join('\n');
 // Full supplied text is under the 500-character evidence bound for this snapshot.
 const evidence=(row.title+'\n'+row.summary).slice(0,500);
 const value=item?{countries:[item[0]],localities:item[1]?[item[1]]:[],regions:item[2]?[item[2]]:[],confidence:'high',evidence}:{confidence:'unknown'};
 const result=contract.parseTopicGeography(value,source);
 if(result.geography_status==='pending')throw Error(`Evidence validation failed: ${i} ${row.title}`);
 if(item)resolved++;else unknown++;
 const assignments=Object.entries(result).map(([key,value])=>`${key}=${Array.isArray(value)?`ARRAY[${value.map(lit).join(',')}]::text[]`:typeof value==='number'?value:lit(value)}`).join(',');
 return `update public.egg_topic_ideas set ${assignments} where id=${lit(row.id)}::uuid and updated_at=${lit(row.updated_at)}::timestamptz and geography_version=0 and cardinality(countries)=0 and cardinality(regions)=0 and cardinality(localities)=0 returning id;`;
});
if(process.argv.includes('--apply')){
 const result=require('node:child_process').execFileSync('npx',['supabase','db','query','--linked','begin;\n'+statements.join('\n')+'\ncommit;','--output','json'],{encoding:'utf8',maxBuffer:1024*1024});
 console.log(result);
}
console.log(JSON.stringify({reviewed:rows.length,resolved,unknown,applied:process.argv.includes('--apply')}));
