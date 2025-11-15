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
      <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${safeQuestion}</div>
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
            <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${safeQuestion}</div>
            <div class="text-gray-700 leading-relaxed markdown-content">Thinking...</div>
        </div>
    `;

  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  currentAbortController = new AbortController();

  try {
    const response = await fetch(`/api/chats/${currentChatId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question }),
      signal: currentAbortController.signal,
    });

    const data = await response.json();

    const lastMsg = messagesDiv.lastElementChild;
    if (response.ok) {
      if (data.answer) {
        const safeQuestion = escapeHtml(data.question || question);
        lastMsg.innerHTML = `
                    <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${safeQuestion}</div>
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
                    <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${safeQuestion}</div>
                    <div class="text-yellow-600">No answer received from LLM. Check server logs.</div>
                `;
      }
    } else {
      const safeQuestion = escapeHtml(question);
      const safeError = escapeHtml(data.error || "Unknown error");
      lastMsg.innerHTML = `
                <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${safeQuestion}</div>
                <div class="text-red-600">Error: ${safeError}</div>
                <div class="text-xs text-gray-500 mt-2">Check browser console and server logs for details.</div>
            `;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    const lastMsg = messagesDiv.lastElementChild;
    if (lastMsg) {
      const safeQuestion = escapeHtml(question);
      const safeError = escapeHtml(error.message || "Network error");
      lastMsg.innerHTML = `
            <div class="text-sm font-semibold text-gray-900 mb-2 question-highlight">Q: ${safeQuestion}</div>
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

