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
    alert("An error occurred. Please try again.");
    loadingDiv.classList.add("hidden");
  }
}

