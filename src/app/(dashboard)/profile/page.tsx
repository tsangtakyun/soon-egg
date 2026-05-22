import { LinkInBio } from "@/components/profile/LinkInBio";

export default function ProfilePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-zinc-950">我的主頁</h1>
        <p className="mt-2 text-zinc-500">編輯你的 Link in Bio，公開網址為 sooncreator.network/soon_egg。</p>
      </div>
      <LinkInBio />
    </div>
  );
}
