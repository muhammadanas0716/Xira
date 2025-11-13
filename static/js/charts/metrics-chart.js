function createMetricsChart(stockInfo) {
  if (!stockInfo.profitMargin || !stockInfo.roe || !stockInfo.roa) {
    return;
  }

  const metricsCtx = document.getElementById("metricsChart");
  if (!metricsCtx) return;

  const profitMargin = (stockInfo.profitMargin * 100) || 0;
  const roe = (stockInfo.roe * 100) || 0;
  const roa = (stockInfo.roa * 100) || 0;
  
  const additionalMetrics = [];
  const additionalLabels = [];
  
  if (stockInfo.dividendYield) {
    additionalMetrics.push(stockInfo.dividendYield * 100);
    additionalLabels.push("Dividend Yield");
  }
  
  new Chart(metricsCtx, {
    type: "radar",
    data: {
      labels: ["Profit Margin", "ROE", "ROA", ...additionalLabels],
      datasets: [
        {
          label: "Performance Metrics (%)",
          data: [profitMargin, roe, roa, ...additionalMetrics],
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 2,
          pointBackgroundColor: "rgb(59, 130, 246)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgb(59, 130, 246)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.label + ': ' + context.parsed.r.toFixed(2) + '%';
            }
          }
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            stepSize: 10,
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: "rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
  });
}

