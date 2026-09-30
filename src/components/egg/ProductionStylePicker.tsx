'use client'
import { useEffect, useRef, useState } from 'react'
export type StyleChoice={recommendationId:string;code:string;materials:string[]}
type Result={id:string;emptyReason:string;styles:Array<{code:string;name:string;format:string;version:{number:number};recommendation?:{reason:string;gaps:string[]}} >}
const options=[['photos','可用圖片'],['footage','現場影片'],['presenter','可出鏡主持'],['research','已核實資料']]
export function ProductionStylePicker({projectId,angleId,recipeId,shootStatus,onChange}:{projectId:string;angleId:string;recipeId:string;shootStatus:string;onChange:(choice:StyleChoice|null)=>void}){
 const [materials,setMaterials]=useState<string[]>([]),[result,setResult]=useState<Result|null>(null),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const revision=useRef(0)
 useEffect(()=>{onChange(null);return()=>{revision.current++}},[onChange])
 async function analyze(){const version=++revision.current;setBusy(true);setError('');onChange(null);setSelected('');setResult(null)
  try{const response=await fetch(`/api/egg/projects/${projectId}/styles`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({angleId,recipeId,shootStatus,materials})});const data=await response.json();if(!response.ok)throw new Error(data.error);if(version===revision.current)setResult(data)}catch(e){if(version===revision.current)setError(e instanceof Error?e.message:'分析未完成，請重試。')}finally{if(version===revision.current)setBusy(false)}
 }
 function select(code:string){if(!result)return;setSelected(code);onChange({recommendationId:result.id,code,materials})}
 return <section aria-label="確認製作風格" className="mt-5 border-t border-zinc-200 pt-4"><h3 className="font-bold">確認製作風格</h3><p className="my-2 text-sm text-zinc-600">按內容方向、製作方式及素材配對。風格會用於劇本及製作包，並保存所選版本。</p>
 <div className="flex flex-wrap gap-3">{options.map(([id,label])=><label key={id} className="flex items-center gap-1 text-sm"><input type="checkbox" disabled={busy} checked={materials.includes(id)} onChange={e=>{setMaterials(old=>e.target.checked?[...old,id]:old.filter(v=>v!==id));setResult(null);setSelected('');onChange(null)}}/>{label}</label>)}</div>
 <button type="button" className="my-3 rounded-lg border px-3 py-2 disabled:opacity-40" disabled={busy||!angleId} onClick={()=>void analyze()}>{busy?'正在分析風格…':'分析合適風格'}</button>
 {error?<p role="alert">{error}</p>:null}
 {result?.styles.map(style=><article key={style.code} className="mb-3 rounded-xl border p-3"><h4 className="font-bold">{style.name} · 第 {style.version.number} 版</h4><p className="my-2 text-sm">{style.recommendation?.reason}</p>{style.recommendation?.gaps?.length?<details><summary>製作前需補充</summary><ul className="list-disc pl-5 text-sm">{style.recommendation.gaps.map(gap=><li key={gap}>{gap}</li>)}</ul></details>:null}<a className="my-2 block text-sm underline" target="_blank" rel="noreferrer" href={`https://soon-core.vercel.app/content-directions?format=${style.format}&style=${style.code}`}>查看風格及參考作品</a><button type="button" onClick={()=>select(style.code)} className="rounded-lg border px-3 py-2">{selected===style.code?'✓ 已選擇':'選用這款'}</button></article>)}
 {result&&!result.styles.length?<div><p>{result.emptyReason}</p><button type="button" className="my-2 rounded-lg border px-3 py-2" onClick={()=>select('basic')}>{selected==='basic'?'✓ 已確認基本做法':'按已選基本做法繼續'}</button></div>:null}</section>
}
