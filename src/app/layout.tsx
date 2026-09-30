import type { Metadata } from "next";
import { Nunito, Nunito_Sans } from "next/font/google";
import { Suspense } from "react";
import { GlobalInteractionFeedback } from "@/components/ui/GlobalInteractionFeedback";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://egg.sooncreator.network"),
  verification: {
    google: "8kQZ6v6Yobii6NmcCkVM3qLDHNBNW1eHn4_5HHoMsv0",
  },
  title: {
    default: "SOON-EGG Creator Network",
    template: "%s · SOON-EGG",
  },
  description: "為亞洲創作者而設的 AI 內容、商務合作及受眾分析工作平台。",
  applicationName: "SOON-EGG",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_HK",
    url: "/",
    siteName: "SOON-EGG Creator Network",
    title: "SOON-EGG Creator Network",
    description: "為亞洲創作者而設的 AI 內容、商務合作及受眾分析工作平台。",
    images: [{ url: "/soon-egg.png", alt: "SOON-EGG" }],
  },
  twitter: {
    card: "summary",
    title: "SOON-EGG Creator Network",
    description: "為亞洲創作者而設的 AI 內容、商務合作及受眾分析工作平台。",
    images: ["/soon-egg.png"],
  },
  icons: {
    icon: "/soon-egg.png",
    shortcut: "/soon-egg.png",
    apple: "/soon-egg.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK" className="h-full antialiased">
      <body className={`${nunito.variable} ${nunitoSans.variable} flex min-h-full flex-col`}>
        <Suspense fallback={null}><GlobalInteractionFeedback /></Suspense>
        {children}
      </body>
    </html>
  );
}
