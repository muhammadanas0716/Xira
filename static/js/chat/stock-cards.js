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

