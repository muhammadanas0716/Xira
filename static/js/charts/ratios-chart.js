function createRatiosChart(stockInfo) {
  if (!stockInfo.peRatio || !stockInfo.priceToBook || !stockInfo.priceToSales) {
    return;
  }

  const ratiosCtx = document.getElementById("ratiosChart");
  if (!ratiosCtx) return;

  const peNormalized = Math.min(stockInfo.peRatio / 50, 1) * 100;
  const pbNormalized = Math.min(stockInfo.priceToBook / 10, 1) * 100;
  const psNormalized = Math.min(stockInfo.priceToSales / 20, 1) * 100;
  
  new Chart(ratiosCtx, {
    type: "bar",
    data: {
      labels: ["P/E Ratio", "P/B Ratio", "P/S Ratio"],
      datasets: [
        {
          label: "Ratio Value",
          data: [
            stockInfo.peRatio || 0,
            stockInfo.priceToBook || 0,
            stockInfo.priceToSales || 0,
          ],
          backgroundColor: [
            peNormalized > 70 ? "rgba(239, 68, 68, 0.7)" : peNormalized > 40 ? "rgba(251, 191, 36, 0.7)" : "rgba(34, 197, 94, 0.7)",
            pbNormalized > 70 ? "rgba(239, 68, 68, 0.7)" : pbNormalized > 40 ? "rgba(251, 191, 36, 0.7)" : "rgba(34, 197, 94, 0.7)",
            psNormalized > 70 ? "rgba(239, 68, 68, 0.7)" : psNormalized > 40 ? "rgba(251, 191, 36, 0.7)" : "rgba(34, 197, 94, 0.7)",
          ],
          borderColor: [
            peNormalized > 70 ? "rgb(239, 68, 68)" : peNormalized > 40 ? "rgb(251, 191, 36)" : "rgb(34, 197, 94)",
            pbNormalized > 70 ? "rgb(239, 68, 68)" : pbNormalized > 40 ? "rgb(251, 191, 36)" : "rgb(34, 197, 94)",
            psNormalized > 70 ? "rgb(239, 68, 68)" : psNormalized > 40 ? "rgb(251, 191, 36)" : "rgb(34, 197, 94)",
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
              return context.label + ': ' + context.parsed.y.toFixed(2);
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

