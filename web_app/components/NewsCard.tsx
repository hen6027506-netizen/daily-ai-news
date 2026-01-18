"use client";
import { motion } from "framer-motion";
import { Tag, ExternalLink } from "lucide-react";

export default function NewsCard({ data }: { data: any }) {
  // 根據情緒分數決定顏色 (正面: 綠 / 負面: 藍 / 中立: 灰)
  const getMoodColor = (score: number) => {
    if (score > 0.3) return "bg-accent-sage";
    if (score < -0.3) return "bg-accent-slate";
    return "bg-gray-400";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative border-b border-ink/10 pb-8 mb-8 last:border-0"
    >
      {/* 1. 報紙風格標題 */}
      <div className="flex justify-between items-start gap-4 mb-3">
        <h2 className="text-2xl font-serif font-bold text-ink-dark leading-tight group-hover:text-accent-terracotta transition-colors">
          <a href={data.news.original_url} target="_blank" rel="noopener noreferrer">
            {data.news.title}
          </a>
        </h2>
        <a href={data.news.original_url} target="_blank" className="text-ink-light opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink size={18} />
        </a>
      </div>

      {/* 2. 資訊列 (來源 + 時間) */}
      <div className="flex items-center gap-3 text-sm text-ink-light font-sans mb-4 uppercase tracking-wider">
        <span className="font-bold">{data.news.source_name}</span>
        <span>•</span>
        <span>{new Date(data.news.published_at).toLocaleDateString()}</span>
      </div>

      {/* 3. AI 摘要 (模擬打字機效果容器) */}
      <div className="prose prose-p:text-ink prose-p:font-serif prose-p:leading-relaxed mb-6 bg-paper-dark/50 p-4 rounded-sm border-l-2 border-ink/20">
        <p>{data.summary_short}</p>
      </div>

      {/* 4. 底部工具列 (標籤 + 情緒溫度計) */}
      <div className="flex items-center justify-between">
        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          {data.tags?.map((tag: string) => (
            <span key={tag} className="flex items-center gap-1 text-xs font-mono text-ink-light border border-ink/20 px-2 py-1 rounded-sm">
              <Tag size={10} /> {tag}
            </span>
          ))}
        </div>

        {/* Sentiment Bar */}
        <div className="flex items-center gap-2" title={`情緒分數: ${data.sentiment_score}`}>
          <span className="text-xs font-mono text-ink-light uppercase">Mood</span>
          <div className={`h-2 w-16 rounded-full ${getMoodColor(data.sentiment_score)} opacity-80`}></div>
        </div>
      </div>
    </motion.div>
  );
}