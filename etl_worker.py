import os
import json
import time
import google.generativeai as genai
from supabase import create_client, Client

# ================= 配置區 (請填入你的金鑰) =================
# 建議未來改用 .env 檔案管理，但在 MVP 階段直接填入即可
# 取得環境變數，如果讀不到（例如在本機沒設定），就回傳 None 或空字串
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
OPENAI_API_KEY = os.environ.get("GOOGLE_API_KEY")

# 檢查是否讀取成功 (選用，方便除錯)
if not SUPABASE_URL or not SUPABASE_KEY:
    print("警告：找不到資料庫連線資訊")

# 初始化客戶端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

# ================= 模擬資料來源 (Mock Data) =================
# 因為我們還沒寫爬蟲，先用這則新聞測試流程是否跑通
MOCK_NEWS = {
    "source_name": "TechCrunch",
    "original_url": "https://techcrunch.com/example/ai-news-2026",
    "title": "OpenAI 宣布與 Apple 達成深度合作，Siri 將全面整合 GPT-5",
    "content_raw": """
    (本則為測試用的模擬新聞)
    今日，OpenAI 執行長 Sam Altman 與 Apple 執行長 Tim Cook 共同宣布了一項歷史性的合作協議。
    未來的 iOS 19 將會在系統底層全面整合即將發布的 GPT-5 模型。
    這意味著 Siri 將不再只是簡單的語音助手，而是一個具備深度推理能力的 AI 代理人。
    
    根據發布會內容，新的 Siri 可以跨 App 運作，例如用戶可以說：「幫我規劃下週去東京的行程，並用 Airbnb 訂房，預算控制在 5 萬台幣以內。」
    Siri 就能自動調用行事曆、瀏覽器與旅遊 App 完成任務。
    
    市場對此反應兩極，Apple 股價在盤後上漲了 3%，但隱私倡議團體擔憂這將導致用戶數據大規模外洩給 OpenAI。
    分析師郭明錤認為，這是 Apple 在 AI 競賽中追趕 Google 的關鍵一步。
    """,
    "published_at": "2026-01-20T10:00:00Z"
}

# ================= 核心功能函式 =================

def step1_ingest_news():
    """
    步驟 1: 將原始新聞存入 news_items 資料表
    """
    print("Step 1: 正在模擬抓取新聞...")
    
    try:
        # 檢查是否已存在 (避免重複)
        existing = supabase.table("news_items").select("id").eq("original_url", MOCK_NEWS["original_url"]).execute()
        
        if existing.data:
            print("  - 新聞已存在，跳過插入。")
            return existing.data[0]['id']
        
        # 插入新聞
        data, count = supabase.table("news_items").insert(MOCK_NEWS).execute()
        new_id = data[1][0]['id']
        print(f"  - 成功存入新聞 (ID: {new_id})")
        return new_id
        
    except Exception as e:
        print(f"  - ❌ 存入失敗: {e}")
        return None

def step2_analyze_with_ai(news_id, content):
    """
    步驟 2: 呼叫 Gemini 進行分析，並回傳 JSON
    """
    print(f"Step 2: 正在呼叫 Gemini 分析 (ID: {news_id})...")
    
    model = genai.GenerativeModel('gemini-flash-latest', 
    generation_config={"response_mime_type": "application/json"})
    
    prompt = f"""
    你是一個專業的新聞編輯。請分析以下新聞內容，並回傳嚴格的 JSON 格式。
    
    新聞內容:
    {content}
    
    請回傳以下 JSON 結構 (不要 markdown 標記):
    {{
        "summary_short": "一句話的文青風格摘要 (30字內)",
        "summary_detailed": "3點條列式重點",
        "sentiment_score": 0.8 (範圍 -1.0 到 1.0),
        "sentiment_label": "Positive/Neutral/Negative",
        "tags": ["標籤1", "標籤2"],
        "category": "Technology"
    }}
    """
    
    try:
        response = model.generate_content(prompt)
        print("  - AI 回應成功！")
        return json.loads(response.text)
    except Exception as e:
        print(f"  - ❌ AI 處理失敗: {e}")
        return None

def step3_save_analysis(news_id, analysis_result):
    """
    步驟 3: 將 AI 結果存入 ai_analysis 資料表
    """
    print("Step 3: 正在儲存分析結果...")
    
    payload = {
        "news_id": news_id,
        "summary_short": analysis_result['summary_short'],
        "summary_detailed": str(analysis_result['summary_detailed']), # 簡單轉字串儲存
        "sentiment_score": analysis_result['sentiment_score'],
        "sentiment_label": analysis_result['sentiment_label'],
        "tags": analysis_result['tags'],
        "category": analysis_result['category'],
        "model_used": "gemini-1.5-flash"
    }
    
    try:
        supabase.table("ai_analysis").insert(payload).execute()
        # 更新原始新聞狀態為 completed
        supabase.table("news_items").update({"processing_status": "completed"}).eq("id", news_id).execute()
        print("  - ✅ 流程全部完成！資料已寫入資料庫。")
    except Exception as e:
        print(f"  - ❌ 儲存失敗: {e}")

# ================= 主程式執行點 =================
if __name__ == "__main__":
    # 1. 模擬爬蟲
    news_id = step1_ingest_news()
    
    if news_id:
        # 撈取該新聞內容
        response = supabase.table("news_items").select("content_raw").eq("id", news_id).execute()
        content = response.data[0]['content_raw']
        
        # 2. AI 分析
        ai_result = step2_analyze_with_ai(news_id, content)
        
        # 3. 儲存結果
        if ai_result:
            step3_save_analysis(news_id, ai_result)