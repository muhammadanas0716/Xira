function getTooltipHTML(tooltipText) {
  return `<span class="stat-tooltip ml-1">
    <svg class="tooltip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span class="tooltip-text">${tooltipText}</span>
  </span>`;
}

