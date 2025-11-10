function getTooltipHTML(tooltipText) {
  return `<span class="stat-tooltip ml-1">
    <svg class="tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span class="tooltip-text">${tooltipText}</span>
  </span>`;
}

function createCharts(stockInfo) {
  setTimeout(() => {
    if (
      stockInfo.currentPrice &&
      stockInfo.prevClose &&
      stockInfo.open &&
      stockInfo.high &&
      stockInfo.low
    ) {
      const priceCtx = document.getElementById("priceChart");
      if (priceCtx) {
        new Chart(priceCtx, {
          type: "bar",
          data: {
            labels: ["Open", "High", "Low", "Current", "Prev Close"],
            datasets: [
              {
                label: "Price ($)",
                data: [
                  stockInfo.open,
                  stockInfo.high,
                  stockInfo.low,
                  stockInfo.currentPrice,
                  stockInfo.prevClose,
                ],
                backgroundColor: [
                  "rgba(59, 130, 246, 0.5)",
                  "rgba(34, 197, 94, 0.5)",
                  "rgba(239, 68, 68, 0.5)",
                  "rgba(0, 0, 0, 0.7)",
                  "rgba(156, 163, 175, 0.5)",
                ],
                borderColor: [
                  "rgb(59, 130, 246)",
                  "rgb(34, 197, 94)",
                  "rgb(239, 68, 68)",
                  "rgb(0, 0, 0)",
                  "rgb(156, 163, 175)",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: false },
            },
          },
        });
      }
    }

    if (stockInfo.peRatio && stockInfo.priceToBook && stockInfo.priceToSales) {
      const ratiosCtx = document.getElementById("ratiosChart");
      if (ratiosCtx) {
        new Chart(ratiosCtx, {
          type: "doughnut",
          data: {
            labels: ["P/E Ratio", "P/B Ratio", "P/S Ratio"],
            datasets: [
              {
                data: [
                  stockInfo.peRatio || 0,
                  stockInfo.priceToBook || 0,
                  stockInfo.priceToSales || 0,
                ],
                backgroundColor: [
                  "rgba(59, 130, 246, 0.7)",
                  "rgba(34, 197, 94, 0.7)",
                  "rgba(239, 68, 68, 0.7)",
                ],
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: "bottom" },
            },
          },
        });
      }
    }

    if (stockInfo.profitMargin && stockInfo.roe && stockInfo.roa) {
      const metricsCtx = document.getElementById("metricsChart");
      if (metricsCtx) {
        new Chart(metricsCtx, {
          type: "radar",
          data: {
            labels: ["Profit Margin", "ROE", "ROA"],
            datasets: [
              {
                label: "Performance Metrics (%)",
                data: [
                  stockInfo.profitMargin * 100 || 0,
                  stockInfo.roe * 100 || 0,
                  stockInfo.roa * 100 || 0,
                ],
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                borderColor: "rgb(59, 130, 246)",
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              r: { beginAtZero: true },
            },
          },
        });
      }
    }

    if (
      stockInfo["52WeekHigh"] &&
      stockInfo["52WeekLow"] &&
      stockInfo.currentPrice
    ) {
      const rangeCtx = document.getElementById("rangeChart");
      if (rangeCtx) {
        const range = stockInfo["52WeekHigh"] - stockInfo["52WeekLow"];
        const currentPos =
          ((stockInfo.currentPrice - stockInfo["52WeekLow"]) / range) * 100;
        new Chart(rangeCtx, {
          type: "bar",
          data: {
            labels: ["52W Range"],
            datasets: [
              {
                label: "52W Low",
                data: [stockInfo["52WeekLow"]],
                backgroundColor: "rgba(239, 68, 68, 0.5)",
                borderColor: "rgb(239, 68, 68)",
                borderWidth: 2,
              },
              {
                label: "Current Price",
                data: [stockInfo.currentPrice],
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                borderColor: "rgb(0, 0, 0)",
                borderWidth: 2,
              },
              {
                label: "52W High",
                data: [stockInfo["52WeekHigh"]],
                backgroundColor: "rgba(34, 197, 94, 0.5)",
                borderColor: "rgb(34, 197, 94)",
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            indexAxis: "y",
            plugins: {
              legend: { position: "bottom" },
            },
          },
        });
      }
    }
  }, 100);
}

