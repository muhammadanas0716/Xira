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
      lastMsg.classList.add("report-container");
      document.getElementById("exportReportBtn").classList.remove("hidden");
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
    console.error("Error generating report:", error);
    const lastMsg = messagesDiv.lastElementChild;
    lastMsg.innerHTML = `
            <div class="text-red-600">Network error: ${error.message}</div>
        `;
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function styleElement(element, styles) {
  if (!element.style.cssText) {
    element.style.cssText = styles;
  }
}

function applyPDFStyles(elements) {
  elements.forEach((el) => {
    const tagName = el.tagName.toLowerCase();

    switch (tagName) {
      case "h1":
        styleElement(
          el,
          "font-size: 24pt; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #111827; border-bottom: 3px solid #000000; padding-bottom: 10px; page-break-after: avoid;"
        );
        break;
      case "h2":
        styleElement(
          el,
          "font-size: 18pt; font-weight: bold; margin-top: 25px; margin-bottom: 12px; color: #111827; border-bottom: 2px solid #000000; padding-bottom: 8px; page-break-after: avoid;"
        );
        break;
      case "h3":
        styleElement(
          el,
          "font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #111827; page-break-after: avoid;"
        );
        break;
      case "h4":
        styleElement(
          el,
          "font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; color: #111827; page-break-after: avoid;"
        );
        break;
      case "h5":
        styleElement(
          el,
          "font-size: 11pt; font-weight: bold; margin-top: 12px; margin-bottom: 6px; color: #111827; page-break-after: avoid;"
        );
        break;
      case "h6":
        styleElement(
          el,
          "font-size: 10pt; font-weight: bold; margin-top: 10px; margin-bottom: 5px; color: #111827; page-break-after: avoid;"
        );
        break;
      case "p":
        styleElement(
          el,
          "margin-bottom: 15px; text-align: justify; line-height: 1.8;"
        );
        break;
      case "ul":
        styleElement(
          el,
          "margin-left: 25px; margin-bottom: 18px; margin-top: 12px; padding-left: 20px; list-style-type: disc;"
        );
        break;
      case "ol":
        styleElement(
          el,
          "margin-left: 25px; margin-bottom: 18px; margin-top: 12px; padding-left: 20px; list-style-type: decimal;"
        );
        break;
      case "li":
        styleElement(el, "margin-bottom: 10px; line-height: 1.7;");
        break;
      case "table":
        styleElement(
          el,
          "width: 100%; border-collapse: collapse; margin: 25px 0; page-break-inside: avoid; border: 2px solid #d1d5db; background-color: white;"
        );
        break;
      case "th":
        styleElement(
          el,
          "background-color: #f3f4f6 !important; border: 1px solid #9ca3af; padding: 14px 12px; text-align: left; font-weight: bold; color: #111827; font-size: 10pt;"
        );
        break;
      case "td":
        styleElement(
          el,
          "border: 1px solid #d1d5db; padding: 12px; text-align: left; font-size: 10pt; line-height: 1.6;"
        );
        break;
      case "tr":
        styleElement(el, "page-break-inside: avoid;");
        break;
      case "strong":
      case "b":
        styleElement(el, "font-weight: bold; color: #111827;");
        break;
      case "em":
      case "i":
        styleElement(el, "font-style: italic; color: #374151;");
        break;
      case "hr":
        styleElement(
          el,
          "border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;"
        );
        break;
      case "blockquote":
        styleElement(
          el,
          "border-left: 4px solid #000000; margin-left: 0; margin-bottom: 18px; color: #4b5563; font-style: italic; background-color: #f9fafb; padding: 15px 20px; border-radius: 4px;"
        );
        break;
      case "code":
        if (el.parentElement.tagName.toLowerCase() !== "pre") {
          styleElement(
            el,
            'background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: "Courier New", monospace; font-size: 9pt; color: #111827;'
          );
        }
        break;
      case "pre":
        styleElement(
          el,
          "background-color: #f3f4f6; padding: 15px; border-radius: 4px; overflow-x: auto; margin: 15px 0; border: 1px solid #d1d5db;"
        );
        break;
      case "a":
        styleElement(el, "color: #000000; text-decoration: underline;");
        break;
    }
  });
}

function getPDFStyles() {
  return `
        <style>
            * {
                box-sizing: border-box;
            }
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                page-break-inside: avoid;
                font-weight: bold !important;
            }
            h1 {
                font-size: 24pt !important;
                color: #111827 !important;
                border-bottom: 3px solid #000000 !important;
                padding-bottom: 10px !important;
                margin-top: 30px !important;
                margin-bottom: 15px !important;
            }
            h2 {
                font-size: 18pt !important;
                color: #111827 !important;
                border-bottom: 2px solid #000000 !important;
                padding-bottom: 8px !important;
                margin-top: 25px !important;
                margin-bottom: 12px !important;
            }
            h3 {
                font-size: 14pt !important;
                color: #111827 !important;
                margin-top: 20px !important;
                margin-bottom: 10px !important;
            }
            h4 {
                font-size: 12pt !important;
                color: #111827 !important;
                margin-top: 15px !important;
                margin-bottom: 8px !important;
            }
            h5 {
                font-size: 11pt !important;
                color: #111827 !important;
                margin-top: 12px !important;
                margin-bottom: 6px !important;
            }
            h6 {
                font-size: 10pt !important;
                color: #111827 !important;
                margin-top: 10px !important;
                margin-bottom: 5px !important;
            }
            p {
                orphans: 3;
                widows: 3;
                page-break-inside: avoid;
                margin-bottom: 15px !important;
                text-align: justify !important;
                line-height: 1.8 !important;
            }
            table {
                page-break-inside: avoid;
                border-spacing: 0;
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 25px 0 !important;
                border: 2px solid #d1d5db !important;
                background-color: white !important;
            }
            tr {
                page-break-inside: avoid;
            }
            table th {
                background-color: #f3f4f6 !important;
                font-weight: bold !important;
                border: 1px solid #9ca3af !important;
                padding: 14px 12px !important;
                text-align: left !important;
                color: #111827 !important;
                font-size: 10pt !important;
            }
            table td {
                border: 1px solid #d1d5db !important;
                padding: 12px !important;
                text-align: left !important;
                font-size: 10pt !important;
                line-height: 1.6 !important;
            }
            table tr:nth-child(even) {
                background-color: #fafafa !important;
            }
            ul, ol {
                page-break-inside: avoid;
                margin-left: 25px !important;
                margin-bottom: 18px !important;
                margin-top: 12px !important;
                padding-left: 20px !important;
            }
            li {
                margin-bottom: 10px !important;
                line-height: 1.7 !important;
            }
            strong, b {
                font-weight: bold !important;
                color: #111827 !important;
            }
            em, i {
                font-style: italic !important;
                color: #374151 !important;
            }
            blockquote {
                border-left: 4px solid #000000 !important;
                margin-left: 0 !important;
                margin-bottom: 18px !important;
                color: #4b5563 !important;
                font-style: italic !important;
                background-color: #f9fafb !important;
                padding: 15px 20px !important;
                border-radius: 4px !important;
            }
            hr {
                border: none !important;
                border-top: 2px solid #e5e7eb !important;
                margin: 30px 0 !important;
            }
            code {
                background-color: #f3f4f6 !important;
                padding: 2px 6px !important;
                border-radius: 3px !important;
                font-family: "Courier New", monospace !important;
                font-size: 9pt !important;
                color: #111827 !important;
            }
            pre {
                background-color: #f3f4f6 !important;
                padding: 15px !important;
                border-radius: 4px !important;
                overflow-x: auto !important;
                margin: 15px 0 !important;
                border: 1px solid #d1d5db !important;
            }
            pre code {
                background-color: transparent !important;
                padding: 0 !important;
            }
            a {
                color: #000000 !important;
                text-decoration: underline !important;
            }
        </style>
    `;
}

async function exportReportToPDF() {
  const reportElement = document.getElementById("generatedReport");
  if (!reportElement) {
    alert("No report found to export");
    return;
  }

  const chat = await fetch(`/api/chats/${currentChatId}`).then((r) => r.json());
  const ticker = chat.ticker;
  const stockName = chat.stock_info.name;

  const opt = {
    margin: [15, 15, 15, 15],
    filename: `${ticker}_Quarterly_Report_${
      new Date().toISOString().split("T")[0]
    }.pdf`,
    image: { type: "jpeg", quality: 0.85 },
    html2canvas: {
      scale: 1,
      useCORS: true,
      letterRendering: false,
      logging: false,
      windowWidth: 800,
      allowTaint: false,
    },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  const reportContainer = document.createElement("div");
  reportContainer.style.cssText = `
        padding: 50px 60px;
        font-family: 'Georgia', 'Times New Roman', serif;
        width: 800px;
        margin: 0 auto;
        background-color: white;
        color: #1f2937;
        line-height: 1.7;
        font-size: 11pt;
        overflow: hidden;
    `;

  let reportContent = reportElement.innerHTML;

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = reportContent;

  const elements = tempDiv.querySelectorAll("*");
  applyPDFStyles(elements);

  reportContent = tempDiv.innerHTML;

  reportContainer.innerHTML = `
        ${getPDFStyles()}
        <div style="margin-bottom: 40px; border-bottom: 3px solid #000000; padding-bottom: 25px; page-break-after: avoid;">
            <h1 style="font-size: 28pt; font-weight: bold; margin-bottom: 8px; color: #111827; border: none; padding: 0;">${stockName} (${ticker})</h1>
            <p style="color: #6b7280; font-size: 12pt; margin: 0;">Quarterly Report Analysis - Generated ${new Date().toLocaleDateString(
              "en-US",
              { year: "numeric", month: "long", day: "numeric" }
            )}</p>
        </div>
        <div style="line-height: 1.8;">
            ${reportContent}
        </div>
    `;

  document.body.appendChild(reportContainer);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const containerHeight = reportContainer.scrollHeight;
  const maxCanvasSize = 16384;
  const estimatedCanvasHeight = containerHeight * opt.html2canvas.scale;

  if (estimatedCanvasHeight > maxCanvasSize) {
    opt.html2canvas.scale = Math.max(
      0.5,
      (maxCanvasSize / containerHeight) * 0.9
    );
    console.log(
      `Reducing scale to ${opt.html2canvas.scale} to fit canvas size limits`
    );
  }

  const exportBtn = document.getElementById("exportReportBtn");
  const originalBtnText = exportBtn.innerHTML;
  exportBtn.disabled = true;
  exportBtn.innerHTML =
    '<div class="loading-spinner mx-auto" style="width: 16px; height: 16px; display: inline-block;"></div> Exporting...';

  try {
    const worker = html2pdf().set(opt).from(reportContainer);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("PDF export timed out. The report may be too large."));
      }, 120000);

      worker
        .save()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  } catch (error) {
    console.error("Error exporting PDF:", error);

    let errorMessage = "Failed to export PDF. ";
    if (
      error.message &&
      (error.message.includes("Canvas exceeds max size") ||
        error.message.includes("exceeded"))
    ) {
      errorMessage +=
        "The report is too large. Try generating a shorter report or contact support.";
    } else if (error.message && error.message.includes("timed out")) {
      errorMessage += "Export timed out. The report may be too large.";
    } else {
      errorMessage += "Please try again.";
    }

    alert(errorMessage);
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = originalBtnText;
    if (document.body.contains(reportContainer)) {
      document.body.removeChild(reportContainer);
    }
  }
}

