import os
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import pdfplumber
import google.generativeai as genai

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

app = FastAPI(
    title="Document Analysis Assistant API",
    description="Upload a PDF or plain text and ask questions about its content using Google Gemini.",
    version="1.0.0",
)

# CORS — allow all origins in dev; restrict to your frontend domain in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ──────────────────────────────────────────────────

class AskRequest(BaseModel):
    question: str
    context: str
    history: list[dict] = []   # [{"role": "user"|"assistant", "content": "..."}]


class AskResponse(BaseModel):
    answer: str


class UploadResponse(BaseModel):
    text: str
    char_count: int
    message: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF using pdfplumber."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def build_prompt(context: str, history: list[dict], question: str) -> str:
    """Build the full prompt sent to Gemini."""
    history_text = ""
    if history:
        for turn in history:
            role = "Usuario" if turn["role"] == "user" else "Asistente"
            history_text += f"{role}: {turn['content']}\n"

    prompt = f"""Eres un asistente experto en análisis de documentos.
Responde ÚNICAMENTE basándote en el contenido del documento proporcionado.
Si la respuesta no se encuentra en el documento, indícalo claramente.
Responde en el mismo idioma en que se formula la pregunta.

--- DOCUMENTO ---
{context}
--- FIN DEL DOCUMENTO ---

{f"--- HISTORIAL DE CONVERSACIÓN ---{chr(10)}{history_text}--- FIN DEL HISTORIAL ---{chr(10)}" if history_text else ""}
Pregunta actual: {question}

Respuesta:"""
    return prompt


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "Document Analysis Assistant API is running."}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Accept a PDF or plain-text file and return its extracted text.
    The frontend stores this text and sends it back with every /ask request.
    """
    allowed_types = {
        "application/pdf",
        "text/plain",
        "text/plain; charset=utf-8",
    }

    content_type = (file.content_type or "").lower()
    filename = (file.filename or "").lower()

    is_pdf = "pdf" in content_type or filename.endswith(".pdf")
    is_text = "text" in content_type or filename.endswith(".txt")

    if not is_pdf and not is_text:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or plain-text (.txt) file.",
        )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    if len(file_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")

    if is_pdf:
        try:
            extracted_text = extract_text_from_pdf(file_bytes)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Could not parse PDF: {str(e)}")
    else:
        try:
            extracted_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            extracted_text = file_bytes.decode("latin-1")

    if not extracted_text.strip():
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from the document. The file may be scanned or image-based.",
        )

    # Truncate to ~100 000 chars to stay within Gemini context limits
    max_chars = 100_000
    truncated = len(extracted_text) > max_chars
    if truncated:
        extracted_text = extracted_text[:max_chars]

    return UploadResponse(
        text=extracted_text,
        char_count=len(extracted_text),
        message=(
            "Document processed successfully."
            if not truncated
            else "Document processed (truncated to 100 000 characters to fit model limits)."
        ),
    )


@app.post("/ask", response_model=AskResponse)
async def ask_question(body: AskRequest):
    """
    Receive a question + document context (+ optional history) and return
    Gemini's answer grounded exclusively in the document content.
    """
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not body.context.strip():
        raise HTTPException(status_code=400, detail="Document context cannot be empty. Please upload a document first.")

    prompt = build_prompt(body.context, body.history, body.question)

    try:
        response = model.generate_content(prompt)
        answer = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")

    return AskResponse(answer=answer)
