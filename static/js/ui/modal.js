function openNewChatModal() {
  const modal = document.getElementById("newChatModal");
  const modalContent = document.getElementById("newChatModalContent");
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modalContent.style.transform = "scale(1)";
    modalContent.style.opacity = "1";
  }, 10);
  document.getElementById("newChatTickerInput").focus();
}

function closeNewChatModal() {
  const modal = document.getElementById("newChatModal");
  const modalContent = document.getElementById("newChatModalContent");
  modal.style.backgroundColor = "rgba(0, 0, 0, 0)";
  modalContent.style.transform = "scale(0.95)";
  modalContent.style.opacity = "0";
  setTimeout(() => {
    modal.classList.add("hidden");
    document.getElementById("newChatTickerInput").value = "";
  }, 300);
}

