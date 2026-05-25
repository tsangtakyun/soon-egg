import { enterTool } from "@/lib/tools";

export default async function StoryboardPage() {
  const { balance } = await enterTool("storyboard", "進入分鏡工作台");

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <span className="text-xs text-gray-400">分鏡工作台</span>
        <span className="text-xs text-gray-500">
          目前餘額 {balance.toLocaleString()} credits
        </span>
      </div>
      <iframe
        src="https://soon-storyboard.vercel.app/storyboard"
        className="w-full flex-1 border-0"
        allow="autoplay"
        title="IG Reel 分鏡工作台"
      />
    </div>
  );
}
