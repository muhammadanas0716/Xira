document.addEventListener("DOMContentLoaded", function () {
  loadChatHistory();

  const isMac =
    navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;
  const shortcutHint = document.getElementById("shortcutHint");
  if (shortcutHint) {
    if (isMac) {
      shortcutHint.textContent = "⌃⌘N";
    } else {
      shortcutHint.textContent = "Ctrl+Shift+N";
    }
  }

  const searchInput = document.querySelector(
    'input[placeholder="Search or ask any question..."]'
  );
  if (searchInput) {
    searchInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        askQuestion();
      }
    });
  }
});

document.addEventListener("keydown", function (e) {
  const isMac =
    navigator.platform.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;

  if (isMac) {
    if (e.ctrlKey && e.metaKey && (e.key === "n" || e.key === "N")) {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById("newChatModal");
      if (modal && !modal.classList.contains("hidden")) {
        closeNewChatModal();
      } else {
        openNewChatModal();
      }
    }
  } else {
    if (e.ctrlKey && e.shiftKey && (e.key === "n" || e.key === "N")) {
      e.preventDefault();
      e.stopPropagation();
      const modal = document.getElementById("newChatModal");
      if (modal && !modal.classList.contains("hidden")) {
        closeNewChatModal();
      } else {
        openNewChatModal();
      }
    }
  }
});
