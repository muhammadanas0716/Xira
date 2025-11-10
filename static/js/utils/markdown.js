marked.setOptions({
  breaks: false,
  gfm: true,
  headerIds: false,
  mangle: false,
});

function renderMarkdown(text) {
  if (!text) return "";
  try {
    return marked.parse(text);
  } catch (e) {
    console.error("Markdown parsing error:", e);
    return text.replace(/\n/g, "<br>");
  }
}

