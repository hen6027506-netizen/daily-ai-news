import type { Metadata } from "next";
import { Noto_Serif_TC, Inter } from "next/font/google";
import "./globals.css";

// 1. 引入 Google Fonts (宋體與無襯線體)
const serif = Noto_Serif_TC({ 
  subsets: ["latin"], 
  weight: ["400", "700"],
  variable: "--font-serif",
  preload: false, 
});

const sans = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Daily AI Insight",
  description: "每日 AI 重點摘要",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      {/* 2. 在這裡套用我們定義的顏色與字體變數 */}
      <body className={`${serif.variable} ${sans.variable} font-serif bg-paper text-ink antialiased`}>
        {children}
      </body>
    </html>
  );
}