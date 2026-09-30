const fs = require("fs"), vm = require("vm"), ts = require("typescript"), assert = require("node:assert/strict");
const members = [{user_id:"self",email:"me@example.com",role:"member"},{user_id:"other",email:"renee@example.com",role:"owner"}];
let role="member", authenticated=true, queries=[];
function query(table) {
  const q={select(){return q},eq(k,v){queries.push([table,k,v]);return q},order(){return q},gt(){return q},then(resolve){return Promise.resolve({data:table.endsWith("members")?members:[],error:null}).then(resolve)}};
  return q;
}
const lib={canManageWorkspaceMembers:r=>r==="owner"||r==="admin",getCreatorWorkspaceContext:async()=>({user:authenticated?{id:"self"}:null,activeWorkspace:{id:"renee",display_name:"Renee Chan"},activeRole:role,admin:{from:query}})};
const identityContext={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/team-identities.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{...identityContext,URL});
const ctx={exports:{},require:n=>n==="next/server"?{NextResponse:{json:(body,opts)=>({body,status:opts?.status??200})}}:n==="@/lib/team-identities"?identityContext.exports:lib};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/app/api/creator-workspaces/members/route.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,ctx);
(async()=>{
  let result=await ctx.exports.GET();assert.equal(result.status,200);assert.equal(result.body.members.length,2);assert.equal(result.body.members[0].isSelf,true);assert.equal(result.body.members[1].email,"");assert.equal(result.body.workspaceName,"Renee Chan");
  assert(queries.some(q=>q[1]==="workspace_id"&&q[2]==="renee"));assert(!queries.some(q=>q[0].endsWith("invitations")));
  for(const method of ["POST","PATCH","DELETE"]) assert.equal((await ctx.exports[method]({json:async()=>({userId:"other",role:"admin"})})).status,403);
  role="owner";result=await ctx.exports.GET();assert.equal(result.body.members[1].email,"renee@example.com");
  authenticated=false;assert.equal((await ctx.exports.GET()).status,401);
  const native=fs.readFileSync("/Users/tommytsang/Desktop/SOON/soon-idea-ios/app/(egg)/creator/team.tsx","utf8");
  assert(native.includes('role !== "member" && member.role !== "owner"'));assert(native.includes("request !== generation.current"));assert(native.includes("setLoading(true)"));assert(native.includes('!loading && !error'));
  console.log("PASS member roster, workspace scope, private emails, all mutation denials, owner view, anonymous denial, native loading/race guards.");
})().catch(e=>{console.error(e);process.exitCode=1});
