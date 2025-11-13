function switchTab(tabName) {
  const analysisTab = document.getElementById("analysisTab");
  const chatTab = document.getElementById("chatTab");
  const analysisContent = document.getElementById("analysisContent");
  const chatContent = document.getElementById("chatContent");

  if (tabName === "analysis") {
    analysisTab.classList.remove("text-gray-500", "border-transparent");
    analysisTab.classList.add("text-gray-900", "border-black");
    chatTab.classList.remove("text-gray-900", "border-black");
    chatTab.classList.add("text-gray-500", "border-transparent");
    analysisContent.classList.remove("hidden");
    chatContent.classList.add("hidden");
  } else {
    chatTab.classList.remove("text-gray-500", "border-transparent");
    chatTab.classList.add("text-gray-900", "border-black");
    analysisTab.classList.remove("text-gray-900", "border-black");
    analysisTab.classList.add("text-gray-500", "border-transparent");
    chatContent.classList.remove("hidden");
    analysisContent.classList.add("hidden");
  }
}

