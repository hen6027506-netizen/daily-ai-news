import os
import requests
import json
import time
from bs4 import BeautifulSoup
from supabase import create_client, Client
import google.generativeai as genai # 👈 換成 Google 套件

# === 1. 設定與連線 ===
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY") # 👈 讀取 Google Key

if not SUPABASE_URL or not SUPABASE_KEY or not GOOGLE_API_KEY:
    print("❌ 錯誤：找不到環境變數 (請檢查 GitHub Secrets)")
    exit(1)

# 初始化
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash') # 👈 使用免費且快速的模型

# === 2. 爬蟲函數 ===
def fetch_latest_news():
    print("🔍 正在搜尋 TechCrunch 新聞...")
    url = "https://techcrunch.com/"
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, "html.parser")
        articles = []
        
        # 抓取前 3 篇新聞 (避免額度用完)
        for item in soup.select(".loop-card__title a")[:3]:
            title = item.get_text().strip()
            link = item.get("href")
            
            # 簡單防重覆檢查
            existing = supabase.table("news_items").select("id").eq("original_url", link).execute()
            if not existing.data:
                articles.append({"title": title, "url": link})
        
        print(f"✅ 找到 {len(articles)} 篇新文章")
        return articles
    except Exception as e:
        print(f"❌ 爬蟲失敗: {e}")
        return []

# === 3. AI 分析函數 (Google 版) ===
def analyze_with_gemini(text):
    print("🤖 AI 正在閱讀...")
    prompt = f"""
    你是專業的科技新聞編輯。請閱讀以下新聞內容，並輸出純 JSON 格式的分析結果。
    
    格式要求：
    {{
        "summary_short": "50字以內的繁體中文摘要，語氣要吸引人",
        "summary_detailed": "條列式重點（繁體中文）",
        "sentiment_score": 0.5,
        "tags": ["標籤1", "標籤2"]
    }}

    新聞內容：
    {text[:2000]}
    """
    
    try:
        response = model.generate_content(prompt)
        content = response.text
        
        # 清理 Gemini 可能會輸出的 Markdown 符號
        content = content.replace("```json", "").replace("```", "").strip()
        
        return json.loads(content)
    except Exception as e:
        print(f"❌ AI 分析失敗: {e}")
        return None

# === 4. 主程式 ===
def main():
    news_list = fetch_latest_news()
    
    for news in news_list:
        print(f"處理中: {news['title']}")
        
        # 1. 存入 news_items
        news_data = {
            "title": news['title'],
            "source_name": "TechCrunch",
            "published_at": time.strftime('%Y-%m-%d'),
            "original_url": news['url']
        }
        result = supabase.table("news_items").insert(news_data).execute()
        news_id = result.data[0]['id']
        
        # 2. 進行 AI 分析
        ai_result = analyze_with_gemini(news['title']) # 簡單測試用標題分析
        
        if ai_result:
            # 3. 存入 ai_analysis
            analysis_data = {
                "news_id": news_id,
                "summary_short": ai_result.get("summary_short"),
                "summary_detailed": str(ai_result.get("summary_detailed")),
                "sentiment_score": ai_result.get("sentiment_score", 0),
                "tags": ai_result.get("tags", [])
            }
            supabase.table("ai_analysis").insert(analysis_data).execute()
            print("✅ 寫入資料庫成功！")

if __name__ == "__main__":
    main()