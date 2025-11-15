async function generateReport() {
  if (!currentChatId) {
    alert("Please create a chat first");
    return;
  }

  const btn = document.getElementById("generateReportBtn");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML =
    '<div class="loading-spinner mx-auto" style="width: 20px; height: 20px;"></div> Generating...';

  const messagesDiv = document.getElementById("chatMessages");
  if (messagesDiv) {
    switchTab("chat");
  }
  messagesDiv.innerHTML += `
        <div class="bg-white rounded-xl p-6 border border-gray-200">
            <div class="text-gray-700 leading-relaxed markdown-content">Generating comprehensive report... This may take a moment.</div>
        </div>
    `;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  try {
    const response = await fetch(
      `/api/chats/${currentChatId}/generate-report`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );

    const data = await response.json();

    if (response.ok) {
      const lastMsg = messagesDiv.lastElementChild;
      lastMsg.innerHTML = `
                <div class="mb-3">
                    <div class="text-gray-700 leading-relaxed markdown-content report-content" id="generatedReport">${renderMarkdown(
                      data.report
                    )}</div>
                </div>
            `;
      const reportContent = document.getElementById("generatedReport");
      if (reportContent) {
        renderMath(reportContent);
      }
      lastMsg.classList.add("report-container");
      await loadChat(currentChatId);
    } else {
      const lastMsg = messagesDiv.lastElementChild;
      lastMsg.innerHTML = `
                <div class="text-red-600">Error: ${
                  data.error || "Failed to generate report"
                }</div>
            `;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (error) {
    const lastMsg = messagesDiv.lastElementChild;
    lastMsg.innerHTML = `
            <div class="text-red-600">Network error: ${error.message}</div>
        `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

