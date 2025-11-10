function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
  setTimeout(() => errorDiv.classList.add("hidden"), 5000);
}

function showSuccess(message) {
  const successDiv = document.getElementById("successMessage");
  successDiv.textContent = message;
  successDiv.classList.remove("hidden");
  setTimeout(() => successDiv.classList.add("hidden"), 3000);
}

function hideMessages() {
  document.getElementById("errorMessage").classList.add("hidden");
  document.getElementById("successMessage").classList.add("hidden");
}

