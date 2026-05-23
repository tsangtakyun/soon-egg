"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, GripVertical, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileBlock } from "./PhonePreview";

type Draft = {
  title: string;
  url: string;
};

const emptyDraft = { title: "", url: "" };

function isValidUrl(url: string) {
  return /^(https?:\/\/|mailto:).+/i.test(url.trim());
}

export function BlockEditor({
  creatorId,
  blocks,
  onBlocksChange,
  blocksError,
}: {
  creatorId: string;
  blocks: ProfileBlock[];
  onBlocksChange: (blocks: ProfileBlock[]) => void;
  blocksError?: string;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const canAdd = newDraft.title.trim().length > 0 && isValidUrl(newDraft.url);
  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [blocks],
  );

  const showError = (message = "操作失敗，請稍後再試。") => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const persistBlock = async (id: string, values: Partial<ProfileBlock>) => {
    const supabase = createClient();
    const { error } = await supabase.from("egg_profile_blocks").update(values).eq("id", id);
    if (error) throw error;
  };

  const toggleVisible = async (block: ProfileBlock) => {
    const nextVisible = block.is_visible === false;
    const nextBlocks = blocks.map((item) => item.id === block.id ? { ...item, is_visible: nextVisible } : item);
    onBlocksChange(nextBlocks);

    try {
      await persistBlock(block.id, { is_visible: nextVisible });
    } catch {
      onBlocksChange(blocks);
      showError();
    }
  };

  const startEdit = (block: ProfileBlock) => {
    setConfirmDeleteId(null);
    setEditingId(block.id);
    setEditDraft({ title: block.title ?? "", url: block.url ?? "" });
  };

  const saveEdit = async (block: ProfileBlock) => {
    if (!editDraft.title.trim() || !isValidUrl(editDraft.url)) return;

    const nextBlocks = blocks.map((item) => item.id === block.id ? { ...item, title: editDraft.title.trim(), url: editDraft.url.trim() } : item);
    onBlocksChange(nextBlocks);
    setEditingId(null);

    try {
      await persistBlock(block.id, { title: editDraft.title.trim(), url: editDraft.url.trim() });
    } catch {
      onBlocksChange(blocks);
      showError();
    }
  };

  const deleteBlock = async (block: ProfileBlock) => {
    const nextBlocks = blocks.filter((item) => item.id !== block.id);
    onBlocksChange(nextBlocks);
    setConfirmDeleteId(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("egg_profile_blocks").delete().eq("id", block.id);
      if (error) throw error;
    } catch {
      onBlocksChange(blocks);
      showError();
    }
  };

  const addBlock = async () => {
    if (!canAdd) return;

    const maxSortOrder = sortedBlocks.reduce((max, block) => Math.max(max, block.sort_order ?? 0), 0);
    const payload = {
      creator_id: creatorId,
      title: newDraft.title.trim(),
      url: newDraft.url.trim(),
      block_type: "link",
      is_visible: true,
      sort_order: maxSortOrder + 1,
      click_count: 0,
    };

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("egg_profile_blocks").insert(payload).select("*").single();
      if (error) throw error;

      onBlocksChange([...blocks, data as ProfileBlock]);
      setNewDraft(emptyDraft);
      setIsAdding(false);
    } catch {
      showError();
    }
  };

  const persistSortOrder = async (nextBlocks: ProfileBlock[]) => {
    try {
      const supabase = createClient();
      await Promise.all(
        nextBlocks.map((block, index) => (
          supabase
            .from("egg_profile_blocks")
            .update({ sort_order: index + 1 })
            .eq("id", block.id)
        )),
      );
    } catch {
      showError("排序未能儲存，請稍後再試。");
    }
  };

  const dropOnBlock = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;

    const current = [...sortedBlocks];
    const fromIndex = current.findIndex((block) => block.id === draggingId);
    const toIndex = current.findIndex((block) => block.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    const nextBlocks = current.map((block, index) => ({ ...block, sort_order: index + 1 }));
    onBlocksChange(nextBlocks);
    setDraggingId(null);
    void persistSortOrder(nextBlocks);
  };

  return (
    <section className="relative rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-zinc-950">Link in Bio Blocks</h2>
          <p className="mt-1 text-sm text-zinc-500">管理你的公開連結、顯示狀態和排序。</p>
        </div>
        <button type="button" onClick={() => setIsAdding(true)} className="inline-flex items-center gap-2 rounded-md bg-zinc-950 px-3 py-2 text-sm text-white">
          <Plus className="h-4 w-4" aria-hidden />
          新增
        </button>
      </div>

      {toast && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{toast}</div>}
      {blocksError && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">連結未能載入：{blocksError}</div>}

      <div className="mt-4 space-y-3">
        {!blocksError && sortedBlocks.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-500">
            暫時未有連結，按「新增」建立第一個 Link in Bio 連結。
          </div>
        )}
        {sortedBlocks.map((block) => {
          const isEditing = editingId === block.id;
          const isVisible = block.is_visible !== false;

          return (
            <div
              key={block.id}
              draggable={!isEditing}
              onDragStart={() => setDraggingId(block.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOnBlock(block.id)}
              className={`flex items-center gap-3 rounded-lg border border-zinc-200 p-3 ${isVisible ? "" : "opacity-50"}`}
            >
              <GripVertical className="h-4 w-4 cursor-grab text-zinc-400" aria-hidden />
              <Link2 className="h-4 w-4 text-zinc-500" aria-hidden />

              {isEditing ? (
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <input
                    value={editDraft.title}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, title: event.target.value }))}
                    placeholder="標題"
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                  <input
                    value={editDraft.url}
                    onChange={(event) => setEditDraft((draft) => ({ ...draft, url: event.target.value }))}
                    placeholder="網址"
                    className="rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-950">{block.title}</div>
                  <div className="truncate text-xs text-zinc-500">{block.url}</div>
                </div>
              )}

              <div className="flex items-center gap-1">
                {isEditing ? (
                  <>
                    <IconButton label="儲存" onClick={() => saveEdit(block)} disabled={!editDraft.title.trim() || !isValidUrl(editDraft.url)}>
                      <Check className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton label="取消" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <IconButton label={isVisible ? "隱藏" : "顯示"} onClick={() => toggleVisible(block)}>
                      {isVisible ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                    </IconButton>
                    <IconButton label="編輯" onClick={() => startEdit(block)}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </IconButton>
                    <IconButton label="刪除" onClick={() => {
                      setEditingId(null);
                      setConfirmDeleteId(block.id);
                    }}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </IconButton>
                  </>
                )}
              </div>

              {confirmDeleteId === block.id && (
                <div className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600">
                  <span className="whitespace-nowrap">確定刪除？</span>
                  <IconButton label="確認刪除" onClick={() => deleteBlock(block)}>
                    <Check className="h-4 w-4" aria-hidden />
                  </IconButton>
                  <IconButton label="取消刪除" onClick={() => setConfirmDeleteId(null)}>
                    <X className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              )}

              <div className="font-mono text-xs text-zinc-500">{block.click_count ?? 0} clicks</div>
            </div>
          );
        })}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-950">新增連結</h3>
              <button type="button" onClick={() => setIsAdding(false)} className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100" aria-label="關閉">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                value={newDraft.title}
                onChange={(event) => setNewDraft((draft) => ({ ...draft, title: event.target.value }))}
                placeholder="標題"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                required
              />
              <input
                value={newDraft.url}
                onChange={(event) => setNewDraft((draft) => ({ ...draft, url: event.target.value }))}
                placeholder="網址，例如 https://example.com"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                required
              />
              {newDraft.url && !isValidUrl(newDraft.url) && (
                <p className="text-xs text-red-500">網址必須以 http://、https:// 或 mailto: 開始。</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600">
                取消
              </button>
              <button type="button" onClick={addBlock} disabled={!canAdd} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                新增
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-40"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
