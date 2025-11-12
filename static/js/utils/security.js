function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeForAttribute(value) {
  if (!value) return '';
  return String(value).replace(/[<>\"']/g, '');
}

function sanitizeChatId(chatId) {
  if (!chatId || typeof chatId !== 'string') return null;
  if (chatId.length > 100) return null;
  return chatId.replace(/[^a-zA-Z0-9\-_]/g, '');
}

function sanitizeTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') return null;
  const cleaned = ticker.trim().toUpperCase();
  if (cleaned.length > 10) return null;
  if (!/^[A-Z0-9]{1,10}$/.test(cleaned)) return null;
  return cleaned;
}

