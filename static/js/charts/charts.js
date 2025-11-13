function createCharts(stockInfo) {
  setTimeout(() => {
    createPriceChart(stockInfo);
    createRatiosChart(stockInfo);
    createMetricsChart(stockInfo);
    createRangeChart(stockInfo);
    createHealthChart(stockInfo);
    createLiquidityChart(stockInfo);
  }, 100);
}

