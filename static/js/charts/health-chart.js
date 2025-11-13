function createHealthChart(stockInfo) {
  if (!stockInfo.currentRatio && !stockInfo.quickRatio && !stockInfo.debtToEquity && !stockInfo.profitMargin) {
    return;
  }

  const healthCtx = document.getElementById("healthChart");
  if (!healthCtx) return;

  const healthMetrics = [];
  const healthLabels = [];
  const healthColors = [];
  
  if (stockInfo.profitMargin !== undefined && stockInfo.profitMargin !== null) {
    const margin = stockInfo.profitMargin * 100;
    healthMetrics.push(margin);
    healthLabels.push("Profit Margin");
    healthColors.push(margin > 15 ? "rgba(34, 197, 94, 0.7)" : margin > 5 ? "rgba(251, 191, 36, 0.7)" : "rgba(239, 68, 68, 0.7)");
  }
  
  if (stockInfo.roe !== undefined && stockInfo.roe !== null) {
    const roe = stockInfo.roe * 100;
    healthMetrics.push(roe);
    healthLabels.push("ROE");
    healthColors.push(roe > 15 ? "rgba(34, 197, 94, 0.7)" : roe > 5 ? "rgba(251, 191, 36, 0.7)" : "rgba(239, 68, 68, 0.7)");
  }
  
  if (stockInfo.currentRatio !== undefined && stockInfo.currentRatio !== null) {
    healthMetrics.push(stockInfo.currentRatio);
    healthLabels.push("Current Ratio");
    healthColors.push(stockInfo.currentRatio > 2 ? "rgba(34, 197, 94, 0.7)" : stockInfo.currentRatio > 1 ? "rgba(251, 191, 36, 0.7)" : "rgba(239, 68, 68, 0.7)");
  }
  
  if (stockInfo.debtToEquity !== undefined && stockInfo.debtToEquity !== null) {
    const dte = Math.min(stockInfo.debtToEquity, 5);
    healthMetrics.push(dte);
    healthLabels.push("Debt/Equity");
    healthColors.push(dte < 1 ? "rgba(34, 197, 94, 0.7)" : dte < 2 ? "rgba(251, 191, 36, 0.7)" : "rgba(239, 68, 68, 0.7)");
  }
  
  if (healthMetrics.length > 0) {
    new Chart(healthCtx, {
      type: "bar",
      data: {
        labels: healthLabels,
        datasets: [
          {
            label: "Score",
            data: healthMetrics,
            backgroundColor: healthColors,
            borderColor: healthColors.map(c => c.replace(/0\.7/, '1')),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label;
                const value = context.parsed.y;
                if (label === "Profit Margin" || label === "ROE") {
                  return label + ': ' + value.toFixed(2) + '%';
                } else if (label === "Current Ratio") {
                  return label + ': ' + value.toFixed(2);
                } else {
                  return label + ': ' + value.toFixed(2);
                }
              }
            }
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toFixed(1);
              }
            }
          },
        },
      },
    });
  }
}

