import { supabase } from "@/lib/supabase";
import NewsCard from "@/components/NewsCard";

// 強制由 Server 端撈取最新資料，不要快取 (確保你刷新就看到新新聞)
export const revalidate = 0;

export default async function Home() {
  // 1. 從 Supabase 資料庫撈取資料 (聯表查詢: AI分析 + 原始新聞)
  const { data: newsList, error } = await supabase
    .from("ai_analysis")
    .select(`
      *,
      news:news_items (
        title,
        source_name,
        published_at,
        original_url
      )
    `)
    .order("analyzed_at", { ascending: false });

  if (error) {
    console.error("Error fetching news:", error);
    return <div className="p-10 text-center">暫時無法讀取新聞...</div>;
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-6 py-12">
      {/* 刊頭 */}
      <header className="mb-16 text-center border-b-4 border-double border-ink pb-8">
        <h1 className="text-5xl font-serif font-black text-ink-dark mb-2 tracking-tight">
          The Daily Insight
        </h1>
        <p className="text-ink-light font-sans tracking-widest uppercase text-sm">
          AI Curated • {new Date().toLocaleDateString()} • Vol. 1
        </p>
      </header>

      {/* 新聞瀑布流 */}
      <section className="space-y-12">
        {newsList?.map((item) => (
          <NewsCard key={item.id} data={item} />
        ))}

        {newsList?.length === 0 && (
          <div className="text-center text-ink-light py-20 font-serif italic">
            目前沒有新聞，請執行 Python 腳本產生資料...
          </div>
        )}
      </section>
    </main>
  );
}