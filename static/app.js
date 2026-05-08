/**
 * DocAI Assistant — Frontend Logic
 *
 * Communicates with the FastAPI backend to:
 *  1. Upload a PDF/TXT and receive extracted text  →  POST /upload
 *  2. Send a question + document context           →  POST /ask
 */

// ── Configuration ─────────────────────────────────────────────────────────────
// Since the frontend is served by the same FastAPI server,
// we use a relative URL in production and localhost in development.
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:8000"
    : window.location.origin; // same domain in production

// ── State ─────────────────────────────────────────────────────────────────────
let documentContext = "";   // extracted text stored in memory
let conversationHistory = []; // [{role, content}, ...]
let isLoading = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const dropzone       = document.getElementById("dropzone");
const fileInput      = document.getElementById("fileInput");
const uploadStatus   = document.getElementById("uploadStatus");
const docInfo        = document.getElementById("docInfo");
const docName        = document.getElementById("docName");
const docMeta        = document.getElementById("docMeta");
const removeDocBtn   = document.getElementById("removeDoc");
const pasteArea      = document.getElementById("pasteArea");
const loadTextBtn    = document.getElementById("loadTextBtn");
const chat           = document.getElementById("chat");
const chatEmpty      = document.getElementById("chatEmpty");
const questionInput  = document.getElementById("questionInput");
const sendBtn        = document.getElementById("sendBtn");
const clearBtn       = document.getElementById("clearBtn");

// ── Helpers ───────────────────────────────────────────────────────────────────

function setStatus(message, type) {
  uploadStatus.textContent = message;
  uploadStatus.className = `upload-status show ${type}`;
}

function clearStatus() {
  uploadStatus.className = "upload-status";
  uploadStatus.textContent = "";
}

function enableChat() {
  questionInput.disabled = false;
  sendBtn.disabled = false;
  clearBtn.disabled = false;
  questionInput.focus();
}

function disableChat() {
  questionInput.disabled = true;
  sendBtn.disabled = true;
  clearBtn.disabled = true;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Very lightweight markdown → HTML (bold, inline code, line breaks) */
function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // code blocks
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    // inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // line breaks
    .replace(/\n/g, "<br>");
}

function scrollChatToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

// ── Chat rendering ────────────────────────────────────────────────────────────

function hideChatEmpty() {
  if (chatEmpty) chatEmpty.style.display = "none";
}

function appendMessage(role, content) {
  hideChatEmpty();

  const wrapper = document.createElement("div");
  wrapper.className = `message message--${role}`;

  const avatar = document.createElement("div");
  avatar.className = "message__avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "Tú" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "message__bubble";

  if (role === "ai") {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chat.appendChild(wrapper);
  scrollChatToBottom();
  return bubble;
}

function showTypingIndicator() {
  hideChatEmpty();
  const wrapper = document.createElement("div");
  wrapper.className = "message message--ai";
  wrapper.id = "typingIndicator";

  const avatar = document.createElement("div");
  avatar.className = "message__avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "AI";

  const bubble = document.createElement("div");
  bubble.className = "message__bubble";
  bubble.innerHTML = `
    <div class="typing-indicator" aria-label="La IA está escribiendo">
      <span></span><span></span><span></span>
    </div>`;

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chat.appendChild(wrapper);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typingIndicator");
  if (indicator) indicator.remove();
}

// ── Upload logic ──────────────────────────────────────────────────────────────

async function uploadFile(file) {
  if (isLoading) return;

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    setStatus("❌ El archivo supera el límite de 10 MB.", "error");
    return;
  }

  const allowed = ["application/pdf", "text/plain"];
  const isAllowed = allowed.some(t => file.type.startsWith(t)) ||
                    file.name.endsWith(".pdf") ||
                    file.name.endsWith(".txt");

  if (!isAllowed) {
    setStatus("❌ Formato no soportado. Sube un PDF o TXT.", "error");
    return;
  }

  isLoading = true;
  setStatus("⏳ Procesando documento...", "loading");
  docInfo.style.display = "none";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Error al procesar el documento.");
    }

    documentContext = data.text;

    // Show doc info card
    docName.textContent = file.name;
    docMeta.textContent = `${formatBytes(file.size)} · ${data.char_count.toLocaleString()} caracteres extraídos`;
    docInfo.style.display = "flex";

    setStatus(`✅ ${data.message}`, "success");
    enableChat();

    // Welcome message
    conversationHistory = [];
    chat.innerHTML = "";
    appendMessage("ai", `¡Documento cargado! Ahora puedes hacerme preguntas sobre **${file.name}**. ¿En qué te puedo ayudar?`);

  } catch (err) {
    setStatus(`❌ ${err.message}`, "error");
    documentContext = "";
    disableChat();
  } finally {
    isLoading = false;
  }
}

// ── Ask logic ─────────────────────────────────────────────────────────────────

async function askQuestion() {
  const question = questionInput.value.trim();
  if (!question || isLoading || !documentContext) return;

  isLoading = true;
  questionInput.value = "";
  questionInput.style.height = "auto";

  // Disable input while waiting
  sendBtn.disabled = true;
  questionInput.disabled = true;

  appendMessage("user", question);
  showTypingIndicator();

  try {
    const response = await fetch(`${API_BASE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        context: documentContext,
        history: conversationHistory,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Error al obtener respuesta.");
    }

    removeTypingIndicator();
    appendMessage("ai", data.answer);

    // Update history
    conversationHistory.push({ role: "user", content: question });
    conversationHistory.push({ role: "assistant", content: data.answer });

    // Keep history manageable (last 10 turns = 20 entries)
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

  } catch (err) {
    removeTypingIndicator();
    appendMessage("ai", `⚠️ Error: ${err.message}`);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    questionInput.disabled = false;
    questionInput.focus();
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

// Drop zone — click
// We stop the event if it originated from the hidden file input itself
// to avoid opening the file dialog twice (once from the input, once from our handler).
dropzone.addEventListener("click", (e) => {
  if (e.target === fileInput) return;
  fileInput.click();
});
dropzone.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
});

// Drop zone — drag & drop
dropzone.addEventListener("dragover", e => {
  e.preventDefault();
  dropzone.classList.add("drag-over");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", e => {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

// File input change
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) uploadFile(fileInput.files[0]);
  fileInput.value = ""; // reset so same file can be re-uploaded
});

// Remove document
removeDocBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  documentContext = "";
  conversationHistory = [];
  docInfo.style.display = "none";
  clearStatus();
  disableChat();
  chat.innerHTML = "";
  if (chatEmpty) {
    chat.appendChild(chatEmpty);
    chatEmpty.style.display = "";
  }
  pasteArea.value = "";
});

// Load pasted text
loadTextBtn.addEventListener("click", () => {
  const text = pasteArea.value.trim();
  if (!text) {
    setStatus("❌ El área de texto está vacía.", "error");
    return;
  }

  documentContext = text;
  docName.textContent = "Texto pegado";
  docMeta.textContent = `${text.length.toLocaleString()} caracteres`;
  docInfo.style.display = "flex";
  setStatus("✅ Texto cargado correctamente.", "success");
  enableChat();

  conversationHistory = [];
  chat.innerHTML = "";
  appendMessage("ai", "¡Texto cargado! Ahora puedes hacerme preguntas sobre el contenido. ¿En qué te puedo ayudar?");
});

// Send button
sendBtn.addEventListener("click", askQuestion);

// Enter to send (Shift+Enter for new line)
questionInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askQuestion();
  }
});

// Auto-resize textarea
questionInput.addEventListener("input", () => {
  questionInput.style.height = "auto";
  questionInput.style.height = `${Math.min(questionInput.scrollHeight, 120)}px`;
});

// Clear conversation
clearBtn.addEventListener("click", () => {
  if (!confirm("¿Limpiar el historial de conversación?")) return;
  conversationHistory = [];
  chat.innerHTML = "";
  if (chatEmpty) {
    chat.appendChild(chatEmpty);
    chatEmpty.style.display = "";
  }
  appendMessage("ai", "Historial limpiado. Puedes seguir haciendo preguntas sobre el documento.");
});
