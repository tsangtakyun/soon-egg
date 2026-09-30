const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('node:assert/strict');
let role = 'owner', authenticated = true, row = null, writes = 0, failRead = false;
const admin = { from(table) { assert.equal(table, 'creator_dna_profiles'); const q = { select(){return q}, eq(field, value){assert.equal(value, 'workspace');return q}, maybeSingle:async()=>({data:row,error:failRead?'offline':null}), upsert(value){writes++;row=value;return q}, single:async()=>({data:row,error:null}) }; return q; } };
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/egg/creator-dna/route.ts','utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText, { exports:exportsObject, process:{env:{}}, Request, Response, AbortSignal, require:name=>name==='next/server'?{NextResponse:{json:(data,init)=>Response.json(data,init)}}:{getEggRequestContext:async()=>authenticated?{admin,role,workspaceId:'workspace',user:{id:'user'}}:null} });
const request = body => new Request('https://egg.test/api/egg/creator-dna',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
(async()=>{
 const empty=await (await exportsObject.GET(new Request('https://egg.test'))).json(); assert.equal(empty.profile,null);assert.equal(empty.canEdit,true);
 const body={primaryIndustryCode:'food_beverage',secondaryIndustryCodes:['travel_experience'],contentStyles:['實測'],preferredFormats:['short_video'],audienceSummary:'親子家庭',confirm:true};
 assert.equal((await exportsObject.PATCH(request(body))).status,200); assert.equal(row.workspace_id,'workspace');assert.equal(row.audience_summary,'親子家庭');assert.equal(row.profile_status,'confirmed');
 const fetched=await (await exportsObject.GET(new Request('https://egg.test'))).json(); assert.equal(fetched.profile.content_styles[0],'實測');
 role='member';const before=writes;assert.equal((await exportsObject.PATCH(request(body))).status,403);assert.equal(writes,before);
 role='owner';failRead=true;assert.equal((await exportsObject.PATCH(request(body))).status,500);assert.equal(writes,before);
 failRead=false;assert.equal((await exportsObject.PATCH(request({...body,primaryIndustryCode:'invalid'}))).status,422);
 authenticated=false;assert.equal((await exportsObject.GET(new Request('https://egg.test'))).status,401);
 console.log('PASS DNA empty profile, save/reload contract, workspace scope, owner/member permissions, failed read protects existing profile, invalid classification, unauthenticated access.');
})().catch(e=>{console.error(e);process.exitCode=1});
