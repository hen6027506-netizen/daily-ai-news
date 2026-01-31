import os
import requests
import json
import time
from datetime import datetime, timedelta # 👈 記得引入這兩個時間工具
from bs4 import BeautifulSoup
from supabase import create_client, Client
import google.generativeai as genai

# === 1. 設定與連線 ===
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
LINE_NOTIFY_TOKEN = os.environ.get("LINE_NOTIFY_TOKEN")

if not SUPABASE_URL or not SUPABASE_KEY or not GOOGLE_API_KEY:
    print("❌ 錯誤：找不到環境變數")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)

target_model = "models/gemini-flash-latest"
model = genai.GenerativeModel(target_model)
WEB_APP_URL = "https://你的網址.vercel.app" 

NEWS_SOURCES = [
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/"},
    {"name": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex"},
    {"name": "BBC World", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"},
    {"name": "ScienceDaily", "url": "https://www.sciencedaily.com/rss/all.xml"}
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
}

def send_line_notify(msg):
    if not LINE_NOTIFY_TOKEN: return
    headers = {"Authorization": "Bearer " + LINE_NOTIFY_TOKEN}
    try:
        requests.post("https://notify-api.line.me/api/notify", headers=headers, data={"message": msg})
    except: pass

def fetch_all_news():
    all_articles = []
    print(f"🌐 開始巡邏 {len(NEWS_SOURCES)} 個新聞頻道...")
    for source in NEWS_SOURCES:
        try:
            print(f"📡 正在連線: {source['name']}...")
            response = requests.get(source['url'], headers=HEADERS, timeout=10)
            if response.status_code != 200: continue
            soup = BeautifulSoup(response.content, "xml") 
            items = soup.find_all("item")[:1] 
            for item in items:
                title = item.title.text.strip() if item.title else ""
                link = item.link.text.strip() if item.link else ""
                if not title or not link: continue
                existing = supabase.from("news_items").select("id").eq("original_url", link).execute()
                if not existing.data:
                    all_articles.append({"title": title, "url": link, "source_name": source['name']})
        except Exception as e:
            print(f"❌ 錯誤: {e}")
    return all_articles

def analyze_with_gemini(title):
    print(f"🤖 AI 分析中: {title[:20]}...")
    prompt = f"""
    請閱讀新聞標題："{title}"
    這是一個英語學習新聞網站。請分析並輸出 JSON：
    {{
        "category": "請從 [科技, 財經, 科學, 生活] 中挑選一個最合適的",
        "summary_short": "50字以內的繁體中文摘要",
        "sentiment_score": 0.5,
        "tags": ["標籤1"],
        "vocabulary": [
            {{ "word": "單字", "def": "定義", "ex": "例句" }}
        ]
    }}
    請挑選 3 個相關英文單字。
    """
    try:
        response = model.generate_content(prompt)
        content = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except: return None

# === 🧹 自動清理功能 (新增) ===
def cleanup_old_news():
    print("🧹 開始執行過期新聞清理...")
    
    # 設定期限：30 天前
    days_to_keep = 30
    cutoff_date = (datetime.now() - timedelta(days=days_to_keep)).strftime('%Y-%m-%d')
    
    try:
        # 邏輯：刪除 (日期 < 30天前) AND (is_saved 為 FALSE 或 NULL)
        # 注意：Supabase 的 delete 會連動刪除 ai_analysis (如果有設定 foreign key cascade)
        # 如果沒有 cascade，可能會有殘留資料，但通常不會影響運作
        res = supabase.from("news_items").delete() \
            .lt("created_at", cutoff_date) \
            .eq("is_saved", False) \
            .execute()
        
        # 檢查刪了幾筆 (Supabase 回傳結構 data 裡就是刪除的項目)
        deleted_count = len(res.data) if res.data else 0
        
        if deleted_count > 0:
            print(f"♻️ 成功清理了 {deleted_count} 篇未收藏的過期新聞")
        else:
            print("✨ 系統很乾淨，沒有需要清理的過期新聞")
            
    except Exception as e:
        print(f"⚠️ 清理過程發生錯誤: {e}")

def main():
    articles = fetch_all_news()
    if articles:
        success_count = 0
        for i, art in enumerate(articles):
            if i > 0: time.sleep(5)
            news_data = {
                "title": art['title'],
                "source_name": art['source_name'],
                "published_at": time.strftime('%Y-%m-%d'),
                "original_url": art['url'],
                "processing_status": "pending",
                "is_saved": False # 預設不收藏
            }
            try:
                res = supabase.from("news_items").insert(news_data).execute()
                if not res.data: continue
                news_id = res.data[0]['id']
                ai_res = analyze_with_gemini(art['title'])
                if ai_res:
                    supabase.from("news_items").update({
                        "category": ai_res.get("category", "科技"),
                        "processing_status": "complete"
                    }).eq("id", news_id).execute()
                    
                    analysis_data = {
                        "news_id": news_id,
                        "summary_short": ai_res.get("summary_short"),
                        "sentiment_score": ai_res.get("sentiment_score", 0),
                        "tags": ai_res.get("tags", []),
                        "vocabulary": ai_res.get("vocabulary", [])
                    }
                    supabase.from("ai_analysis").insert(analysis_data).execute()
                    print("   ✅ 資料庫寫入完成")
                    success_count += 1
            except Exception as e: print(f"⚠️ 失敗: {e}")

        if success_count > 0:
            send_line_notify(f"\n\n🇬🇧 英語學習日報已出刊！\n\n📊 新增：{success_count} 篇\n🔗 {WEB_APP_URL}")
    
    # 🏃‍♂️ 每次跑完新聞抓取後，順便打掃環境
    cleanup_old_news()

if __name__ == "__main__":
    main()