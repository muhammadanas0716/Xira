function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const icon = document.getElementById("sidebarToggleIcon");
  const reopenBtn = document.getElementById("sidebarReopenBtn");
  sidebar.classList.toggle("sidebar-collapsed");

  if (sidebar.classList.contains("sidebar-collapsed")) {
    icon.innerHTML =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>';
    reopenBtn.classList.remove("hidden");
  } else {
    icon.innerHTML =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
    reopenBtn.classList.add("hidden");
  }
}

(function () {
  const resizeHandle = document.getElementById("resizeHandle");
  const pdfSidebar = document.getElementById("pdfSidebar");
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener("mousedown", function (e) {
    isResizing = true;
    startX = e.clientX;
    const computedWidth = window.getComputedStyle(pdfSidebar).width;
    startWidth = parseFloat(computedWidth) || window.innerWidth * 0.5;
    document.body.classList.add("resizing");
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });

  document.addEventListener("mousemove", function (e) {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidthPx = startWidth - deltaX;
    const newWidthPercent = (newWidthPx / window.innerWidth) * 100;
    const minWidthPercent = (300 / window.innerWidth) * 100;
    const maxWidthPercent = 80;

    if (
      newWidthPercent >= minWidthPercent &&
      newWidthPercent <= maxWidthPercent
    ) {
      pdfSidebar.style.width = newWidthPercent + "%";
    }
  });

  document.addEventListener("mouseup", function () {
    if (isResizing) {
      isResizing = false;
      document.body.classList.remove("resizing");
      document.body.style.cursor = "";
    }
  });
})();

