const fs=require("fs"),vm=require("vm"),ts=require("typescript"),assert=require("node:assert/strict");
const c={exports:{},URL};
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/team-identities.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,c);
const {publicIdentity,teamIdentities}=c.exports;
assert.equal(publicIdentity({full_name:"Tommy",avatar_url:"https://example.com/avatar.png",access_token:"secret"},"alias").name,"Tommy");
assert.equal(publicIdentity({avatar_url:"javascript:alert(1)"},"alias").avatarUrl,null);
assert.equal(publicIdentity({picture:"https://example.com/a.jpg"},"alias").avatarUrl,"https://example.com/a.jpg");
(async()=>{
  const requested=[];
  const admin={auth:{admin:{getUserById:async id=>{requested.push(id);if(id==="broken")throw Error("offline");return {data:{user:{user_metadata:{full_name:"Real Name",avatar_url:"https://example.com/user.jpg",secret:"not-public"}}}}}}}};
  const rows=await teamIdentities(admin,[{user_id:"self",email:"me@example.com",role:"member"},{user_id:"other",email:"other@example.com",role:"owner"},{user_id:"broken",email:"fallback@example.com",role:"member"}],"self",false);
  assert.equal(requested.join(","),"self,other,broken");assert.equal(rows[0].name,"Real Name");assert.equal(rows[0].isSelf,true);assert.equal(rows[1].email,"");assert.equal(rows[1].avatarUrl,"https://example.com/user.jpg");assert.equal(rows[2].name,"fallback");assert.equal(rows[2].avatarUrl,null);assert(!JSON.stringify(rows).includes("not-public"));
  console.log("PASS personal metadata identity, photo, fallback on failure, no workspace substitution, private fields excluded.");
})().catch(e=>{console.error(e);process.exitCode=1});
