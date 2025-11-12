function switchTab(tabName) {
  const analysisTab = document.getElementById("analysisTab");
  const chatTab = document.getElementById("chatTab");
  const analysisContent = document.getElementById("analysisContent");
  const chatContent = document.getElementById("chatContent");

  if (tabName === "analysis") {
    analysisTab.classList.remove("text-gray-500", "border-transparent");
    analysisTab.classList.add("text-gray-900", "border-black");
    chatTab.classList.remove("text-gray-900", "border-black");
    chatTab.classList.add("text-gray-500", "border-transparent");
    analysisContent.classList.remove("hidden");
    chatContent.classList.add("hidden");
  } else {
    chatTab.classList.remove("text-gray-500", "border-transparent");
    chatTab.classList.add("text-gray-900", "border-black");
    analysisTab.classList.remove("text-gray-900", "border-black");
    analysisTab.classList.add("text-gray-500", "border-transparent");
    chatContent.classList.remove("hidden");
    analysisContent.classList.add("hidden");
  }
}

function displayChat(chat) {
  const mainContent = document.querySelector("main .flex-1.overflow-y-auto");
  const emptyState = document.getElementById("emptyState");
  const chatContentContainer = document.getElementById("chatContentContainer");
  const dashboardFooter = document.getElementById("dashboardFooter");
  
  if (emptyState) emptyState.classList.add("hidden");
  if (chatContentContainer) chatContentContainer.classList.remove("hidden");
  if (dashboardFooter) dashboardFooter.classList.remove("hidden");
  
  const stockInfo = chat.stock_info;
  const hasReport =
    chat.has_report ||
    chat.messages.some(
      (msg) => msg.question === "Generate comprehensive report"
    );

  const safeName = escapeHtml(stockInfo.name || '');
  const safeTicker = escapeHtml(stockInfo.ticker || '');
  let html = `
        <div class="max-w-6xl mx-auto fade-in">
            <div class="mb-6">
                <h2 class="text-3xl font-bold text-gray-900 mb-2">${safeName} (${safeTicker})</h2>
                <div class="flex gap-2 mb-6 border-b border-gray-200">
                    <button onclick="switchTab('analysis')" id="analysisTab" class="tab-button px-6 py-3 font-semibold text-gray-900 border-b-2 border-black transition-all">
                        Analysis
                    </button>
                    <button onclick="switchTab('chat')" id="chatTab" class="tab-button px-6 py-3 font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-700 transition-all">
                        Chat
                    </button>
                </div>
                <div id="analysisContent" class="tab-content">
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-xs text-gray-500 mb-1 flex items-center">
                                Current Price
                                <span class="stat-tooltip ml-1">
                                    <svg class="tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="tooltip-text">The most recent trading price of the stock. This is the price at which shares were last bought or sold.</span>
                                </span>
                            </div>
                            <div class="text-xl font-bold text-gray-900">$${
                              stockInfo.currentPrice?.toFixed(2) || "N/A"
                            }</div>
                            ${
                              stockInfo.prevClose
                                ? `<div class="text-xs mt-1 ${
                                    stockInfo.currentPrice > stockInfo.prevClose
                                      ? "text-green-600"
                                      : stockInfo.currentPrice <
                                        stockInfo.prevClose
                                      ? "text-red-600"
                                      : "text-gray-500"
                                  }">${
                                    stockInfo.currentPrice > stockInfo.prevClose
                                      ? "↑"
                                      : stockInfo.currentPrice <
                                        stockInfo.prevClose
                                      ? "↓"
                                      : "→"
                                  } ${Math.abs(
                                    ((stockInfo.currentPrice -
                                      stockInfo.prevClose) /
                                      stockInfo.prevClose) *
                                      100
                                  ).toFixed(2)}%</div>`
                                : ""
                            }
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-xs text-gray-500 mb-1 flex items-center">
                                P/E Ratio
                                <span class="stat-tooltip ml-1">
                                    <svg class="tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="tooltip-text">Price-to-Earnings ratio. Compares stock price to earnings per share. Lower ratios may indicate undervaluation, but context matters.</span>
                                </span>
                            </div>
                            <div class="text-xl font-bold text-gray-900">${
                              stockInfo.peRatio?.toFixed(2) || "N/A"
                            }</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-xs text-gray-500 mb-1 flex items-center">
                                Market Cap
                                <span class="stat-tooltip ml-1">
                                    <svg class="tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="tooltip-text">Market Capitalization. Total value of all outstanding shares (price × shares outstanding). Indicates company size.</span>
                                </span>
                            </div>
                            <div class="text-xl font-bold text-gray-900">${
                              stockInfo.marketCap
                                ? stockInfo.marketCap >= 1e12
                                  ? (stockInfo.marketCap / 1e12).toFixed(2) +
                                    "T"
                                  : (stockInfo.marketCap / 1e9).toFixed(2) + "B"
                                : "N/A"
                            }</div>
                        </div>
                        <div class="bg-white p-4 rounded-xl border border-gray-200">
                            <div class="text-xs text-gray-500 mb-1 flex items-center">
                                Sector
                                <span class="stat-tooltip ml-1">
                                    <svg class="tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="tooltip-text">The industry sector in which the company operates (e.g., Technology, Healthcare, Finance).</span>
                                </span>
                            </div>
                            <div class="text-lg font-semibold text-gray-900">${
                              escapeHtml(stockInfo.sector || "N/A")
                            }</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div class="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Price Overview</h3>
                            <p class="text-xs text-gray-500 mb-3">Daily price comparison with change indicators</p>
                            <canvas id="priceChart"></canvas>
                        </div>
                        <div class="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Valuation Ratios</h3>
                            <p class="text-xs text-gray-500 mb-3">P/E, P/B, P/S ratios with color-coded valuation levels</p>
                            <canvas id="ratiosChart"></canvas>
                        </div>
                        <div class="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Performance Metrics</h3>
                            <p class="text-xs text-gray-500 mb-3">Profitability and efficiency metrics comparison</p>
                            <canvas id="metricsChart"></canvas>
                        </div>
                        <div class="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">52 Week Range Position</h3>
                            <p class="text-xs text-gray-500 mb-3">Current price position relative to 52-week high/low</p>
                            <canvas id="rangeChart"></canvas>
                        </div>
                        <div class="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Financial Health Score</h3>
                            <p class="text-xs text-gray-500 mb-3">Key financial health indicators with performance thresholds</p>
                            <canvas id="healthChart"></canvas>
                        </div>
                        <div class="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 class="text-lg font-bold text-gray-900 mb-4">Liquidity & Debt Analysis</h3>
                            <p class="text-xs text-gray-500 mb-3">Current ratio, quick ratio, and debt-to-equity comparison</p>
                            <canvas id="liquidityChart"></canvas>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    ${generateStockInfoCards(stockInfo)}
                    </div>
                    <div class="mt-6 flex gap-3">
                        <button onclick="generateReport()" id="generateReportBtn"
                            class="bg-black hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-xl transition-all btn-primary shadow-md flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Generate Report
                        </button>
                        <button onclick="exportReportToPDF()" id="exportReportBtn" class="${
                          hasReport ? "" : "hidden"
                        } bg-black hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-xl transition-all btn-primary shadow-md flex items-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Export as PDF
                        </button>
                    </div>
                </div>
                <div id="chatContent" class="tab-content hidden">
                    <div id="chatMessages" class="space-y-6">
    `;

  chat.messages.forEach((msg) => {
    const isReport = msg.question === "Generate comprehensive report";
    const safeQuestion = !isReport ? escapeHtml(msg.question || '') : '';
    html += `
            <div class="bg-white rounded-xl p-6 border border-gray-200 ${
              isReport ? "report-container" : ""
            }">
                <div class="mb-3">
                    ${
                      !isReport
                        ? `<div class="text-sm font-semibold text-gray-900 mb-2">Q: ${safeQuestion}</div>`
                        : ""
                    }
                    <div class="text-gray-700 leading-relaxed markdown-content ${
                      isReport ? "report-content" : ""
                    }" ${
      isReport ? 'id="generatedReport"' : ""
    }>${renderMarkdown(msg.answer || '')}</div>
                </div>
            </div>
        `;
  });

  html += `</div></div></div>`;
  
  if (chatContentContainer) {
    chatContentContainer.innerHTML = html;
  } else {
    mainContent.innerHTML = html;
  }
  
  const container = chatContentContainer || mainContent;
  const markdownElements = container.querySelectorAll('.markdown-content');
  markdownElements.forEach(element => {
    renderMath(element);
  });
  
  createCharts(stockInfo);
  
  if (isProcessingQuestion) {
    isProcessingQuestion = false;
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    updateSendButton(false);
  }
}

function generateStockInfoCards(stockInfo) {
  const cards = [];
  const fields = [
    { key: "open", label: "Open", tooltip: "Opening price at the start of the trading day.", format: (v) => `$${v.toFixed(2)}`, color: "text-gray-900" },
    { key: "high", label: "High", tooltip: "Highest trading price reached during the current trading day.", format: (v) => `$${v.toFixed(2)}`, color: "text-green-600" },
    { key: "low", label: "Low", tooltip: "Lowest trading price reached during the current trading day.", format: (v) => `$${v.toFixed(2)}`, color: "text-red-600" },
    { key: "volume", label: "Volume", tooltip: "Total number of shares traded during the current trading day. Higher volume indicates more liquidity.", format: (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : v >= 1e6 ? (v / 1e6).toFixed(2) + "M" : v.toLocaleString(), color: "text-gray-900" },
    { key: "eps", label: "EPS", tooltip: "Earnings Per Share. Company's profit divided by number of outstanding shares. Higher EPS generally indicates better profitability.", format: (v) => `$${v.toFixed(2)}`, color: "text-gray-900" },
    { key: "beta", label: "Beta", tooltip: "Measures stock volatility relative to the market. Beta of 1 = moves with market, >1 = more volatile, <1 = less volatile.", format: (v) => v.toFixed(2), color: "text-gray-900" },
    { key: "dividendYield", label: "Dividend Yield", tooltip: "Annual dividend payment divided by stock price, expressed as a percentage. Shows return from dividends.", format: (v) => `${(v * 100).toFixed(2)}%`, color: "text-gray-900" },
    { key: "profitMargin", label: "Profit Margin", tooltip: "Net income divided by revenue, expressed as a percentage. Shows how much profit is generated per dollar of sales.", format: (v) => `${(v * 100).toFixed(2)}%`, color: "text-gray-900" },
    { key: "roe", label: "ROE", tooltip: "Return on Equity. Net income divided by shareholders' equity. Measures how efficiently a company uses equity to generate profits.", format: (v) => `${(v * 100).toFixed(2)}%`, color: "text-gray-900" },
    { key: "roa", label: "ROA", tooltip: "Return on Assets. Net income divided by total assets. Measures how efficiently a company uses its assets to generate profits.", format: (v) => `${(v * 100).toFixed(2)}%`, color: "text-gray-900" },
    { key: "priceToBook", label: "P/B Ratio", tooltip: "Price-to-Book ratio. Stock price divided by book value per share. Compares market value to accounting value.", format: (v) => v.toFixed(2), color: "text-gray-900" },
    { key: "priceToSales", label: "P/S Ratio", tooltip: "Price-to-Sales ratio. Market cap divided by annual revenue. Lower ratios may indicate better value relative to sales.", format: (v) => v.toFixed(2), color: "text-gray-900" },
    { key: "debtToEquity", label: "Debt/Equity", tooltip: "Total debt divided by shareholders' equity. Measures financial leverage. Higher ratios indicate more debt relative to equity.", format: (v) => v.toFixed(2), color: "text-gray-900" },
    { key: "currentRatio", label: "Current Ratio", tooltip: "Current assets divided by current liabilities. Measures short-term liquidity. Ratio >1 indicates ability to pay short-term obligations.", format: (v) => v.toFixed(2), color: "text-gray-900" },
    { key: "52WeekHigh", label: "52W High", tooltip: "Highest trading price reached over the past 52 weeks (one year).", format: (v) => `$${v.toFixed(2)}`, color: "text-green-600" },
    { key: "52WeekLow", label: "52W Low", tooltip: "Lowest trading price reached over the past 52 weeks (one year).", format: (v) => `$${v.toFixed(2)}`, color: "text-red-600" },
    { key: "revenue", label: "Revenue", tooltip: "Total income generated from business operations. Also called sales or top-line revenue.", format: (v) => v >= 1e12 ? (v / 1e12).toFixed(2) + "T" : (v / 1e9).toFixed(2) + "B", color: "text-gray-900" },
    { key: "enterpriseValue", label: "Enterprise Value", tooltip: "Total company value including market cap, debt, and cash. Represents theoretical takeover price.", format: (v) => v >= 1e12 ? (v / 1e12).toFixed(2) + "T" : (v / 1e9).toFixed(2) + "B", color: "text-gray-900" },
    { key: "sharesOutstanding", label: "Shares Outstanding", tooltip: "Total number of shares currently held by all shareholders, including restricted shares.", format: (v) => v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : (v / 1e6).toFixed(2) + "M", color: "text-gray-900" },
  ];

  fields.forEach(field => {
    if (stockInfo[field.key]) {
      cards.push(`
        <div class="bg-white p-4 rounded-xl border border-gray-200">
            <div class="text-xs text-gray-500 mb-1 flex items-center">${field.label}${getTooltipHTML(field.tooltip)}</div>
            <div class="text-lg font-bold ${field.color}">${field.format(stockInfo[field.key])}</div>
        </div>
      `);
    }
  });

  return cards.join("");
}

