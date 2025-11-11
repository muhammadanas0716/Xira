function zoomIn() {
  const newScale = Math.min(5.0, scale + scaleDelta);
  if (newScale !== scale) {
    scale = newScale;
    renderAllPages().then(() => {
      updateZoomDisplay();
    });
  }
}

function zoomOut() {
  const newScale = Math.max(0.25, scale - scaleDelta);
  if (newScale !== scale) {
    scale = newScale;
    renderAllPages().then(() => {
      updateZoomDisplay();
    });
  }
}

function updateZoomDisplay() {
  document.getElementById("zoomLevel").textContent =
    Math.round(scale * 100) + "%";
}

