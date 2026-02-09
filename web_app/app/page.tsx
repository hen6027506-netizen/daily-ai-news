"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// === ⚠️ 記得填入你自己的 Key ===
const SUPABASE_URL = 'https://gujepdwzojlclwngcvxr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1amVwZHd6b2psY2x3bmdjdnhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDc0MTQsImV4cCI6MjA4NDMyMzQxNH0.LeHWeq0xhenh94RWmQGYI23JM1myM6HCWBusXHU8G00';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface Vocab {
  word: string;
  def: string;
  ex: string;
}

interface Article {
  id: number;
  title: string;
  source_name: string;
  published_at: string;
  original_url: string;
  category: string;
  is_saved: boolean; // 👈 新增這個狀態
  ai_analysis: {
    summary_short: string;
    sentiment_score: number;
    tags: string[];
    vocabulary: Vocab[];
  }[];
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [openVocabId, setOpenVocabId] = useState<number | null>(null);

  // 1. 抓取新聞
  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_items')
      .select('*, ai_analysis(*)')
      .order('created_at', { ascending: false });

    if (data) {
      setArticles(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNews();
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, []);

  // 👇 切換收藏狀態 (Save/Unsave)
  const toggleSave = async (id: number, currentStatus: boolean) => {
    // 1. 先在前端做樂觀更新 (讓使用者覺得很快)
    setArticles(prev => prev.map(item => 
      item.id === id ? { ...item, is_saved: !currentStatus } : item
    ));

    // 2. 背景更新資料庫
    const { error } = await supabase
      .from('news_items')
      .update({ is_saved: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error("收藏失敗", error);
      // 如果失敗，應該要變回來 (這裡省略複雜處理，簡單提示即可)
      alert("收藏失敗，請檢查網路");
    }
  };

  const toggleSpeech = (id: number, text: string) => {
    if (!window.speechSynthesis) return;
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.onend = () => setSpeakingId(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingId(id);
  };

  const toggleVocab = (id: number) => {
    setOpenVocabId(openVocabId === id ? null : id);
  };

  const filteredArticles = articles.filter(item => {
    // 如果選了 "已收藏" 分類，就只顯示收藏的新聞
    if (category === 'saved') return item.is_saved;
    
    const matchCategory = category === 'all' || item.category === category;
    const searchLower = searchTerm.toLowerCase();
    const analysis = item.ai_analysis?.[0];
    const matchSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchLower) ||
      analysis?.summary_short?.toLowerCase().includes(searchLower) || 
      analysis?.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#2c2c2c] font-serif">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Serif+TC:wght@400;700&family=Lato:wght@400;700&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-noto { font-family: 'Noto Serif TC', serif; }
        .news-card { animation: fadeIn 0.5s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="max-w-4xl mx-auto px-5 py-10">
        <header className="text-center mb-8 border-b-4 border-double border-[#2c2c2c] pb-5">
          <h1 className="font-playfair text-5xl md:text-6xl mb-2 tracking-tight">The Daily Insight</h1>
          <div className="text-sm text-gray-500 uppercase tracking-widest font-sans">
            Personal Knowledge Base • {new Date().toLocaleDateString()}
          </div>
        </header>

        <div className="sticky top-0 z-10 bg-[#fcfbf9]/95 backdrop-blur-sm py-4 mb-8 border-b border-gray-200">
          <div className="max-w-md mx-auto mb-4 relative">
            <input
              type="text"
              placeholder="🔍 搜尋新聞..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-full border border-gray-300 focus:border-[#2a9d8f] focus:outline-none focus:ring-1 focus:ring-[#2a9d8f] bg-white font-sans text-center transition-all"
            />
          </div>

          <nav className="flex flex-wrap justify-center gap-4 font-sans">
            {/* 加入一個「收藏」的分類按鈕 */}
            <button
               onClick={() => setCategory('saved')}
               className={`px-3 py-1 text-sm uppercase tracking-wider transition-all border-b-2 
                 ${category === 'saved' 
                   ? 'border-[#e76f51] text-[#e76f51] font-bold' 
                   : 'border-transparent text-gray-400 hover:text-[#e76f51]'
                 }`}
            >
              ❤️ Saved
            </button>
            <span className="text-gray-300">|</span>
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
        </div>

        <main>
          {loading ? (
            <p className="text-center text-gray-400 mt-10">Loading...</p>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No articles found.</div>
          ) : (
            filteredArticles.map((item) => {
              const analysis = item.ai_analysis?.[0] || { summary_short: "AI 處理中...", sentiment_score: 0, tags: [], vocabulary: [] };
              const moodWidth = Math.max(10, (analysis.sentiment_score + 1) * 50);
              const isSpeaking = speakingId === item.id;
              const isVocabOpen = openVocabId === item.id;
              const hasVocab = analysis.vocabulary && analysis.vocabulary.length > 0;

              return (
                <div key={item.id} className="news-card mb-12 pb-8 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="font-playfair text-3xl leading-tight hover:text-[#2a9d8f] transition-colors flex-1">
                      <a href={item.original_url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                    </h2>
                    
                    {/* 👇 收藏按鈕 */}
                    <button 
                      onClick={() => toggleSave(item.id, item.is_saved)}
                      className="ml-4 text-2xl transition-transform active:scale-90 hover:opacity-80"
                      title={item.is_saved ? "取消收藏" : "加入收藏"}
                    >
                      {item.is_saved ? '❤️' : '🤍'}
                    </button>
                  </div>

                  <div className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-wide font-sans flex items-center justify-between flex-wrap gap-2">
                    <span>{item.source_name} • {item.published_at}</span>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleSpeech(item.id, analysis.summary_short)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all border
                          ${isSpeaking 
                            ? 'bg-[#2a9d8f] text-white border-[#2a9d8f] animate-pulse' 
                            : 'bg-white text-gray-500 border-gray-300 hover:border-[#2a9d8f] hover:text-[#2a9d8f]'
                          }`}
                      >
                        {isSpeaking ? '⏹️ Stop' : '🔈 Listen'}
                      </button>

                      {hasVocab && (
                        <button 
                          onClick={() => toggleVocab(item.id)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all border
                            ${isVocabOpen 
                              ? 'bg-[#e76f51] text-white border-[#e76f51]' 
                              : 'bg-white text-[#e76f51] border-[#e76f51] hover:bg-[#e76f51] hover:text-white'
                            }`}
                        >
                          {isVocabOpen ? '📕 Close' : '📖 Vocab'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#f4f4f4] p-5 border-l-4 border-[#2a9d8f] text-lg text-gray-700 mb-4 font-noto leading-relaxed">
                    {analysis.summary_short}
                  </div>

                  {isVocabOpen && analysis.vocabulary && (
                    <div className="mb-6 bg-[#fff8f0] p-5 rounded-lg border border-[#e76f51]/20 animation-fadeIn">
                      <h3 className="font-playfair text-xl mb-4 text-[#e76f51]">Key Vocabulary</h3>
                      <div className="space-y-4">
                        {analysis.vocabulary.map((vocab, idx) => (
                          <div key={idx} className="border-b border-[#e76f51]/10 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="font-bold text-lg text-[#2c2c2c]">{vocab.word}</span>
                              <span className="text-sm text-gray-500 font-noto">{vocab.def}</span>
                            </div>
                            <p className="text-sm text-gray-600 italic font-serif">"{vocab.ex}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs font-sans">
                    {analysis.tags && analysis.tags.map((tag, idx) => (
                      <span key={idx} className="bg-white border border-gray-300 px-2 py-1 rounded text-gray-600">
                        🏷️ {tag}
                      </span>
                    ))}
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