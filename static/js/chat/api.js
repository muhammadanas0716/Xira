let currentChatId = null;

async function createNewChat() {
  const tickerInput = document.getElementById("newChatTickerInput");
  const ticker = sanitizeTicker(tickerInput.value);
  if (!ticker) {
    alert("Please enter a valid ticker symbol");
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
      
      closeNewChatModal();
      loadChat(data.chat_id);
      loadChatHistory();
      
      const sidebar = document.getElementById("sidebar");
      if (sidebar && !sidebar.classList.contains("sidebar-collapsed")) {
        toggleSidebar();
      }
      
      if (data.pdf_filename) {
        showPdfStatus("PDF Loading...");
        setTimeout(() => {
          loadPdfFromUrl(`/pdfs/${data.pdf_filename}`);
        }, 500);
      } else if (data.pdf_downloading) {
        showPdfStatus("PDF Downloading...");
        startPdfPolling(data.chat_id, ticker);
      } else {
        hidePdfStatus();
      }
    } else {
      alert(data.error || "Failed to create chat");
      loadingDiv.classList.add("hidden");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again.");
    loadingDiv.classList.add("hidden");
  }
}

function showPdfStatus(message) {
  let statusDiv = document.getElementById("pdfStatusIndicator");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "pdfStatusIndicator";
    statusDiv.className = "fixed top-4 right-4 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2";
    document.body.appendChild(statusDiv);
  }
  statusDiv.innerHTML = `
    <div class="loading-spinner w-4 h-4 border-2 border-red-600 border-t-transparent"></div>
    <span class="text-sm font-semibold">${message}</span>
  `;
  statusDiv.classList.remove("hidden");
}

function hidePdfStatus() {
  const statusDiv = document.getElementById("pdfStatusIndicator");
  if (statusDiv) {
    statusDiv.classList.add("hidden");
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 300);
  }
}

function startPdfPolling(chatId, ticker) {
  const filename = `${ticker}_latest_10Q.pdf`;
  let attempts = 0;
  const maxAttempts = 60;
  
  const pollInterval = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      if (response.ok) {
        const chat = await response.json();
        if (chat.pdf_filename || chat.has_pdf) {
          clearInterval(pollInterval);
          showPdfStatus("PDF Loading...");
          setTimeout(() => {
            loadPdfFromUrl(`/pdfs/${filename}`);
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error polling for PDF:", error);
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(pollInterval);
      hidePdfStatus();
      const statusDiv = document.getElementById("pdfStatusIndicator");
      if (statusDiv) {
        statusDiv.className = "fixed top-4 right-4 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg shadow-lg z-50";
        statusDiv.innerHTML = '<span class="text-sm font-semibold">PDF download taking longer than expected</span>';
      }
    }
  }, 2000);
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
        (chat) => {
          const safeId = sanitizeChatId(chat.id) || '';
          const safeTicker = escapeHtml(chat.ticker || '');
          const isActive = currentChatId === chat.id;
          return `
            <div class="history-item group flex items-center gap-2 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-gray-50 ${isActive ? 'bg-gray-100' : ''}" onclick="loadChat('${safeId}')">
                <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <span class="text-sm text-gray-700 truncate flex-1">${safeTicker}</span>
                <button 
                    onclick="event.stopPropagation(); deleteChat('${safeId}', '${safeTicker}')" 
                    class="delete-chat-btn opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 flex-shrink-0"
                    title="Delete chat"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        `;
        }
      )
      .join("");
  } catch (error) {
    console.error("Error loading chat history:", error);
  }
}

async function deleteChat(chatId, ticker) {
  if (!confirm(`Are you sure you want to delete the chat for ${ticker}? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/chats/${chatId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (response.ok) {
      if (currentChatId === chatId) {
        currentChatId = null;
        const emptyState = document.getElementById("emptyState");
        const chatContentContainer = document.getElementById("chatContentContainer");
        const dashboardFooter = document.getElementById("dashboardFooter");
        
        if (emptyState) emptyState.classList.remove("hidden");
        if (chatContentContainer) {
          chatContentContainer.classList.add("hidden");
          chatContentContainer.innerHTML = "";
        }
        if (dashboardFooter) dashboardFooter.classList.add("hidden");
      }
      loadChatHistory();
    } else {
      alert(data.error || "Failed to delete chat");
    }
  } catch (error) {
    console.error("Error deleting chat:", error);
    alert("An error occurred while deleting the chat. Please try again.");
  }
}

async function deleteAllChats() {
  if (!confirm("Are you sure you want to delete ALL chats? This action cannot be undone.")) {
    return;
  }

  try {
    const response = await fetch("/api/chats", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (response.ok) {
      currentChatId = null;
      const emptyState = document.getElementById("emptyState");
      const chatContentContainer = document.getElementById("chatContentContainer");
      const dashboardFooter = document.getElementById("dashboardFooter");
      
      if (emptyState) emptyState.classList.remove("hidden");
      if (chatContentContainer) {
        chatContentContainer.classList.add("hidden");
        chatContentContainer.innerHTML = "";
      }
      if (dashboardFooter) dashboardFooter.classList.add("hidden");
      
      loadChatHistory();
      
      const pdfViewer = document.getElementById("pdfViewer");
      if (pdfViewer) {
        closePdfViewer();
      }
    } else {
      alert(data.error || "Failed to delete all chats");
    }
  } catch (error) {
    console.error("Error deleting all chats:", error);
    alert("An error occurred while deleting all chats. Please try again.");
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
    const safeQuestion = escapeHtml(questionText);
    lastMsg.innerHTML = `
      <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>
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

  const safeQuestion = escapeHtml(question);
  messagesDiv.innerHTML += `
        <div class="bg-white rounded-xl p-6 border border-gray-200">
            <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>
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
        const safeQuestion = escapeHtml(data.question || question);
        lastMsg.innerHTML = `
                    <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>
                    <div class="text-gray-700 leading-relaxed markdown-content">${renderMarkdown(
                      data.answer
                    )}</div>
                `;
        const markdownContent = lastMsg.querySelector('.markdown-content');
        if (markdownContent) {
          renderMath(markdownContent);
        }
      } else {
        const safeQuestion = escapeHtml(data.question || question);
        lastMsg.innerHTML = `
                    <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>
                    <div class="text-yellow-600">No answer received from LLM. Check server logs.</div>
                `;
      }
    } else {
      const safeQuestion = escapeHtml(question);
      const safeError = escapeHtml(data.error || "Unknown error");
      lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>
                <div class="text-red-600">Error: ${safeError}</div>
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
      const safeQuestion = escapeHtml(question);
      const safeError = escapeHtml(error.message || "Network error");
      lastMsg.innerHTML = `
            <div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>
            <div class="text-red-600">Network error: ${safeError}</div>
            <div class="text-xs text-gray-500 mt-2">Check browser console for details.</div>
        `;
    }
  } finally {
    isProcessingQuestion = false;
    currentAbortController = null;
    updateSendButton(false);
  }
}

