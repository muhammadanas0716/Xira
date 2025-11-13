function createLiquidityChart(stockInfo) {
  if (!stockInfo.currentRatio && !stockInfo.quickRatio && !stockInfo.debtToEquity) {
    return;
  }

  const liquidityCtx = document.getElementById("liquidityChart");
  if (!liquidityCtx) return;

  const liquidityData = [];
  const liquidityLabels = [];
  
  if (stockInfo.currentRatio !== undefined && stockInfo.currentRatio !== null) {
    liquidityData.push(stockInfo.currentRatio);
    liquidityLabels.push("Current Ratio");
  }
  
  if (stockInfo.quickRatio !== undefined && stockInfo.quickRatio !== null) {
    liquidityData.push(stockInfo.quickRatio);
    liquidityLabels.push("Quick Ratio");
  }
  
  if (stockInfo.debtToEquity !== undefined && stockInfo.debtToEquity !== null) {
    const normalizedDte = Math.min(stockInfo.debtToEquity / 3, 1);
    liquidityData.push(normalizedDte);
    liquidityLabels.push("Debt/Equity (normalized)");
  }
  
  if (liquidityData.length > 0) {
    new Chart(liquidityCtx, {
      type: "doughnut",
      data: {
        labels: liquidityLabels,
        datasets: [
          {
            data: liquidityData,
            backgroundColor: [
              "rgba(59, 130, 246, 0.7)",
              "rgba(34, 197, 94, 0.7)",
              "rgba(239, 68, 68, 0.7)",
            ],
            borderColor: [
              "rgb(59, 130, 246)",
              "rgb(34, 197, 94)",
              "rgb(239, 68, 68)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label;
                const value = context.parsed;
                if (label.includes("Debt/Equity")) {
                  return label + ': ' + stockInfo.debtToEquity.toFixed(2);
                } else {
                  return label + ': ' + value.toFixed(2);
                }
              }
            }
          },
        },
      },
    });
  }
}

