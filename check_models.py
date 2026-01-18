import google.generativeai as genai
import os

# 貼上你的 Gemini API Key
genai.configure(api_key="AIzaSyBBbegMf7z8j7yIntFpBlMaRU1zs222fyU")

print("正在查詢可用模型...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"查詢失敗: {e}")