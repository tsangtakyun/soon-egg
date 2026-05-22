import { GripVertical, Link2, Plus } from "lucide-react";
import { demoBlocks } from "@/lib/mock-data";

export function BlockEditor() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-zinc-950">Link in Bio Blocks</h2>
          <p className="mt-1 text-sm text-zinc-500">拖曳排序、切換可見狀態、管理轉換入口。</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm text-white">
          <Plus className="h-4 w-4" aria-hidden />
          新增
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {demoBlocks.map((block) => (
          <div key={block.id} className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
            <GripVertical className="h-4 w-4 text-zinc-400" aria-hidden />
            <Link2 className="h-4 w-4 text-zinc-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-zinc-950">{block.title}</div>
              <div className="truncate text-xs text-zinc-500">{block.url}</div>
            </div>
            <div className="font-mono text-xs text-zinc-500">{block.click_count} clicks</div>
          </div>
        ))}
      </div>
    </section>
  );
}
