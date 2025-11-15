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

