"use client";

export function InsufficientCreditsModal({
  balance,
  required,
  onClose,
}: {
  balance: number;
  required: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-2xl">🪙</div>
        <h2 className="mt-4 text-xl font-bold text-zinc-950">Credits 不足</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          目前餘額 {balance} Credits，需要 {required} Credits 才能進入工具。
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
