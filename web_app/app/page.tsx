"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// === ⚠️ 請在這裡填入你的 Supabase 連線資訊 ===
const SUPABASE_URL = '你的_SUPABASE_URL_貼在這裡';
const SUPABASE_KEY = '你的_SUPABASE_ANON_KEY_貼在這裡';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Article {
  id: number;
  title: string;
  source_name: string;
  published_at: string;
  original_url: string;
  category: string;
  ai_analysis: {
    summary_short: string;
    sentiment_score: number;
    tags: string[];
  }[];
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  // 1. 抓取新聞
  useEffect(() => {
    const fetchNews = async () => {
      const { data, error } = await supabase
        .table('news_items')
        .select('*, ai_analysis(*)')
        .order('created_at', { ascending: false });

      if (data) {
        setArticles(data as any);
      }
      setLoading(false);
    };
    fetchNews();
  }, []);

  // 2. 篩選邏輯
  const filteredArticles = category === 'all' 
    ? articles 
    : articles.filter(item => item.category === category);

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#2c2c2c] font-serif">
      {/* CSS Styles (為了保持設計一致，我們直接寫在這裡) */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Serif+TC:wght@400;700&family=Lato:wght@400;700&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-noto { font-family: 'Noto Serif TC', serif; }
        .news-card { animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="max-w-4xl mx-auto px-5 py-10">
        {/* Header */}
        <header className="text-center mb-10 border-b-4 border-double border-[#2c2c2c] pb-5">
          <h1 className="font-playfair text-5xl md:text-6xl mb-2 tracking-tight">The Daily Insight</h1>
          <div className="text-sm text-gray-500 uppercase tracking-widest font-sans">
            AI Curated • {new Date().toLocaleDateString()} • Vol. 1
          </div>
        </header>

        {/* Navigation */}
        <nav className="flex flex-wrap justify-center gap-4 mb-10 font-sans">
          {['all', '科技', '財經', '科學', '生活'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-sm uppercase tracking-wider transition-all border-b-2 
                ${category === cat 
                  ? 'border-[#2a9d8f] text-black font-bold' 
                  : 'border-transparent text-gray-500 hover:text-black hover:border-gray-300'
                }`}
            >
              {cat === 'all' ? '全部 All' : cat}
            </button>
          ))}
        </nav>

        {/* News List */}
        <main>
          {loading ? (
            <p className="text-center text-gray-400 mt-10">正在載入來自全世界的洞察...</p>
          ) : filteredArticles.length === 0 ? (
            <p className="text-center text-gray-400 mt-10">目前這個分類沒有新聞。</p>
          ) : (
            filteredArticles.map((item) => {
              const analysis = item.ai_analysis?.[0] || { summary_short: "AI 正在消化這篇文章...", sentiment_score: 0, tags: [] };
              const moodWidth = Math.max(10, (analysis.sentiment_score + 1) * 50);

              return (
                <div key={item.id} className="news-card mb-12 pb-8 border-b border-gray-200">
                  <h2 className="font-playfair text-3xl mb-3 leading-tight hover:text-[#2a9d8f] transition-colors">
                    <a href={item.original_url} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h2>
                  <div className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wide font-sans">
                    {item.source_name} • {item.published_at}
                  </div>
                  <div className="bg-[#f4f4f4] p-5 border-l-4 border-[#2a9d8f] text-lg text-gray-700 mb-4 font-noto leading-relaxed">
                    {analysis.summary_short}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
                    {analysis.tags && analysis.tags.map((tag, idx) => (
                      <span key={idx} className="bg-white border border-gray-300 px-2 py-1 rounded text-gray-600">
                        🏷️ {tag}
                      </span>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-gray-400 tracking-widest text-[10px]">MOOD</span>
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2a9d8f]" style={{ width: `${moodWidth}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}