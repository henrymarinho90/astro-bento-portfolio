import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
test('the real CMS transport has a finite 20-second deadline instead of hanging a build', async () => {
 const source=await readFile(new URL('../src/lib/directus.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace("'@directus/sdk'",JSON.stringify(import.meta.resolve('@directus/sdk')));
 const oldFetch=globalThis.fetch, oldTimeout=AbortSignal.timeout;
 let signal,deadline;
 try {
  AbortSignal.timeout=(ms)=>{deadline=ms;return oldTimeout(ms)};
  globalThis.fetch=async(_url,init)=>{signal=init?.signal;return new Response(JSON.stringify({data:[]}),{headers:{'content-type':'application/json'}})};
  const cms=await import(`data:text/javascript;base64,${Buffer.from(code+'\n// transport test').toString('base64')}`);
  assert.deepEqual(await cms.getPublishedProjects(),[]);
  assert.ok(signal instanceof AbortSignal,'CMS requests must carry an abort signal');
  assert.equal(deadline,20000);
 } finally {globalThis.fetch=oldFetch;AbortSignal.timeout=oldTimeout;}
});
