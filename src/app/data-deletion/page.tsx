import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "資料刪除", description: "要求刪除 SOON-EGG 帳戶及資料" };

export default function DataDeletionPage() {
  return <LegalPage title="資料刪除要求" summary="你可以要求刪除 SOON-EGG 帳戶及與帳戶相關的個人資料。">
    <section><h2>提出要求</h2><p>請由註冊電郵寄信至 <a className="font-semibold underline" href="mailto:hello@sooncreator.network?subject=SOON-EGG%20資料刪除要求">hello@sooncreator.network</a>，主旨填寫「SOON-EGG 資料刪除要求」，並提供帳戶電郵及創作者用戶名。切勿在電郵提供密碼或 access token。</p></section>
    <section><h2>處理程序</h2><ul><li>我們會先核實要求者身份及其工作空間權限。</li><li>如帳戶屬於團隊工作空間，我們會區分個人帳戶資料與工作空間擁有者需要保留的資料。</li><li>完成核實後，我們會按適用法律及必要保存責任刪除或匿名化資料，並以電郵確認。</li></ul></section>
    <section><h2>社交平台資料</h2><p>你亦可在 Meta／Instagram 或其他已連接平台的設定中撤銷 SOON-EGG 權限。撤銷授權會停止日後同步；如要刪除 SOON-EGG 已保存的相關資料，仍請提交上述要求。</p></section>
  </LegalPage>;
}
