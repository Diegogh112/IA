"""
Run this script to check which Gemini models are available for your API key.
Usage: python check_models.py
"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("ERROR: GEMINI_API_KEY not found in .env")
    exit(1)

print(f"Using API key: {api_key[:8]}...{api_key[-4:]}\n")

genai.configure(api_key=api_key)

print("Available models that support generateContent:\n")
try:
    for m in genai.list_models():
        if "generateContent" in m.supported_generation_methods:
            print(f"  - {m.name}")
except Exception as e:
    print(f"ERROR listing models: {e}")
