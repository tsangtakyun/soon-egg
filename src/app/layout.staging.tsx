import "./globals.css";
export const metadata = { title: "EGG Credits Staging Lab", robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-HK"><body style={{ color: "#211b19", background: "#faf8f5", fontFamily: "system-ui, sans-serif" }}>{children}</body></html>;
}
