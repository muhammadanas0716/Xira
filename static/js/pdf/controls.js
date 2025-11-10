function zoomIn() {
  const newScale = Math.min(5.0, scale + scaleDelta);
  if (newScale !== scale) {
    scale = newScale;
    renderAllPages().then(() => {
      updateZoomDisplay();
      setupPageTracking();
    });
  }
}

function zoomOut() {
  const newScale = Math.max(0.25, scale - scaleDelta);
  if (newScale !== scale) {
    scale = newScale;
    renderAllPages().then(() => {
      updateZoomDisplay();
      setupPageTracking();
    });
  }
}

function updateZoomDisplay() {
  document.getElementById("zoomLevel").textContent =
    Math.round(scale * 100) + "%";
}

function updatePageDisplay() {
  const pageDisplay = document.getElementById("pageDisplay");
  if (pageDisplay && totalPages > 0) {
    pageDisplay.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

function setupPageTracking() {
  const container = document.getElementById("pdfContainer");
  if (!container) return;

  const updateCurrentPage = () => {
    const pages = container.querySelectorAll(".pdf-page");
    if (pages.length === 0) return;

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const viewportCenter = scrollTop + containerHeight / 2;

    let closestPage = 1;
    let minDistance = Infinity;

    pages.forEach((page) => {
      const pageTop = page.offsetTop;
      const pageBottom = pageTop + page.offsetHeight;
      const pageCenter = pageTop + page.offsetHeight / 2;

      const distance = Math.abs(pageCenter - viewportCenter);

      if (viewportCenter >= pageTop && viewportCenter <= pageBottom) {
        if (distance < minDistance) {
          minDistance = distance;
          closestPage = parseInt(page.getAttribute("data-page-number")) || 1;
        }
      }
    });

    if (closestPage === 0) {
      pages.forEach((page, index) => {
        const pageTop = page.offsetTop;
        const pageBottom = pageTop + page.offsetHeight;
        if (scrollTop >= pageTop && scrollTop < pageBottom) {
          closestPage =
            parseInt(page.getAttribute("data-page-number")) || index + 1;
        }
      });
    }

    if (closestPage > 0 && closestPage !== currentPage) {
      currentPage = closestPage;
      updatePageDisplay();
    }
  };

  container.addEventListener("scroll", updateCurrentPage);
  setTimeout(updateCurrentPage, 100);
  updateCurrentPage();
}

