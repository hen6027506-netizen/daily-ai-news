import type { Metadata, Viewport } from "next"; // 👈 記得引入 Viewport
import "./globals.css";

// 1. 新增這個 Viewport 設定 (讓手機版面更穩定)
export const viewport: Viewport = {
  themeColor: "#fcfbf9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// 2. 修改 Metadata，加入 manifest
export const metadata: Metadata = {
  title: "The Daily Insight",
  description: "AI Curated Daily News",
  manifest: "/manifest.json", // 👈 關鍵就是加這一行！
  icons: {
    icon: "/icon.png",        // 👈 還有這裡
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}