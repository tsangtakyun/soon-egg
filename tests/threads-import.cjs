const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(source){const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,URL});return exports;}
const {isSupportedTopicUrl:allowed}=load(fs.readFileSync('src/lib/topic-url-policy.ts','utf8'));
for(const host of ['threads.com','www.threads.com','threads.net','www.threads.net'])for(const path of ['/share/_wkVpqjts/','/@creator/post/ABC'])assert.equal(allowed(new URL(`https://${host}${path}`)),true);
for(const url of ['http://threads.com/share/a','https://threads.com.evil.test/a','https://evilthreads.com/a','https://threads.com@evil.test/a','https://user:pass@threads.com/a','https://threads.com:8080/a'])assert.equal(allowed(new URL(url)),false,url);
assert.equal(allowed(new URL('https://www.adaymag.com/a')),false);
assert.equal(allowed(new URL('https://www.adaymag.com/a'),true),true);
for(const file of ['src/app/api/mobile/topics/route.ts','src/app/api/topics/route.ts']){
 const source=fs.readFileSync(file,'utf8');
 assert.equal((source.match(/!isSupportedTopicUrl\(parsedUrl/g)||[]).length,file.includes('/mobile/')?2:1);
 assert.ok(!source.includes('const allowedHosts'));
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
 const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['metaValue','decodeHtml','platformName'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\n');
 const {metaValue,decodeHtml,platformName}=load(functions+'\nexport {metaValue,decodeHtml,platformName};');
 assert.equal(platformName('www.threads.com'),'Threads');
 assert.equal(decodeHtml('&#x5df4;&#x9ece; &amp; &#039;'),'巴黎 & \u0027');
 if(process.env.THREADS_HTML){const html=fs.readFileSync(process.env.THREADS_HTML,'utf8');assert.match(decodeHtml(metaValue(html,'og:description')),/巴黎/);assert.match(decodeHtml(metaValue(html,'og:image')),/^https:\/\//);assert.ok(!decodeHtml(metaValue(html,'og:image')).includes('&amp;'));}
}
assert.match(fs.readFileSync('src/app/api/mobile/topics/route.ts','utf8'),/pageImage = decodeHtml\(metaValue/);
console.log('PASS Threads old/new domains, share/post URLs, unsafe host rejection, three import gates, platform and metadata decoding');
