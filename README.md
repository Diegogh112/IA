# 🤖 DocAI Assistant — Asistente de Análisis de Documentos con IA

Sube un PDF o pega texto plano y hazle preguntas en lenguaje natural. La IA responde **exclusivamente** basándose en el contenido del documento.

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/IA-Google%20Gemini-4285F4?style=flat-square&logo=google)
![Stack](https://img.shields.io/badge/Frontend-Vanilla%20JS-F7DF1E?style=flat-square&logo=javascript)
![Deploy](https://img.shields.io/badge/Deploy-Render%20%2B%20Netlify-46E3B7?style=flat-square)

---

## ✨ Funcionalidades

- 📄 Carga de archivos **PDF** o **TXT** (hasta 10 MB) con drag & drop
- ✏️ Opción de **pegar texto** directamente
- 💬 Chat con **historial de conversación** visible
- 🧠 Respuestas de **Google Gemini** ancladas al documento
- 🌙 Interfaz oscura, responsive y accesible

---

## 🗂️ Estructura del proyecto

```
/
├── backend/
│   ├── main.py            # FastAPI app (endpoints /upload y /ask)
│   ├── requirements.txt   # Dependencias Python
│   ├── .env.example       # Variables de entorno de ejemplo
│   ├── render.yaml        # Configuración de deploy en Render
│   └── README.md          # Instrucciones del backend
│
├── frontend/
│   ├── index.html         # Estructura HTML
│   ├── style.css          # Estilos (dark theme)
│   ├── app.js             # Lógica JavaScript
│   └── netlify.toml       # Configuración de deploy en Netlify
│
└── README.md              # Este archivo
```

---

## 🚀 Inicio rápido (local)

### Requisitos previos

- Python 3.10 o superior
- Una API key gratuita de Google Gemini

### 1. Obtener la API key de Gemini

1. Ve a [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en **"Create API key"**
4. Copia la clave generada

> ✅ No requiere tarjeta de crédito. El tier gratuito incluye 15 RPM y 1 millón de tokens/día con `gemini-1.5-flash`.

---

### 2. Configurar el backend

```powershell
cd backend

# Crear entorno virtual
python -m venv venv

# Activar (Windows PowerShell)
venv\Scripts\activate
# Activar (macOS / Linux)
# source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno (Windows PowerShell)
Copy-Item .env.example .env
# macOS / Linux: cp .env.example .env
# Edita .env y pega tu API key en GEMINI_API_KEY
```

Contenido del archivo `.env`:
```env
GEMINI_API_KEY=tu_api_key_aqui
```

Iniciar el servidor:
```bash
uvicorn main:app --reload
```

El backend estará disponible en `http://localhost:8000`  
Documentación interactiva (Swagger): `http://localhost:8000/docs`

---

### 3. Abrir el frontend

El frontend es HTML/CSS/JS puro — no necesita servidor ni build step.

**Opción A — Abrir directamente:**
```
Abre frontend/index.html en tu navegador
```

**Opción B — Servidor local (recomendado para evitar restricciones CORS en algunos navegadores):**
```bash
cd frontend
python -m http.server 3000
# Abre http://localhost:3000
```

> El archivo `app.js` detecta automáticamente si estás en `localhost` y apunta al backend en `http://localhost:8000`.

---

## ☁️ Deploy en producción

### Backend → Render (free tier)

1. Sube la carpeta `backend/` a un repositorio de GitHub.
2. Ve a [https://render.com](https://render.com) → **New** → **Web Service**.
3. Conecta el repositorio.
4. Render detecta `render.yaml` automáticamente. Confirma:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. En **Environment Variables**, agrega:
   - `GEMINI_API_KEY` → tu API key
6. Haz clic en **Deploy**.
7. Copia la URL pública (ej. `https://doc-analysis-backend.onrender.com`).

> ⚠️ Los servicios gratuitos de Render se duermen tras 15 min de inactividad. La primera petición puede tardar ~30 s.

---

### Frontend → Netlify

1. Sube la carpeta `frontend/` a un repositorio de GitHub.
2. **Antes de hacer push**, edita `app.js` y reemplaza la URL del backend:
   ```js
   : "https://TU_URL_REAL.onrender.com"  // ← reemplaza esto
   ```
3. Ve a [https://netlify.com](https://netlify.com) → **Add new site** → **Import from Git**.
4. Selecciona el repositorio del frontend.
5. Configuración de build:
   - **Publish directory:** `.`
   - (No hay build command)
6. Haz clic en **Deploy site**.

**Alternativa — GitHub Pages:**
1. Ve a Settings → Pages en tu repositorio del frontend.
2. Source: `main` branch, carpeta `/` (root).
3. GitHub Pages publicará el sitio automáticamente.

---

## 🔌 API Reference

### `POST /upload`

Recibe un archivo PDF o TXT y devuelve el texto extraído.

**Request:** `multipart/form-data`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | File | PDF o TXT (máx. 10 MB) |

**Response:**
```json
{
  "text": "Contenido extraído del documento...",
  "char_count": 15420,
  "message": "Document processed successfully."
}
```

---

### `POST /ask`

Envía una pregunta con el contexto del documento y recibe la respuesta de Gemini.

**Request:** `application/json`
```json
{
  "question": "¿Cuáles son las conclusiones principales?",
  "context": "Texto completo del documento...",
  "history": [
    { "role": "user", "content": "pregunta anterior" },
    { "role": "assistant", "content": "respuesta anterior" }
  ]
}
```

**Response:**
```json
{
  "answer": "Las conclusiones principales son..."
}
```

---

## 🛠️ Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `GEMINI_API_KEY` | ✅ Sí | API key de Google AI Studio |

---

## 📦 Dependencias principales

| Librería | Versión | Uso |
|----------|---------|-----|
| `fastapi` | 0.111.0 | Framework web |
| `uvicorn` | 0.29.0 | Servidor ASGI |
| `pdfplumber` | 0.11.0 | Extracción de texto PDF |
| `google-generativeai` | 0.7.2 | API de Gemini |
| `python-multipart` | 0.0.9 | Recepción de archivos |
| `python-dotenv` | 1.0.1 | Variables de entorno |

---

## 🔒 Seguridad

- La API key **nunca** se expone en el frontend
- El contexto del documento se almacena **en memoria del navegador** (no en base de datos)
- Límite de 10 MB por archivo y 100 000 caracteres de contexto
- CORS configurado (ajusta `allow_origins` en producción para mayor seguridad)

---

## 📄 Licencia

MIT — libre para uso personal y comercial.
