import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "聯絡我們", description: "聯絡 SOON-EGG 支援團隊" };

export default function ContactPage() {
  return <LegalPage title="聯絡我們" summary="遇到帳戶、連接、資料或合作問題，可以直接聯絡 SOON-EGG 團隊。">
    <section><h2>電郵支援</h2><p><a className="font-semibold underline" href="mailto:hello@sooncreator.network">hello@sooncreator.network</a></p><p>請附上帳戶電郵、創作者用戶名、發生問題的頁面及大約時間。如畫面有錯誤參考編號，請一併提供；請勿傳送密碼或 access token。</p></section>
    <section><h2>營運資料</h2><p>SOON-EGG 由 their.studio Limited 營運，服務亞洲創作者及合作團隊。</p></section>
  </LegalPage>;
}
