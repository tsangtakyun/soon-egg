const fs=require('fs'),vm=require('vm'),ts=require('typescript'),assert=require('node:assert/strict');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/topic-url-policy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject,URL,AbortSignal,fetch});
const {isSupportedTopicUrl:allowed,fetchTopicPage:read,isTopicAccessPage:blocked}=exportsObject;
for(const host of ['vm.tiktok.com','vt.tiktok.com','m.tiktok.com','xhslink.cn','xhslink.com'])assert.ok(allowed(new URL(`https://${host}/a`)));
assert.equal(allowed(new URL('https://vm.tiktok.com.evil.test/a')),false);
assert.ok(blocked(new URL('https://www.xiaohongshu.com/login')));
assert.ok(blocked(new URL('https://www.tiktok.com/a'),'Log in to TikTok'));
(async()=>{
 let calls=[];const fake=async u=>{calls.push(String(u));return calls.length===1?new Response(null,{status:302,headers:{location:'http://www.xiaohongshu.com/discovery/item/abc'}}):new Response('post');};
 assert.equal(await (await read(new URL('https://xhslink.cn/o/a'),false,fake)).text(),'post');
 assert.equal(calls[1],'https://www.xiaohongshu.com/discovery/item/abc');
 let count=0;await assert.rejects(read(new URL('https://vm.tiktok.com/a'),false,async()=>{count++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/private'}});}),/不支援/);assert.equal(count,1);
 await assert.rejects(read(new URL('https://xhslink.cn/a'),false,async()=>new Response(null,{status:302,headers:{location:'https://www.xiaohongshu.com/login'}})),/登入/);
 await assert.rejects(read(new URL('https://vm.tiktok.com/a'),false,async()=>new Response(null,{status:403})),/可讀內容/);
 await assert.rejects(read(new URL('https://vm.tiktok.com/a'),false,async()=>new Response(null,{status:302,headers:{location:'/a'}})),/次數過多/);
 console.log('PASS short hosts, HTTPS upgrade, bounded redirects, off-domain rejection, login and HTTP error handling');
 if(process.env.LIVE_SHORT_LINKS)for(const url of ['https://vm.tiktok.com/ZN8M4gWBr/','https://xhslink.cn/o/9bC8PmInwUl'])try{const r=await read(new URL(url));console.log(url,r.status,r.url);}catch(e){console.log(url,e.message);}
})().catch(e=>{console.error(e);process.exitCode=1});
