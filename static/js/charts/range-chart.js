function createRangeChart(stockInfo) {
  if (
    !stockInfo["52WeekHigh"] ||
    !stockInfo["52WeekLow"] ||
    !stockInfo.currentPrice
  ) {
    return;
  }

  const rangeCtx = document.getElementById("rangeChart");
  if (!rangeCtx) return;

  const range = stockInfo["52WeekHigh"] - stockInfo["52WeekLow"];
  const currentPos = ((stockInfo.currentPrice - stockInfo["52WeekLow"]) / range) * 100;
  const distanceFromHigh = ((stockInfo["52WeekHigh"] - stockInfo.currentPrice) / range) * 100;
  const distanceFromLow = currentPos;
  
  new Chart(rangeCtx, {
    type: "bar",
    data: {
      labels: ["52W Range Position"],
      datasets: [
        {
          label: "Distance from Low",
          data: [currentPos],
          backgroundColor: "rgba(34, 197, 94, 0.6)",
          borderColor: "rgb(34, 197, 94)",
          borderWidth: 2,
        },
        {
          label: "Distance from High",
          data: [distanceFromHigh],
          backgroundColor: "rgba(239, 68, 68, 0.6)",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: "y",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.datasetIndex === 0) {
                return `Current price is ${currentPos.toFixed(1)}% above 52W low ($${stockInfo["52WeekLow"].toFixed(2)})`;
              } else {
                return `Current price is ${distanceFromHigh.toFixed(1)}% below 52W high ($${stockInfo["52WeekHigh"].toFixed(2)})`;
              }
            }
          }
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        },
      },
    },
  });
}

