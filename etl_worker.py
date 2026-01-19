import os
import requests
import json
import time
from bs4 import BeautifulSoup
from supabase import create_client, Client
import google.generativeai as genai

# === 1. 設定與連線 ===
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or not GOOGLE_API_KEY:
    print("❌ 錯誤：找不到環境變數")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)

target_model = "models/gemini-flash-latest" 
print(f"🔒 強制鎖定模型: {target_model}")
model = genai.GenerativeModel(target_model)

# === 🚀 新聞來源清單 ===
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

# === 2. 抓取函數 ===
def fetch_all_news():
    all_articles = []
    print(f"🌐 開始巡邏 {len(NEWS_SOURCES)} 個新聞頻道...")
    
    for source in NEWS_SOURCES:
        try:
            print(f"📡 正在連線: {source['name']}...")
            response = requests.get(source['url'], headers=HEADERS, timeout=10)
            
            if response.status_code != 200:
                print(f"⚠️ {source['name']} 拒絕連線 (代碼: {response.status_code})")
                continue

            soup = BeautifulSoup(response.content, "xml") 
            items = soup.find_all("item")[:1] # 每個來源只抓 1 篇
            
            for item in items:
                title = item.title.text.strip() if item.title else ""
                link = item.link.text.strip() if item.link else ""
                
                if not title or not link: continue

                existing = supabase.table("news_items").select("id").eq("original_url", link).execute()
                if not existing.data:
                    all_articles.append({
                        "title": title,
                        "url": link,
                        "source_name": source['name']
                    })
        except Exception as e:  # 👈 這就是之前漏掉的關鍵救命符！
            print(f"❌ 抓取 {source['name']} 發生錯誤: {e}")
    
    print(f"🎉 巡邏完畢，共發現 {len(all_articles)} 篇新文章")
    return all_articles

# === 3. AI 分析函數 ===
def analyze_with_gemini(title):
    print(f"🤖 AI 分析中 (使用 {target_model}): {title[:20]}...")
    prompt = f"""
    請閱讀新聞標題："{title}"
    請直接輸出 JSON：
    {{
        "category": "請從 [科技, 財經, 科學, 生活] 中挑選一個最合適的",
        "summary_short": "50字以內的繁體中文摘要",
        "summary_detailed": "條列式重點（繁體中文）",
        "sentiment_score": 0.5,
        "tags": ["標籤1", "標籤2"]
    }}
    """
    try:
        response = model.generate_content(prompt)
        content = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"❌ AI 思考失敗: {e}")
        return None

# === 4. 主程式 ===
def main():
    articles = fetch_all_news()
    
    if not articles:
        print("😴 沒有發現任何新新聞，收工！")
        return

    for i, art in enumerate(articles):
        if i > 0:
            print("☕ 休息 5 秒...")
            time.sleep(5)

        news_data = {
            "title": art['title'],
            "source_name": art['source_name'],
            "published_at": time.strftime('%Y-%m-%d'),
            "original_url": art['url'],
            "processing_status": "pending"
        }
        try:
            res = supabase.table("news_items").insert(news_data).execute()
            if not res.data: continue
            news_id = res.data[0]['id']
            
            ai_res = analyze_with_gemini(art['title'])
            
            if ai_res:
                supabase.table("news_items").update({
                    "category": ai_res.get("category", "科技"),
                    "processing_status": "complete"
                }).eq("id", news_id).execute()
                
                analysis_data = {
                    "news_id": news_id,
                    "summary_short": ai_res.get("summary_short"),
                    "summary_detailed": str(ai_res.get("summary_detailed")),
                    "sentiment_score": ai_res.get("sentiment_score", 0),
                    "tags": ai_res.get("tags", [])
                }
                supabase.table("ai_analysis").insert(analysis_data).execute()
                print("   ✅ 資料庫寫入完成")
                
        except Exception as e:
            print(f"⚠️ 處理失敗: {e}")

if __name__ == "__main__":
    main()
