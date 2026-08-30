import { EggLoader } from "@/components/ui/EggLoader";

export default function TopicLibraryLoading() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200 px-5 py-4 lg:px-6">
        <div className="h-6 w-32 animate-pulse rounded-md bg-zinc-100" />
        <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-zinc-100" />
      </header>
      <section className="px-3 py-5 sm:px-5 lg:px-6">
        <div className="h-12 animate-pulse rounded-xl bg-zinc-100" />
        <EggLoader label="正在整理題材靈感…" size="lg" />
      </section>
    </main>
  );
}
