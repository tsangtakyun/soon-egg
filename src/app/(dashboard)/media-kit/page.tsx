import { PitchDrafter } from "@/components/brand-deals/PitchDrafter";
import { MediaKitCard } from "@/components/media-kit/MediaKitCard";

export default function MediaKitPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">Media Kit</h1>
        <p className="mt-2 text-zinc-500">MOON 自動把你的受眾、內容定位和合作形式整理成品牌能快速理解的資料。</p>
      </div>
      <MediaKitCard />
      <PitchDrafter />
    </div>
  );
}
