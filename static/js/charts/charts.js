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
    }

    if (stockInfo.peRatio && stockInfo.priceToBook && stockInfo.priceToSales) {
      const ratiosCtx = document.getElementById("ratiosChart");
      if (ratiosCtx) {
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
    }

    if (stockInfo.profitMargin && stockInfo.roe && stockInfo.roa) {
      const metricsCtx = document.getElementById("metricsChart");
      if (metricsCtx) {
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
    }

    if (
      stockInfo["52WeekHigh"] &&
      stockInfo["52WeekLow"] &&
      stockInfo.currentPrice
    ) {
      const rangeCtx = document.getElementById("rangeChart");
      if (rangeCtx) {
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
    }

    if (stockInfo.currentRatio || stockInfo.quickRatio || stockInfo.debtToEquity || stockInfo.profitMargin) {
      const healthCtx = document.getElementById("healthChart");
      if (healthCtx) {
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
    }

    if (stockInfo.currentRatio || stockInfo.quickRatio || stockInfo.debtToEquity) {
      const liquidityCtx = document.getElementById("liquidityChart");
      if (liquidityCtx) {
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
    }
  }, 100);
}

