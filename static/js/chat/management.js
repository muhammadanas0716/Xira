let currentChatId = null;

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

