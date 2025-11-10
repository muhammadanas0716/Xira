let currentChatId = null;

async function searchTicker() {
  const ticker = document
    .getElementById("tickerInput")
    .value.trim()
    .toUpperCase();
  if (!ticker) {
    showError("Please enter a ticker symbol");
    return;
  }

  hideMessages();
  const searchBtn = document.getElementById("searchBtn");
  searchBtn.disabled = true;
  searchBtn.textContent = "Loading...";

  try {
    const response = await fetch("/api/create-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: ticker }),
    });

    const data = await response.json();
    if (response.ok) {
      currentChatId = data.chat_id;
      showSuccess(`Analysis started for ${ticker}`);

      loadChat(data.chat_id);
      loadChatHistory();

      if (data.pdf_filename) {
        setTimeout(() => {
          loadPdfFromUrl(`/pdfs/${data.pdf_filename}`);
        }, 500);
      } else {
        showError("PDF not available for this ticker yet.");
      }
    } else {
      showError(data.error || "Failed to load ticker");
    }
  } catch (error) {
    console.error("Error:", error);
    showError("An error occurred. Please try again.");
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

function handleTickerKeyPress(event) {
  if (event.key === "Enter") {
    searchTicker();
  }
}

async function createNewChat() {
  const ticker = document
    .getElementById("newChatTickerInput")
    .value.trim()
    .toUpperCase();
  if (!ticker) {
    alert("Please enter a ticker symbol");
    return;
  }

  const modal = document.getElementById("newChatModal");
  const loadingDiv = modal.querySelector(".loading-indicator");
  loadingDiv.classList.remove("hidden");

  try {
    const response = await fetch("/api/create-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: ticker }),
    });

    const data = await response.json();
    if (response.ok) {
      currentChatId = data.chat_id;
      console.log("Chat created:", data);
      console.log("PDF text length:", data.pdf_text_length);
      if (!data.has_pdf || data.pdf_text_length === 0) {
        alert(
          `Warning: PDF text extraction may have failed. PDF text length: ${
            data.pdf_text_length || 0
          } characters. You may not be able to ask questions about the PDF.`
        );
      }
      loadChat(data.chat_id);
      closeNewChatModal();
      loadChatHistory();
      if (data.pdf_filename) {
        setTimeout(() => {
          loadPdfFromUrl(`/pdfs/${data.pdf_filename}`);
        }, 500);
      }
    } else {
      alert(data.error || "Failed to create chat");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again.");
  } finally {
    loadingDiv.classList.add("hidden");
  }
}

async function loadChat(chatId) {
  try {
    const response = await fetch(`/api/chats/${chatId}`);
    const chat = await response.json();

    if (response.ok) {
      currentChatId = chatId;
      console.log("Chat loaded:", chat);
      console.log("PDF text length:", chat.pdf_text_length || 0);
      if (chat.pdf_text_preview) {
        console.log("PDF text preview:", chat.pdf_text_preview);
      }
      displayChat(chat);
      if (chat.pdf_filename) {
        setTimeout(() => {
          loadPdfFromUrl(`/pdfs/${chat.pdf_filename}`);
        }, 100);
      }
    }
  } catch (error) {
    console.error("Error loading chat:", error);
  }
}

async function loadChatHistory() {
  try {
    const response = await fetch("/api/chats");
    const chats = await response.json();
    const historyDiv = document.getElementById("chatHistory");

    historyDiv.innerHTML = chats
      .map(
        (chat) => `
            <div onclick="loadChat('${chat.id}')" class="history-item flex items-center gap-2 py-2.5 px-3 rounded-xl cursor-pointer">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span class="text-sm text-gray-700 truncate">${chat.ticker}</span>
            </div>
        `
      )
      .join("");
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
}

let currentAbortController = null;
let isProcessingQuestion = false;

function updateSendButton(isProcessing) {
  const sendButton = document.getElementById("sendButton");
  if (!sendButton) return;

  if (isProcessing) {
    sendButton.innerHTML = `
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
      </svg>
    `;
    sendButton.onclick = stopQuestion;
    sendButton.classList.remove("bg-black", "hover:bg-gray-800");
    sendButton.classList.add("bg-red-600", "hover:bg-red-700");
    sendButton.title = "Stop";
  } else {
    sendButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
      </svg>
    `;
    sendButton.onclick = askQuestion;
    sendButton.classList.remove("bg-red-600", "hover:bg-red-700");
    sendButton.classList.add("bg-black", "hover:bg-gray-800");
    sendButton.title = "Send";
  }
}

function stopQuestion() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  isProcessingQuestion = false;
  updateSendButton(false);
  
  const messagesDiv = document.getElementById("chatMessages");
  if (messagesDiv && messagesDiv.lastElementChild) {
    const lastMsg = messagesDiv.lastElementChild;
    const questionText = lastMsg.querySelector(".text-sm.font-semibold")?.textContent.replace("Q: ", "") || "Question";
    lastMsg.innerHTML = `
      <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${questionText}</div>
      <div class="text-gray-500 italic">Request cancelled by user.</div>
    `;
  }
}

async function askQuestion() {
  if (!currentChatId) {
    alert("Please create a chat first");
    return;
  }

  if (isProcessingQuestion) {
    stopQuestion();
    return;
  }

  const input = document.querySelector(
    'input[placeholder="Search or ask any question..."]'
  );
  const question = input.value.trim();
  if (!question) return;

  input.value = "";
  const messagesDiv = document.getElementById("chatMessages");
  if (messagesDiv) {
    switchTab("chat");
  }

  isProcessingQuestion = true;
  updateSendButton(true);

  messagesDiv.innerHTML += `
        <div class="bg-white rounded-xl p-6 border border-gray-200">
            <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${question}</div>
            <div class="text-gray-700 leading-relaxed markdown-content">Thinking...</div>
        </div>
    `;

  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  currentAbortController = new AbortController();

  try {
    console.log("Asking question:", question);
    const response = await fetch(`/api/chats/${currentChatId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
      signal: currentAbortController.signal,
    });

    const data = await response.json();
    console.log("Response:", data);

    const lastMsg = messagesDiv.lastElementChild;
    if (response.ok) {
      if (data.answer) {
        lastMsg.innerHTML = `
                    <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${
                      data.question
                    }</div>
                    <div class="text-gray-700 leading-relaxed markdown-content">${renderMarkdown(
                      data.answer
                    )}</div>
                `;
      } else {
        lastMsg.innerHTML = `
                    <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${data.question}</div>
                    <div class="text-yellow-600">No answer received from LLM. Check server logs.</div>
                `;
      }
    } else {
      lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${question}</div>
                <div class="text-red-600">Error: ${
                  data.error || "Unknown error"
                }</div>
                <div class="text-xs text-gray-500 mt-2">Check browser console and server logs for details.</div>
            `;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (error) {
    if (error.name === "AbortError") {
      console.log("Request was cancelled");
      return;
    }
    console.error("Error asking question:", error);
    const lastMsg = messagesDiv.lastElementChild;
    if (lastMsg) {
      lastMsg.innerHTML = `
            <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${question}</div>
            <div class="text-red-600">Network error: ${error.message}</div>
            <div class="text-xs text-gray-500 mt-2">Check browser console for details.</div>
        `;
    }
  } finally {
    isProcessingQuestion = false;
    currentAbortController = null;
    updateSendButton(false);
  }
}

