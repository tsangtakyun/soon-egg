import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "私隱政策", description: "SOON-EGG 私隱政策" };

export default function PrivacyPage() {
  return <LegalPage title="私隱政策" summary="我們重視創作者及合作夥伴的私隱。本頁說明 SOON-EGG 如何處理你使用平台時提供的資料。">
    <section><h2>我們收集的資料</h2><ul><li>帳戶、創作者檔案、聯絡資料及工作空間成員資料。</li><li>你連接的社交平台帳戶、公開內容、受眾及成效數據；實際範圍取決於你授權的權限。</li><li>你上載的圖片、截圖、音訊、查詢、提示、AI 草稿、劇本及其他工作內容。</li><li>登入狀態、裝置、瀏覽器、IP、操作記錄及錯誤診斷資料。</li></ul></section>
    <section><h2>資料用途</h2><p>我們用資料提供帳戶及工作空間功能、生成內容、整理合作查詢、顯示分析、改善安全及可靠性、處理支援要求，以及履行法律責任。我們不會出售你的個人資料。</p></section>
    <section><h2>服務供應商及跨境處理</h2><p>為提供服務，資料可能由雲端託管、資料庫、AI、付款及已連接社交平台供應商處理，包括 Vercel、Supabase、Anthropic、Meta／Instagram，以及在啟用付款功能時的 Stripe。資料可能在你所在地以外處理。</p></section>
    <section><h2>保存及安全</h2><p>我們只會在提供服務、解決爭議、安全防護及法律要求所需期間保存資料，並採用合理的技術及管理措施保護資料。互聯網服務不能保證絕對安全。</p></section>
    <section><h2>你的選擇</h2><p>你可取消社交平台授權、修訂帳戶資料，或按資料刪除頁提出存取、更正或刪除要求。工作空間擁有者及管理員可能按其權限查看工作空間內的內容。</p></section>
  </LegalPage>;
}
