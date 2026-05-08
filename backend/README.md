# Document Analysis Assistant — Backend

FastAPI backend that extracts text from PDFs/TXT files and answers questions about them using Google Gemini.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check (for Render) |
| POST | `/upload` | Upload PDF or TXT → returns extracted text |
| POST | `/ask` | Send question + context → returns Gemini answer |

## Local setup

### 1. Prerequisites
- Python 3.10+
- A free Gemini API key → [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 2. Clone & install

```bash
git clone <your-backend-repo-url>
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Environment variables

```bash
cp .env.example .env
# Edit .env and paste your Gemini API key
```

### 4. Run

```bash
uvicorn main:app --reload
```

API available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

## Deploy to Render (free tier)

1. Push this folder to a GitHub repository.
2. Go to [https://render.com](https://render.com) → **New Web Service**.
3. Connect your GitHub repo.
4. Render auto-detects `render.yaml`. Confirm the settings.
5. Add the environment variable `GEMINI_API_KEY` in the Render dashboard under **Environment**.
6. Click **Deploy**. Your API URL will be something like `https://doc-analysis-backend.onrender.com`.
7. Copy that URL — you'll need it for the frontend.

> **Note:** Free tier services on Render spin down after 15 minutes of inactivity. The first request after a cold start may take ~30 seconds.
