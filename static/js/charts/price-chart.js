function createPriceChart(stockInfo) {
  if (
    !stockInfo.currentPrice ||
    !stockInfo.prevClose ||
    !stockInfo.open ||
    !stockInfo.high ||
    !stockInfo.low
  ) {
    return;
  }

  const priceCtx = document.getElementById("priceChart");
  if (!priceCtx) return;

  const priceChange = stockInfo.currentPrice - stockInfo.prevClose;
  const priceChangePercent = (priceChange / stockInfo.prevClose) * 100;
  const isPositive = priceChange >= 0;
  
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
            "rgba(59, 130, 246, 0.6)",
            "rgba(34, 197, 94, 0.6)",
            "rgba(239, 68, 68, 0.6)",
            isPositive ? "rgba(34, 197, 94, 0.8)" : "rgba(239, 68, 68, 0.8)",
            "rgba(156, 163, 175, 0.6)",
          ],
          borderColor: [
            "rgb(59, 130, 246)",
            "rgb(34, 197, 94)",
            "rgb(239, 68, 68)",
            isPositive ? "rgb(34, 197, 94)" : "rgb(239, 68, 68)",
            "rgb(156, 163, 175)",
          ],
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
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += '$' + context.parsed.y.toFixed(2);
              if (context.label === 'Current' && stockInfo.prevClose) {
                const change = context.parsed.y - stockInfo.prevClose;
                const changePct = (change / stockInfo.prevClose) * 100;
                label += ` (${change >= 0 ? '+' : ''}${change.toFixed(2)}, ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`;
              }
              return label;
            }
          }
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return '$' + value.toFixed(2);
            }
          }
        },
      },
    },
  });
}

