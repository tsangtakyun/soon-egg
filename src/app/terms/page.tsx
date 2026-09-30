import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "使用條款", description: "SOON-EGG 使用條款" };

export default function TermsPage() {
  return <LegalPage title="使用條款" summary="使用 SOON-EGG 即表示你同意以下條款；如你不同意，請停止使用服務。">
    <section><h2>帳戶及權限</h2><p>你須提供準確資料、保護登入憑證，並只連接你有權管理的社交帳戶。工作空間擁有者負責委派管理員及協作者權限；各使用者須尊重其獲授權範圍。</p></section>
    <section><h2>AI 內容</h2><p>AI 生成的 Brief、回覆、劇本、建議及分析只供輔助，可能不完整或不準確。你在發送、發佈、報價、簽約或作商業決定前，必須自行核對及承擔最終責任。</p></section>
    <section><h2>可接受使用</h2><p>你不得上載無權使用的內容、侵犯他人權利、繞過安全措施、干擾服務、散播惡意程式，或使用平台從事違法、欺詐或傷害他人的活動。</p></section>
    <section><h2>你的內容</h2><p>你保留內容權利，並授予我們在提供、維護及改善服務所需範圍內處理內容的權限。你須確保已取得所需同意及授權。</p></section>
    <section><h2>服務及責任</h2><p>服務可能更新、中斷或受第三方平台限制影響。我們會合理維護服務，但不保證永久無誤或所有第三方功能持續可用。在法律容許範圍內，我們不對間接或相應損失負責。</p></section>
  </LegalPage>;
}
