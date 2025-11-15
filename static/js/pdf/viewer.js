pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfDoc = null;
let scale = 1.2;
const scaleDelta = 0.2;

async function renderAllPages() {
  if (!pdfDoc) return;

  const container = document.getElementById("pdfViewer");
  container.innerHTML = "";

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      canvas.className = "pdf-page";
      container.appendChild(canvas);
    } catch (error) {
    }
  }
}

async function loadPdfFromUrl(url) {
  const pdfPlaceholder = document.getElementById("pdfPlaceholder");
  const pdfLoading = document.getElementById("pdfLoading");
  const pdfViewer = document.getElementById("pdfViewer");
  const pdfControls = document.getElementById("pdfControls");
  const pdfContainer = document.getElementById("pdfContainer");

  pdfPlaceholder.classList.add("hidden");
  pdfLoading.classList.remove("hidden");
  pdfViewer.classList.add("hidden");
  pdfControls.classList.add("hidden");
  pdfViewer.style.display = "none";
  pdfViewer.innerHTML = "";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        pdfLoading.classList.add("hidden");
        pdfPlaceholder.classList.remove("hidden");
        const statusDiv = document.getElementById("pdfStatusIndicator");
        if (statusDiv) {
          statusDiv.className = "fixed top-4 right-4 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2";
          statusDiv.innerHTML = `
            <div class="loading-spinner w-4 h-4 border-2 border-yellow-600 border-t-transparent"></div>
            <span class="text-sm font-semibold">PDF Downloading...</span>
          `;
        }
        showError(
          "PDF file not found. The file may not have been downloaded yet."
        );
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    if (arrayBuffer.byteLength === 0) {
      throw new Error("PDF file is empty");
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    pdfDoc = pdf;
    scale = 1.2;
    updateZoomDisplay();

    await renderAllPages();

    pdfLoading.classList.add("hidden");
    pdfPlaceholder.classList.add("hidden");
    pdfViewer.classList.remove("hidden");
    pdfViewer.style.display = "flex";
    pdfControls.classList.remove("hidden");

    pdfContainer.scrollTop = 0;
    
    const statusDiv = document.getElementById("pdfStatusIndicator");
    if (statusDiv) {
      statusDiv.className = "fixed top-4 right-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg shadow-lg z-50";
      statusDiv.innerHTML = '<span class="text-sm font-semibold">✓ PDF Ready</span>';
      setTimeout(() => {
        hidePdfStatus();
      }, 2000);
    }
  } catch (error) {
    pdfLoading.classList.add("hidden");
    pdfViewer.classList.add("hidden");
    pdfViewer.style.display = "none";
    pdfPlaceholder.classList.remove("hidden");
    showError("Failed to load PDF: " + error.message);
  }
}

function closePdfViewer() {
  const pdfViewer = document.getElementById("pdfViewer");
  pdfViewer.classList.add("hidden");
  pdfViewer.style.display = "none";
  document.getElementById("pdfControls").classList.add("hidden");
  document.getElementById("pdfLoading").classList.add("hidden");
  document.getElementById("pdfPlaceholder").classList.remove("hidden");
  pdfDoc = null;
  hideMessages();
}

